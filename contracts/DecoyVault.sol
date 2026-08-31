// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DecoyVault — throwaway contract emitting a real, provable CollateralWithdrawn
/// @dev Used by Attacker.censor to occupy logs[0] ahead of the genuine vault event.
contract DecoyVault {
    event CollateralWithdrawn(uint256 indexed positionId, uint256 amount, uint256 remaining);

    function emitFake(uint256 positionId, uint256 remaining) external {
        emit CollateralWithdrawn(positionId, 0, remaining);
    }
}
