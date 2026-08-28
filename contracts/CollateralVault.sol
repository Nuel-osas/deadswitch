// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CollateralVault (source chain: Sepolia)
 * @dev Holds ERC20 collateral backing positions that live on Creditcoin.
 * Every withdrawal emits CollateralWithdrawn carrying the remaining balance,
 * so the Creditcoin-side DeadswitchManager can prove the event via the
 * Attestcoin oracle and liquidate undercollateralized positions — with no
 * bridge and no privileged relayer.
 */
contract CollateralVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Position {
        address owner;
        address token;
        uint256 balance;
        bool exists;
    }

    mapping(uint256 => Position) public positions;
    mapping(address => bool) public authorizedTokens;

    // The event DeadswitchManager consumes cross-chain. `remaining` is included
    // in the payload so the manager needs no additional balance query.
    event CollateralDeposited(uint256 indexed positionId, address indexed owner, uint256 amount, uint256 remaining);
    event CollateralWithdrawn(uint256 indexed positionId, uint256 amount, uint256 remaining);

    constructor() Ownable(msg.sender) {}

    function addAuthorizedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        authorizedTokens[token] = true;
    }

    /// @dev Open a collateral position. positionId is chosen by the caller and
    /// must match the position registered on the Creditcoin side.
    function openPosition(uint256 positionId, address token, uint256 amount) external nonReentrant {
        require(!positions[positionId].exists, "Position already exists");
        require(authorizedTokens[token], "Token not authorized");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        positions[positionId] = Position({owner: msg.sender, token: token, balance: amount, exists: true});

        emit CollateralDeposited(positionId, msg.sender, amount, amount);
    }

    function deposit(uint256 positionId, uint256 amount) external nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.exists, "Unknown position");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(pos.token).safeTransferFrom(msg.sender, address(this), amount);
        pos.balance += amount;

        emit CollateralDeposited(positionId, pos.owner, amount, pos.balance);
    }

    /// @dev Withdrawing is always allowed on the source chain — that is the point.
    /// The vault cannot know the debt on Creditcoin. What it guarantees instead is
    /// that every withdrawal emits a provable event, so the position dies remotely.
    function withdraw(uint256 positionId, uint256 amount) external nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.exists, "Unknown position");
        require(msg.sender == pos.owner, "Only position owner");
        require(amount > 0 && amount <= pos.balance, "Invalid amount");

        pos.balance -= amount;
        IERC20(pos.token).safeTransfer(pos.owner, amount);

        emit CollateralWithdrawn(positionId, amount, pos.balance);
    }
}
