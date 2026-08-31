// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EvmV1Decoder} from "@gluwa/usc-contracts/contracts/decoding/EvmV1Decoder.sol";
import {USCBase} from "./USCBase.sol";

/**
 * @title NaiveManager — the WRONG way to build Deadswitch (for the exploit demo)
 * @dev Identical to DeadswitchManager EXCEPT it omits the two security checks:
 *   1. It does NOT check receipt.receiptStatus == 1
 *   2. It does NOT check the event emitter address
 *
 * This is a CONTROL, not a claim about the tutorial: Gluwa's USCLoanManager.sol
 * already implements both guards (lines 240 and 267, PR #92). This contract was
 * built by REMOVING them, so that the emitter guard's necessity can be shown
 * executing on-chain rather than asserted. DO NOT USE.
 */
contract NaiveManager is Ownable, USCBase {
    enum PositionStatus { Active, Liquidated, Closed }

    struct DebtPosition {
        address borrower;
        uint256 minCollateral;
        uint256 lastAttestedCollateral;
        PositionStatus status;
        bool exists;
    }

    bytes32 public constant WITHDRAW_EVENT_SIGNATURE =
        keccak256("CollateralWithdrawn(uint256,uint256,uint256)");

    mapping(uint256 => DebtPosition) public debtPositions;

    event PositionLiquidated(uint256 indexed positionId, uint256 remaining, uint256 min);

    constructor() Ownable(msg.sender) {}

    function registerPosition(uint256 positionId, address borrower, uint256 minCollateral) external onlyOwner {
        debtPositions[positionId] = DebtPosition(borrower, minCollateral, 0, PositionStatus.Active, true);
    }

    function _processAndEmitEvent(uint8, bytes32, bytes memory encodedTransaction) internal override {
        // ---- NO transaction type validation ----
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);

        // ---- BUG 1: no `require(receipt.receiptStatus == 1)` ----
        // A reverted withdrawal still produces a valid inclusion proof.

        EvmV1Decoder.LogEntry[] memory logs =
            EvmV1Decoder.getLogsByEventSignature(receipt, WITHDRAW_EVENT_SIGNATURE);
        require(logs.length > 0, "No CollateralWithdrawn event found");
        EvmV1Decoder.LogEntry memory log = logs[0];

        // ---- BUG 2: no `require(log.address_ == sourceVault)` ----
        // Any contract that emits this event signature is trusted.

        uint256 positionId = uint256(log.topics[1]);
        (, uint256 remaining) = abi.decode(log.data, (uint256, uint256));

        DebtPosition storage pos = debtPositions[positionId];
        require(pos.exists, "Unknown position");
        pos.lastAttestedCollateral = remaining;
        if (remaining < pos.minCollateral) {
            pos.status = PositionStatus.Liquidated;
            emit PositionLiquidated(positionId, remaining, pos.minCollateral);
        }
    }
}
