// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {INativeQueryVerifier, NativeQueryVerifierLib} from "./VerifierInterface.sol";

/**
 * @title DeadswitchBase — hardened replacement for the tutorial's USCBase
 * @dev USCBase (sponsor code, shipped byte-identical in this repo for comparison)
 * has two structural weaknesses that let an attacker make a genuine source-chain
 * event permanently unprovable. Both are exploited on live testnets by
 * script/attack-suppression.ts and script/attack-decoy.ts.
 *
 *   1. ACTION-SELECTOR SUPPRESSION.
 *      USCBase.execute takes a caller-supplied `action` and burns the query as
 *      processed regardless of which logs the action consumed. The replay key is
 *      keccak(chainKey, blockHeight, txIndex) — `action` is NOT in it. So a
 *      borrower emits a deposit and a withdrawal in ONE transaction, submits it
 *      as a deposit, and the withdrawal in that same transaction can never be
 *      proven. Collateral leaves, the position stays healthy.
 *
 *      FIX: `action` is deleted from the external ABI. The action is derived from
 *      each log's own topics[0]. One transaction is consumed exactly once, and
 *      every relevant log inside it is applied, in log order.
 *
 *   2. DECOY-LOG CENSORSHIP.
 *      USCBase consumers read logs[0] and revert if it fails the emitter check.
 *      Prefixing a decoy event from a throwaway contract in the same transaction
 *      makes the genuine event permanently unprovable — the emitter guard becomes
 *      the censorship vector.
 *
 *      FIX: iterate ALL logs, skip those not from the registered source, never
 *      revert on a foreign log's presence.
 *
 * Also threads `blockHeight` into the handler so consumers can enforce staleness
 * ordering, which USCBase makes impossible (it passes only the queryId).
 */
abstract contract DeadswitchBase {
    INativeQueryVerifier public immutable VERIFIER;

    mapping(bytes32 => bool) public processedQueries;

    constructor() {
        VERIFIER = NativeQueryVerifierLib.getVerifier();
    }

    /// @dev Applies every relevant log in the proven transaction, in log order.
    function _applyProvenTransaction(bytes32 queryId, uint64 blockHeight, bytes memory encodedTransaction)
        internal
        virtual;

    /// @notice Prove a source-chain transaction and apply its effects.
    /// @dev No `action` parameter by design — see contract docs, weakness (1).
    function execute(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        bytes32 merkleRoot,
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings,
        bytes32 lowerEndpointDigest,
        bytes32[] calldata continuityRoots
    ) external returns (bool success) {
        bytes32 queryId = _computeQueryId(chainKey, blockHeight, merkleRoot, siblings);
        require(!processedQueries[queryId], "Query already processed");

        INativeQueryVerifier.MerkleProof memory merkleProof =
            INativeQueryVerifier.MerkleProof({root: merkleRoot, siblings: siblings});
        INativeQueryVerifier.ContinuityProof memory continuityProof =
            INativeQueryVerifier.ContinuityProof({lowerEndpointDigest: lowerEndpointDigest, roots: continuityRoots});

        require(
            VERIFIER.verifyAndEmit(chainKey, blockHeight, encodedTransaction, merkleProof, continuityProof),
            "Proof of inclusion verification failed"
        );

        processedQueries[queryId] = true;
        _applyProvenTransaction(queryId, blockHeight, encodedTransaction);
        return true;
    }

    function _computeQueryId(
        uint64 chainKey,
        uint64 blockHeight,
        bytes32 merkleRoot,
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings
    ) internal view returns (bytes32 queryId) {
        INativeQueryVerifier.MerkleProof memory merkleProof =
            INativeQueryVerifier.MerkleProof({root: merkleRoot, siblings: siblings});
        uint256 txIndex = VERIFIER.calculateTxIndex(merkleProof);
        queryId = keccak256(abi.encodePacked(chainKey, blockHeight, txIndex));
    }
}
