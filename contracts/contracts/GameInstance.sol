// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// GameInstance.sol manages a single trivia game instance for FriendChain MVP
contract GameInstance {
    // --- State Variables ---

    // Game Metadata (inherited from GameFactory)
    uint256 public gameId; // Unique identifier for the game
    address public creator; // Address of the game creator
    uint256 public stakeAmount; // Amount of FRND tokens each player stakes (10-100 FRND, in wei)
    uint256 public playerLimit; // Maximum number of players (2-10)
    string public basename; // Creator's Basename (e.g., "bob.base")
    string public ipfsHash; // IPFS hash for AI-generated questions
    uint256 public createdAt; // Timestamp of game creation
    uint256 public creatorFee; // Fee percentage set by the creator (e.g., 5%)
    uint256 public gameDuration; // Total duration of the game in seconds (e.g., 48 hours)
    uint256 public gameEndTime; // Timestamp when the game ends (createdAt + gameDuration)

    // Token and External Contracts
    address public tokenAddress; // Address of FriendToken.sol (ERC-20)
    address public resolverAddress; // Address of the Base ENS resolver
    address public entryPointAddress; // Address of the ERC-4337 EntryPoint contract
    address public nftBadgeAddress; // Address of NFTBadge.sol for minting winner badges

    // Game State
    GameState public gameState; // Tracks the game's state (Open, InProgress, Completed)
    uint256 public playerCount; // Current number of players
    mapping(address => string) public players; // Maps player addresses to their Basenames
    mapping(address => uint256) public playerStakes; // Tracks each player's staked amount
    mapping(address => string) public playerTwitterHandles; // Stores Twitter usernames
    mapping(address => uint256) public playerProgress; // Tracks player's current stage (1, 2, 3, or 0 if eliminated)
    mapping(address => mapping(uint256 => uint256)) public playerAnswers; // Stores answers for each question (questionId => answer)
    mapping(address => uint256) public playerAnswerTimes; // Tracks total time taken for answers
    mapping(address => mapping(uint256 => uint256)) public playerQuestionTimes; // Tracks start time for each question
    mapping(address => bool) public eliminatedPlayers; // Tracks elimination status
    Winner[] public winners; // Array of up to 3 winners (address, Basename, total time)
    LeaderboardEntry[] public leaderboard; // Array of all players (address, Basename, stage reached, total time, refund amount)

    // Referral System
    mapping(address => uint256) public referrals; // Tracks referral counts per player
    mapping(address => address) public referredBy; // Tracks who referred each player

    // IPFS and Questions
    string public questionsIpfsHash; // IPFS hash for the 15 questions
    mapping(uint256 => uint256) public correctAnswers; // Maps question IDs (1-15) to correct answer indices (0-3)

    // Constants
    uint256 public constant QUESTION_TIMER = 30; // 30 seconds per question
    uint256 public constant QUESTIONS_PER_STAGE = 5; // 5 questions per stage
    uint256 public constant TOTAL_QUESTIONS = 15; // Total questions across all stages
    uint256 public constant MAX_WINNERS = 3; // Maximum number of winners
    uint256 public constant STAGE_1_REFUND_PERCENTAGE = 0; // 0% refund for Stage 1 elimination
    uint256 public constant STAGE_2_REFUND_PERCENTAGE = 30; // 30% refund for Stage 2 elimination
    uint256 public constant STAGE_3_REFUND_PERCENTAGE = 70; // 70% refund for Stage 3 elimination
    uint256 public constant STAGE_3_COMPLETION_REFUND_PERCENTAGE = 100; // 100% refund for completing Stage 3
    uint256 public constant MIN_STAKE = 10 ether; // 10 FRND
    uint256 public constant MAX_STAKE = 100 ether; // 100 FRND
    uint256 public constant MIN_PLAYERS = 2;
    uint256 public constant MAX_PLAYERS = 10;

    // --- Enums ---

    enum GameState {
        Open, // Players can join the game
        InProgress, // Game is active, players are answering questions
        Completed // Game has ended, payouts distributed
    }

    // --- Structs ---

    struct Winner {
        address player; // Winner's address
        string basename; // Winner's Basename
        uint256 totalTime; // Total time taken to complete all stages
    }

    struct LeaderboardEntry {
        address player; // Player's address
        string basename; // Player's Basename
        uint256 stageReached; // Stage reached (1, 2, or 3)
        uint256 totalTime; // Total time taken
        uint256 refundAmount; // Refund amount received
    }

    // --- Events ---

    event QuestionsStored(uint256 gameId, string ipfsHash);
    event PlayerJoined(address indexed player, string basename, string twitterHandle);
    event GameStarted(uint256 gameId, string creatorBasename, uint256 timestamp);
    event AnswerSubmitted(
        address indexed player,
        string basename,
        uint256 questionId,
        bool isCorrect,
        uint256 timeTaken
    );
    event PlayerEliminated(
        address indexed player,
        string basename,
        uint256 stage,
        uint256 refundAmount
    );
    event GameEnded(uint256 gameId, string[] winnerBasenames, uint256[] totalTimes);
    event LeaderboardUpdated(
        address[] players,
        string[] basenames,
        uint256[] stages,
        uint256[] totalTimes,
        uint256[] refundAmounts
    );
    event PayoutsDistributed(
        string[] winnerBasenames,
        uint256[] prizePoolAmounts,
        uint256[] referralRewards,
        uint256 creatorFee
    );
    event NFTMinted(string winnerBasename, uint256 gameId, uint256 tokenId);

    // --- Errors ---

    error InvalidAddress();
    error InvalidStakeAmount();
    error InvalidPlayerLimit();
    error InvalidBasename();

    // Errors for future functionality
    error GameNotOpen();
    error GameNotInProgress();
    error PlayerLimitReached();
    error EmptyTwitterHandle();
    error QuestionTimerExpired();
    error ReferralLimitReached();
    error QuestionsNotSet();
    error Unauthorized();
    error NotAWinner();
    error AlreadyMinted();

    // --- Constructor ---

    constructor(
        address _tokenAddress,
        address _creator,
        uint256 _gameId,
        uint256 _stakeAmount,
        uint256 _playerLimit,
        string memory _basename,
        string memory _ipfsHash,
        address _resolverAddress,
        address _entryPointAddress
    ) {
        // Validate addresses
        if (_tokenAddress == address(0)) revert InvalidAddress();
        if (_creator == address(0)) revert InvalidAddress();
        // Note: resolverAddress and entryPointAddress can be zero as per test requirements

        // Validate stake amount (10-100 FRND)
        if (_stakeAmount < MIN_STAKE || _stakeAmount > MAX_STAKE) revert InvalidStakeAmount();

        // Validate player limit (2-10)
        if (_playerLimit < MIN_PLAYERS || _playerLimit > MAX_PLAYERS) revert InvalidPlayerLimit();

        // Validate basename (not empty)
        if (bytes(_basename).length == 0) revert InvalidBasename();

        // Initialize state variables
        tokenAddress = _tokenAddress;
        creator = _creator;
        gameId = _gameId;
        stakeAmount = _stakeAmount;
        playerLimit = _playerLimit;
        basename = _basename;
        ipfsHash = _ipfsHash;
        resolverAddress = _resolverAddress;
        entryPointAddress = _entryPointAddress;
        createdAt = block.timestamp;
        creatorFee = 0;
        gameDuration = 0;
        gameEndTime = 0;
        nftBadgeAddress = address(0);
        gameState = GameState.Open; // Explicitly set to Open
        playerCount = 0;
        questionsIpfsHash = "";
    }
}