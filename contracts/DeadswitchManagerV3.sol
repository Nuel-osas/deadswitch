// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EvmV1Decoder} from "@gluwa/usc-contracts/contracts/decoding/EvmV1Decoder.sol";
import {DeadswitchBase} from "./DeadswitchBase.sol";

/**
 * @title DeadswitchManagerV3 (execution chain: Creditcoin)
 * @dev Collateral lives in a CollateralVault on a source chain; debt lives here.
 * A proven CollateralWithdrawn that drops attested collateral below the position's
 * threshold liquidates it. A proven CollateralDeposited that lifts it back to or
 * above the threshold restores it. Proof submission is permissionless — trust comes
 * from the attestor quorum, not the submitter.
 *
 * v3 hardens two flaws inherited from the tutorial's USCBase (see DeadswitchBase):
 * caller-supplied action selectors and logs[0]-only reading. Every log emitted by
 * the registered vault in the proven transaction is applied, in order; logs from
 * any other address are skipped rather than reverted on.
 */
contract DeadswitchManagerV3 is Ownable, DeadswitchBase {
    enum PositionStatus {
        Active,
        Liquidated,
        Closed
    }

    struct DebtPosition {
        address borrower;
        uint256 debt;
        uint256 minCollateral;
        uint256 lastAttestedCollateral;
        uint64 lastAttestedBlock;
        PositionStatus status;
        bool exists;
    }

    // keccak256("CollateralWithdrawn(uint256,uint256,uint256)")
    bytes32 public constant WITHDRAW_EVENT_SIGNATURE = keccak256("CollateralWithdrawn(uint256,uint256,uint256)");
    // keccak256("CollateralDeposited(uint256,address,uint256,uint256)")
    bytes32 public constant DEPOSIT_EVENT_SIGNATURE = keccak256("CollateralDeposited(uint256,address,uint256,uint256)");

    address public sourceVault;
    mapping(uint256 => DebtPosition) public debtPositions;

    event PositionRegistered(uint256 indexed positionId, address indexed borrower, uint256 debt, uint256 minCollateral);
    event CollateralAttested(uint256 indexed positionId, uint256 remaining, uint64 blockHeight);
    event PositionLiquidated(uint256 indexed positionId, uint256 remainingCollateral, uint256 minCollateral);
    event PositionRestored(uint256 indexed positionId, uint256 remainingCollateral, uint256 minCollateral);
    event SourceVaultRegistered(address indexed vault);

    constructor() Ownable(msg.sender) {}

    function registerSourceVault(address vault) external onlyOwner {
        require(vault != address(0), "Vault cannot be the zero address");
        sourceVault = vault;
        emit SourceVaultRegistered(vault);
    }

    function registerPosition(uint256 positionId, address borrower, uint256 debt, uint256 minCollateral)
        external
        onlyOwner
    {
        require(!debtPositions[positionId].exists, "Position already exists");
        require(borrower != address(0), "Invalid borrower");
        require(minCollateral > 0, "Threshold must be > 0");

        debtPositions[positionId] = DebtPosition({
            borrower: borrower,
            debt: debt,
            minCollateral: minCollateral,
            lastAttestedCollateral: 0,
            lastAttestedBlock: 0,
            status: PositionStatus.Active,
            exists: true
        });

        emit PositionRegistered(positionId, borrower, debt, minCollateral);
    }

    function getPosition(uint256 positionId) external view returns (DebtPosition memory) {
        require(debtPositions[positionId].exists, "Unknown position");
        return debtPositions[positionId];
    }

    function _applyProvenTransaction(bytes32, uint64 blockHeight, bytes memory encodedTransaction) internal override {
        uint8 txType = EvmV1Decoder.getTransactionType(encodedTransaction);
        require(EvmV1Decoder.isValidTransactionType(txType), "Unsupported transaction type");

        // The precompile proves inclusion, not success. On EVM sources a reverted
        // transaction carries no logs at all, so this is a redundant-but-explicit
        // invariant: it protects against non-EVM sources and decoder changes where
        // that guarantee does not hold.
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        require(receipt.receiptStatus == 1, "Source transaction did not succeed");

        require(sourceVault != address(0), "Source vault not registered");

        // Apply EVERY log from the registered vault, in log order. Logs from any
        // other contract are skipped, never reverted on: reverting would let an
        // attacker prefix a decoy log and censor a genuine event forever.
        uint256 applied;
        for (uint256 i = 0; i < receipt.receiptLogs.length; i++) {
            EvmV1Decoder.LogEntry memory log = receipt.receiptLogs[i];
            if (log.address_ != sourceVault) continue;
            if (log.topics.length == 0) continue;

            if (log.topics[0] == WITHDRAW_EVENT_SIGNATURE) {
                require(log.topics.length == 2, "Invalid CollateralWithdrawn topics");
                require(log.data.length == 64, "Invalid CollateralWithdrawn data");
                (, uint256 remaining) = abi.decode(log.data, (uint256, uint256));
                _applyCollateral(uint256(log.topics[1]), remaining, blockHeight);
                applied++;
            } else if (log.topics[0] == DEPOSIT_EVENT_SIGNATURE) {
                require(log.topics.length == 3, "Invalid CollateralDeposited topics");
                require(log.data.length == 64, "Invalid CollateralDeposited data");
                (, uint256 remaining) = abi.decode(log.data, (uint256, uint256));
                _applyCollateral(uint256(log.topics[1]), remaining, blockHeight);
                applied++;
            }
        }

        require(applied > 0, "No vault collateral events in transaction");
    }

    /// @dev Single state transition for both directions. The event that moved the
    /// collateral does not matter — only the attested remaining balance does.
    function _applyCollateral(uint256 positionId, uint256 remaining, uint64 blockHeight) internal {
        DebtPosition storage pos = debtPositions[positionId];
        if (!pos.exists) return; // not our position; ignore rather than revert
        if (pos.status == PositionStatus.Closed) return;

        // Staleness guard: an older block can never overwrite newer attested state.
        // USCBase makes this impossible — it never passes blockHeight to the handler.
        require(blockHeight >= pos.lastAttestedBlock, "Stale proof for this position");

        pos.lastAttestedCollateral = remaining;
        pos.lastAttestedBlock = blockHeight;
        emit CollateralAttested(positionId, remaining, blockHeight);

        if (remaining < pos.minCollateral) {
            if (pos.status == PositionStatus.Active) {
                pos.status = PositionStatus.Liquidated;
                emit PositionLiquidated(positionId, remaining, pos.minCollateral);
            }
        } else if (pos.status == PositionStatus.Liquidated) {
            // A top-up proven to restore collateral to the threshold revives the
            // position. Emitted ONLY when the threshold is actually met.
            pos.status = PositionStatus.Active;
            emit PositionRestored(positionId, remaining, pos.minCollateral);
        }
    }
}
