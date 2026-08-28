// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EvmV1Decoder} from "@gluwa/usc-contracts/contracts/decoding/EvmV1Decoder.sol";
import {USCBase} from "./USCBase.sol";

/**
 * @title DeadswitchManager (execution chain: Creditcoin)
 * @dev Tracks debt positions whose collateral lives in a CollateralVault on a
 * source chain (Sepolia). When a CollateralWithdrawn event is proven through the
 * Attestcoin oracle and the attested remaining collateral drops below the
 * position's minimum, the position is liquidated in the same transaction.
 *
 * Anyone may submit the proof (via USCBase.execute) — there is no privileged
 * relayer. Trust comes from the oracle's attestation quorum, not the submitter.
 */
contract DeadswitchManager is Ownable, ReentrancyGuard, USCBase {
    enum DeadswitchActions {
        CollateralWithdrawn // 0
    }
    error InvalidAction(uint8 action);

    enum PositionStatus {
        Active,
        Liquidated,
        Closed
    }

    struct DebtPosition {
        address borrower;
        uint256 debt;             // outstanding debt (informational in MVP)
        uint256 minCollateral;    // liquidation threshold, in source-chain token units
        uint256 lastAttestedCollateral;
        PositionStatus status;
        bool exists;
    }

    // keccak256("CollateralWithdrawn(uint256,uint256,uint256)")
    bytes32 public constant WITHDRAW_EVENT_SIGNATURE =
        keccak256("CollateralWithdrawn(uint256,uint256,uint256)");

    /// Source-chain vault authorized to emit the events we act on. Any log from
    /// a different address is rejected — otherwise anyone could deploy a fake
    /// vault, emit CollateralWithdrawn with an arbitrary positionId, and prove
    /// it to force liquidations.
    address public sourceVault;

    mapping(uint256 => DebtPosition) public debtPositions;

    event PositionRegistered(uint256 indexed positionId, address indexed borrower, uint256 debt, uint256 minCollateral);
    event CollateralAttested(uint256 indexed positionId, uint256 withdrawn, uint256 remaining);
    event PositionLiquidated(uint256 indexed positionId, uint256 remainingCollateral, uint256 minCollateral);
    event SourceVaultRegistered(address indexed vault);

    constructor() Ownable(msg.sender) {}

    function registerSourceVault(address vault) external onlyOwner {
        require(vault != address(0), "Vault cannot be the zero address");
        sourceVault = vault;
        emit SourceVaultRegistered(vault);
    }

    /// @dev MVP: positions registered by owner. In production this is where the
    /// lending market would sit; here the loan side is deliberately stubbed —
    /// the submission is the attestation-triggered liquidation path.
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
            status: PositionStatus.Active,
            exists: true
        });

        emit PositionRegistered(positionId, borrower, debt, minCollateral);
    }

    function getPosition(uint256 positionId) external view returns (DebtPosition memory) {
        require(debtPositions[positionId].exists, "Unknown position");
        return debtPositions[positionId];
    }

    // Called by USCBase.execute after the inclusion + continuity proof verifies.
    function _processAndEmitEvent(uint8 action, bytes32, bytes memory encodedTransaction) internal override {
        if (action == uint8(DeadswitchActions.CollateralWithdrawn)) {
            _processWithdrawal(encodedTransaction);
        } else {
            revert InvalidAction(action);
        }
    }

    function _processWithdrawal(bytes memory encodedTransaction) internal {
        // Validate transaction type
        uint8 txType = EvmV1Decoder.getTransactionType(encodedTransaction);
        require(EvmV1Decoder.isValidTransactionType(txType), "Unsupported transaction type");

        // The precompile proves inclusion, NOT success: a reverted source-chain
        // transaction still has a valid inclusion proof. Without this check, a
        // failed withdrawal could liquidate a healthy position.
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        require(receipt.receiptStatus == 1, "Source transaction did not succeed");

        EvmV1Decoder.LogEntry[] memory logs = EvmV1Decoder.getLogsByEventSignature(receipt, WITHDRAW_EVENT_SIGNATURE);
        require(logs.length > 0, "No CollateralWithdrawn event found");

        // Only the first matching log is processed; the vault emits at most one
        // CollateralWithdrawn per transaction.
        EvmV1Decoder.LogEntry memory log = logs[0];

        require(sourceVault != address(0), "Source vault not registered");
        require(log.address_ == sourceVault, "Event not emitted by registered vault");
        require(log.topics.length == 2, "Invalid CollateralWithdrawn topics");
        require(log.topics[0] == WITHDRAW_EVENT_SIGNATURE, "Not CollateralWithdrawn event");
        require(log.data.length == 64, "Invalid CollateralWithdrawn data");

        uint256 positionId = uint256(log.topics[1]);
        (uint256 withdrawn, uint256 remaining) = abi.decode(log.data, (uint256, uint256));

        DebtPosition storage pos = debtPositions[positionId];
        require(pos.exists, "Unknown position");
        require(pos.status == PositionStatus.Active, "Position not active");

        pos.lastAttestedCollateral = remaining;
        emit CollateralAttested(positionId, withdrawn, remaining);

        if (remaining < pos.minCollateral) {
            pos.status = PositionStatus.Liquidated;
            emit PositionLiquidated(positionId, remaining, pos.minCollateral);
        }
    }
}
