// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GameInstance.sol";

// GameFactory.sol manages the creation of trivia game instances for FriendChain MVP
contract GameFactory {
    // --- State Variables ---

    address public tokenAddress; // Address of FriendToken.sol (ERC-20)
    address public owner; // Owner of the contract (deployer)
    address public resolverAddress; // Address of the Base ENS resolver
    address public entryPointAddress; // Address of the ERC-4337 EntryPoint contract

    mapping(address => bool) public authorizedCreators; // Tracks authorized creators
    mapping(address => CreatorSubmission) public creatorSubmissions; // Stores creator submissions
    address[] public gameInstances; // Array of all game instances
    mapping(address => address[]) public creatorToGames; // Maps creators to their game instances

    // --- Structs ---

    struct CreatorSubmission {
        string twitterUsername; // Creator's Twitter username
        string basename; // Creator's Basename (e.g., "bob.base")
        string metadataIpfsHash; // IPFS hash for AI-generated content (renamed from ipfsHash)
        bool submitted; // Tracks submission status
    }

    struct GameDetails {
        address creator; // Address of the game creator
        uint256 gameId; // Unique identifier for the game
        uint256 stakeAmount; // Amount of FRND tokens each player stakes
        uint256 playerLimit; // Maximum number of players
        string basename; // Creator's Basename
        string metadataIpfsHash; // IPFS hash for AI-generated content
        uint256 createdAt; // Timestamp of game creation
        uint256 playerCount; // Current number of players
        GameInstance.GameState gameState; // Current state of the game
    }

    // --- Events ---

    event CreatorAuthorized(address indexed creator);
    event CreatorRevoked(address indexed creator);
    event CreatorSubmissionStored(address indexed creator, string twitterUsername, string basename);
    event IpfsHashUpdated(address indexed creator, string metadataIpfsHash);
    event GameCreated(
        address indexed gameInstance,
        address indexed creator,
        uint256 gameId,
        uint256 stakeAmount,
        uint256 playerLimit,
        string basename,
        string metadataIpfsHash
    );
    event TokenContractUpdated(address indexed newTokenAddress);

    // --- Errors ---

    error Unauthorized();
    error InvalidAddress();
    error InvalidTwitterUsername();
    error InvalidBasename();
    error AlreadySubmitted();
    error SubmissionNotFound();
    error InvalidStakeAmount();
    error InvalidPlayerLimit();

    // --- Constructor ---

    constructor(
        address _tokenAddress,
        address _owner,
        address _resolverAddress,
        address _entryPointAddress
    ) {
        if (_tokenAddress == address(0) || _owner == address(0)) revert InvalidAddress();

        tokenAddress = _tokenAddress;
        owner = _owner;
        resolverAddress = _resolverAddress;
        entryPointAddress = _entryPointAddress;
    }

    // --- Creator Authorization Functions ---

    function authorizeCreator(address creator) external {
        if (msg.sender != owner) revert Unauthorized();
        if (creator == address(0)) revert InvalidAddress();

        authorizedCreators[creator] = true;
        emit CreatorAuthorized(creator);
    }

    function revokeCreator(address creator) external {
        if (msg.sender != owner) revert Unauthorized();
        if (creator == address(0)) revert InvalidAddress();

        authorizedCreators[creator] = false;
        emit CreatorRevoked(creator);
    }

    // --- Creator Submission Functions ---

    function submitCreatorDetails(string memory twitterUsername, string memory basename) external {
        if (!authorizedCreators[msg.sender]) revert Unauthorized();
        if (creatorSubmissions[msg.sender].submitted) revert AlreadySubmitted();
        if (bytes(twitterUsername).length == 0) revert InvalidTwitterUsername();
        if (bytes(basename).length == 0) revert InvalidBasename();

        creatorSubmissions[msg.sender] = CreatorSubmission({
            twitterUsername: twitterUsername,
            basename: basename,
            metadataIpfsHash: "",
            submitted: true
        });

        emit CreatorSubmissionStored(msg.sender, twitterUsername, basename);
    }

    function updateIpfsHash(address creator, string memory metadataIpfsHash) external {
        if (msg.sender != owner) revert Unauthorized();
        if (!creatorSubmissions[creator].submitted) revert SubmissionNotFound();
        if (bytes(metadataIpfsHash).length == 0) revert InvalidBasename();

        creatorSubmissions[creator].metadataIpfsHash = metadataIpfsHash;
        emit IpfsHashUpdated(creator, metadataIpfsHash);
    }

    function getCreatorSubmission(
        address creator
    ) external view returns (string memory twitterUsername, string memory basename, string memory metadataIpfsHash) {
        CreatorSubmission memory submission = creatorSubmissions[creator];
        if (!submission.submitted) revert SubmissionNotFound();
        return (submission.twitterUsername, submission.basename, submission.metadataIpfsHash);
    }

    // --- Game Instance Management ---

    function createGameInstance(uint256 gameId, uint256 stakeAmount, uint256 playerLimit) external {
        if (!authorizedCreators[msg.sender]) revert Unauthorized();

        CreatorSubmission memory submission = creatorSubmissions[msg.sender];
        if (!submission.submitted || bytes(submission.metadataIpfsHash).length == 0) revert SubmissionNotFound();

        // Validate player limit (2-10)
        if (playerLimit < 2 || playerLimit > 10) revert InvalidPlayerLimit();

        // Deploy new GameInstance
        GameInstance gameInstance = new GameInstance(
            tokenAddress,
            msg.sender,
            gameId,
            stakeAmount,
            playerLimit,
            submission.basename,
            submission.metadataIpfsHash,
            resolverAddress,
            entryPointAddress
        );

        address gameInstanceAddress = address(gameInstance);
        gameInstances.push(gameInstanceAddress);
        creatorToGames[msg.sender].push(gameInstanceAddress);

        emit GameCreated(
            gameInstanceAddress,
            msg.sender,
            gameId,
            stakeAmount,
            playerLimit,
            submission.basename,
            submission.metadataIpfsHash
        );
    }

    function getGameInstances() external view returns (address[] memory) {
        return gameInstances;
    }

    function getCreatorGames(address creator) external view returns (address[] memory) {
        return creatorToGames[creator];
    }

    function getGameDetails(address gameInstanceAddress) external view returns (GameDetails memory) {
        if (gameInstanceAddress == address(0)) revert InvalidAddress();

        GameInstance game = GameInstance(gameInstanceAddress);
        return
            GameDetails({
                creator: game.creator(),
                gameId: game.gameId(),
                stakeAmount: game.stakeAmount(),
                playerLimit: game.playerLimit(),
                basename: game.basename(),
                metadataIpfsHash: game.metadataIpfsHash(),
                createdAt: game.createdAt(),
                playerCount: game.playerCount(),
                gameState: game.gameState()
            });
    }

    // --- Token Contract Management ---

    function updateTokenContract(address newTokenAddress) external {
        if (msg.sender != owner) revert Unauthorized();
        if (newTokenAddress == address(0)) revert InvalidAddress();

        tokenAddress = newTokenAddress;
        emit TokenContractUpdated(newTokenAddress);
    }
}