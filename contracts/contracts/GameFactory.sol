// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./GameInstance.sol";

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
    error InvalidCreator();
    error UnauthorizedCreator();
    error InvalidGameParameters();
    error InvalidBasename();
    error DeploymentFailed();
    error InvalidInstanceAddress();

    // Events
    event CreatorAuthorized(address indexed creator, uint256 timestamp);
    event CreatorRevoked(address indexed creator, uint256 timestamp);
    event GameCreated(
        uint256 indexed gameId,
        address indexed gameInstance,
        address indexed creator,
        string basename,
        uint256 stakeAmount,
        uint256 playerLimit,
        string ipfsHash,
        uint256 timestamp
    );
    event TokenContractUpdated(address indexed oldToken, address indexed newToken, uint256 timestamp);

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

    // Get game details for an instance
    function getGameDetails(address instanceAddress) public view returns (GameMetadata memory) {
        if (gameDetails[instanceAddress].gameId == 0) {
            revert InvalidInstanceAddress();
        }
        return gameDetails[instanceAddress];
    }

    // Authorize a creator
    function authorizeCreator(address creator) external onlyOwner {
        if (creator == address(0)) {
            revert InvalidCreator();
        }
        authorizedCreators[creator] = true;
        emit CreatorAuthorized(creator, block.timestamp);
    }

    // Revoke a creator's authorization
    function revokeCreator(address creator) external onlyOwner {
        if (creator == address(0)) {
            revert InvalidCreator();
        }
        authorizedCreators[creator] = false;
        emit CreatorRevoked(creator, block.timestamp);
    }

    // Create a new game instance
    function createGameInstance(
        uint256 stakeAmount,
        uint256 playerLimit,
        string memory basename,
        string memory ipfsHash
    ) external returns (address) {
        if (!authorizedCreators[msg.sender]) {
            revert UnauthorizedCreator();
        }
        if (stakeAmount < MIN_STAKE || stakeAmount > MAX_STAKE) {
            revert InvalidGameParameters();
        }
        if (playerLimit < MIN_PLAYERS || playerLimit > MAX_PLAYERS) {
            revert InvalidGameParameters();
        }
        if (bytes(basename).length == 0) {
            revert InvalidBasename();
        }

        uint256 gameId = nextGameId;
        nextGameId++;

        GameInstance gameInstance;
        try new GameInstance(
            tokenAddress,
            msg.sender,
            gameId,
            stakeAmount,
            playerLimit,
            basename,
            ipfsHash,
            resolverAddress,
            entryPointAddress
        ) returns (GameInstance instance) {
            gameInstance = instance;
        } catch {
            revert DeploymentFailed();
        }

        address instanceAddress = address(gameInstance);
        gameInstances.push(instanceAddress);

        gameDetails[instanceAddress] = GameMetadata({
            gameId: gameId,
            creator: msg.sender,
            basename: basename,
            stakeAmount: stakeAmount,
            playerLimit: playerLimit,
            ipfsHash: ipfsHash,
            createdAt: block.timestamp
        });

        emit GameCreated(
            gameId,
            instanceAddress,
            msg.sender,
            basename,
            stakeAmount,
            playerLimit,
            ipfsHash,
            block.timestamp
        );

        return instanceAddress;
    }

    // Update the token contract address
    function updateTokenContract(address newTokenAddress) external onlyOwner {
        if (newTokenAddress == address(0)) {
            revert InvalidTokenAddress();
        }
        address oldTokenAddress = tokenAddress;
        tokenAddress = newTokenAddress;
        emit TokenContractUpdated(oldTokenAddress, newTokenAddress, block.timestamp);
    }
}