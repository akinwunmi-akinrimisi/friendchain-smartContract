// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract GameFactory is Ownable {
    // State variables
    address public tokenAddress;
    address[] public gameInstances;
    uint256 public nextGameId = 1;

    mapping(address => GameMetadata) public gameDetails;
    mapping(address => bool) public authorizedCreators;

    // Stake and player limits
    uint256 public constant MIN_STAKE = 10 * 10**18; // 10 FRND
    uint256 public constant MAX_STAKE = 100 * 10**18; // 100 FRND
    uint256 public constant MIN_PLAYERS = 2;
    uint256 public constant MAX_PLAYERS = 10;

    // Optional Base Names and ERC-4337 addresses
    address public resolverAddress;
    address public entryPointAddress;

    // Game metadata struct
    struct GameMetadata {
        uint256 gameId;
        address creator;
        string basename;
        uint256 stakeAmount;
        uint256 playerLimit;
        string ipfsHash;
        uint256 createdAt;
    }

    // Custom errors
    error InvalidTokenAddress();

    // Constructor
    constructor(
        address _tokenAddress,
        address _initialOwner,
        address _resolverAddress,
        address _entryPointAddress
    ) Ownable(_initialOwner) {
        if (_tokenAddress == address(0)) {
            revert InvalidTokenAddress();
        }
        tokenAddress = _tokenAddress;
        resolverAddress = _resolverAddress;
        entryPointAddress = _entryPointAddress;
    }
    // Get all game instances
    function getGameInstances() public view returns (address[] memory) {
        return gameInstances;
    }
}