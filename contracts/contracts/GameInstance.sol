// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// Interface for NFTBadge contract to allow GameInstance to mint badges
interface INFTBadge {
    function mintBadge(address recipient, string calldata badgeTokenURI) external returns (uint256);
}

contract GameInstance {
    // --- State Variables ---
    IERC20 public immutable token;
    address public immutable creator;
    uint256 public immutable gameId;
    uint256 public immutable stakeAmount;
    uint256 public immutable playerLimit;
    string public basename;
    string public metadataIpfsHash;
    address public immutable resolverAddress;
    address public immutable entryPointAddress;
    uint256 public immutable createdAt;
    INFTBadge public immutable nftBadge; // Address of the NFTBadge contract

    // Constants
    uint256 public constant TOTAL_QUESTIONS = 15;
    uint256 public constant MIN_STAKE = 10 ether;
    uint256 public constant MAX_STAKE = 100 ether;
    uint256 public constant MIN_PLAYERS = 2;
    uint256 public constant MAX_PLAYERS = 10;
    uint256 public constant QUESTION_TIME_LIMIT = 30 seconds;

    // Game state
    enum GameState {
        Open,
        InProgress,
        Ended
    }
    GameState public gameState;
    uint256 public playerCount;
    string public questionsIpfsHash;
    // mapping(uint256 => uint256) public correctAnswers; // Question number => correct answer (1-3)
    uint256[16] public correctAnswers; // Fixed-size array, 0-indexed with 16 elements (0 unused, 1-15 for questions)

    uint256 public constant QUESTIONS_PER_STAGE = 5;
    mapping(address => uint256[3]) public playerStageScores; // Scores for each of the 3 stages
    mapping(address => uint256) public playerFinishTime; // Time when player completes all questions

    uint256 public minimumDuration = 60 seconds; // Adjustable
    uint256 public startTime;

    // Player data
    address[] public playerList; // List of player addresses
    mapping(address => string) public players; // Player address => basename
    mapping(address => uint256) public playerStakes; // Player address => staked amount
    mapping(address => string) public playerTwitterHandles; // Player address => Twitter handle

    // Stage 4 additions
    mapping(address => uint256) public playerProgress; // Player address => current question number (0 if not started, 1-15 for questions)
    mapping(address => uint256) public playerScores; // Player address => number of correct answers
    mapping(address => uint256) public questionStartTimes; // Player address => start time of current question
    mapping(address => bool) public eliminatedPlayers; // Player address => whether they are eliminated

    // --- Events ---
    event PlayerJoined(address indexed player, string basename, string twitterHandle);
    event QuestionsStored(uint256 indexed gameId, string questionsIpfsHash);
    event GameStarted(uint256 indexed gameId, string basename, uint256 startTime);
    event AnswerSubmitted(address indexed player, uint256 questionNumber, uint256 answer, bool isCorrect);
    event PlayerEliminated(address indexed player, string reason);
    event GameEnded(address winner, uint256 prize);
    event BadgeMintedForWinner(address indexed winner, uint256 tokenId); // New event for badge minting

    event DebugGameState(uint256 state);

    // --- Errors ---
    error InvalidAddress();
    error InvalidStakeAmount();
    error InvalidPlayerLimit();
    error InvalidBasename();
    error Unauthorized();
    error GameNotOpen();
    error AlreadyJoined();
    error PlayerLimitReached();
    error EmptyTwitterHandle();
    error InsufficientStake();
    error TransferFailed();
    error InvalidQuestionCount();
    error QuestionsNotSet();
    error GameNotInProgress();
    error NotAPlayer();
    error TimeLimitExceeded();
    error AlreadyEliminated();
    error InvalidAnswer();
    error BadgeMintingFailed(); // New error for badge minting failure

    uint256 public startTimestamp; // Timestamp when the game starts

    // --- Constructor ---
    constructor(
        address _tokenAddress,
        address _creator,
        uint256 _gameId,
        uint256 _stakeAmount,
        uint256 _playerLimit,
        string memory _basename,
        string memory _metadataIpfsHash,
        address _resolverAddress,
        address _entryPointAddress,
        address _nftBadgeAddress // New parameter for NFTBadge address
    ) {
        if (_tokenAddress == address(0) || _creator == address(0) || _nftBadgeAddress == address(0)) revert InvalidAddress();
        if (_stakeAmount < MIN_STAKE || _stakeAmount > MAX_STAKE) revert InvalidStakeAmount();
        if (_playerLimit < MIN_PLAYERS || _playerLimit > MAX_PLAYERS) revert InvalidPlayerLimit();
        if (bytes(_basename).length == 0) revert InvalidBasename();

        token = IERC20(_tokenAddress);
        creator = _creator;
        gameId = _gameId;
        stakeAmount = _stakeAmount;
        playerLimit = _playerLimit;
        basename = _basename;
        metadataIpfsHash = _metadataIpfsHash;
        resolverAddress = _resolverAddress;
        entryPointAddress = _entryPointAddress;
        createdAt = block.timestamp;
        nftBadge = INFTBadge(_nftBadgeAddress); 
        gameState = GameState.Open;// Initialize NFTBadge contract
    }

    // --- Existing Functions ---
    function joinGame(string memory playerBasename, string memory twitterHandle) external {
        if (gameState != GameState.Open) revert GameNotOpen();
        if (bytes(players[msg.sender]).length != 0) revert AlreadyJoined();
        if (playerCount >= playerLimit) revert PlayerLimitReached();
        if (bytes(playerBasename).length == 0) revert InvalidBasename();
        if (bytes(twitterHandle).length == 0) revert EmptyTwitterHandle();
        if (token.allowance(msg.sender, address(this)) < stakeAmount) revert InsufficientStake();

        if (!token.transferFrom(msg.sender, address(this), stakeAmount)) revert TransferFailed();

        players[msg.sender] = playerBasename;
        playerTwitterHandles[msg.sender] = twitterHandle;
        playerStakes[msg.sender] = stakeAmount;
        playerList.push(msg.sender);
        playerCount++;

        emit PlayerJoined(msg.sender, playerBasename, twitterHandle);
    }

    function setQuestions(string calldata _questionsIpfsHash, uint256[] calldata _correctAnswers) external {
        if (msg.sender != creator) revert Unauthorized();
        if (gameState != GameState.Open) revert GameNotOpen();
        if (bytes(_questionsIpfsHash).length == 0) revert InvalidQuestionCount();
        if (_correctAnswers.length != TOTAL_QUESTIONS) revert InvalidQuestionCount();

        questionsIpfsHash = _questionsIpfsHash;
        for (uint256 i = 0; i < TOTAL_QUESTIONS; i++) {
            if (_correctAnswers[i] < 1 || _correctAnswers[i] > 3) revert InvalidQuestionCount();
            correctAnswers[i + 1] = _correctAnswers[i];
        }

        emit QuestionsStored(gameId, _questionsIpfsHash);
    }

    function startGame() external {
        if (msg.sender != creator) revert Unauthorized();
        if (gameState != GameState.Open) revert GameNotOpen();
        if (playerCount < MIN_PLAYERS) revert PlayerLimitReached();
        if (bytes(questionsIpfsHash).length == 0) revert QuestionsNotSet();

        // Set game state to InProgress
        gameState = GameState.InProgress;
        startTimestamp = block.timestamp;
        
        // Log game state for debugging
        uint256 currentState = uint256(gameState);
        emit DebugGameState(currentState);
        
        // Emit game started event
        emit GameStarted(gameId, basename, startTimestamp);
    }

    

    // --- Stage 4 Functions ---
    function submitAnswer(uint8 answer) external {
        if (gameState != GameState.InProgress) revert GameNotInProgress();
        if (bytes(players[msg.sender]).length == 0) revert NotAPlayer();
        if (eliminatedPlayers[msg.sender]) revert AlreadyEliminated();
        if (answer < 1 || answer > 3) revert InvalidAnswer();

        console.log("Submitting answer for player:", Strings.toHexString(uint256(uint160(msg.sender)), 20));
        console.log("Current question:", playerProgress[msg.sender]);

        if (playerProgress[msg.sender] == 0) {
            playerProgress[msg.sender] = 1;
            questionStartTimes[msg.sender] = block.timestamp;
        }

        uint256 currentQuestion = playerProgress[msg.sender];
        uint256 currentStage = (currentQuestion - 1) / QUESTIONS_PER_STAGE; // 0, 1, or 2
        if (currentQuestion > TOTAL_QUESTIONS) return;

        if (block.timestamp > questionStartTimes[msg.sender] + QUESTION_TIME_LIMIT) {
            _eliminatePlayer(msg.sender, "TimeLimitExceeded");
            _checkGameEnd();
            return;
        }

        if (correctAnswers[currentQuestion] == 0) revert InvalidQuestionCount();
        bool isCorrect = (answer == correctAnswers[currentQuestion]);
        console.log("Answer correct:", isCorrect ? "true" : "false");
        emit AnswerSubmitted(msg.sender, currentQuestion, answer, isCorrect);

        if (isCorrect) {
            playerStageScores[msg.sender][currentStage]++;
            playerScores[msg.sender]++;
        }

        playerProgress[msg.sender]++;
        console.log("Player progress after increment:", playerProgress[msg.sender]);
        if (playerProgress[msg.sender] <= TOTAL_QUESTIONS) {
            questionStartTimes[msg.sender] = block.timestamp;
        } else {
            playerFinishTime[msg.sender] = block.timestamp; // Record finish time
        }

        // Check stage completion (after questions 5, 10, 15)
        if (currentQuestion % QUESTIONS_PER_STAGE == 0 && currentQuestion <= TOTAL_QUESTIONS) {
            uint256 stageScore = playerStageScores[msg.sender][currentStage];
            string memory logMessage = string.concat(
                "Player: ",
                Strings.toHexString(uint256(uint160(msg.sender)), 20),
                ", Stage: ",
                Strings.toString(currentStage),
                ", Score: ",
                Strings.toString(stageScore)
            );
            console.log(logMessage);
            if (stageScore < QUESTIONS_PER_STAGE) {
                _eliminatePlayer(msg.sender, "StageFailed");
                _checkGameEnd();
                return;
            }
        }

        console.log("Calling _checkGameEnd");
        _checkGameEnd();
    }

    function checkTimeout(address player) external {
        if (gameState != GameState.InProgress) revert GameNotInProgress();
        if (bytes(players[player]).length == 0) revert NotAPlayer();
        if (eliminatedPlayers[player]) revert AlreadyEliminated();

        uint256 currentQuestion = playerProgress[player];
        if (currentQuestion == 0 || currentQuestion > TOTAL_QUESTIONS) {
            return; // Player hasn't started or has finished
        }

        if (block.timestamp > questionStartTimes[player] + QUESTION_TIME_LIMIT) {
            _eliminatePlayer(player, "TimeLimitExceeded");
            _checkGameEnd();
        }
    }

    // --- Internal Functions ---
    function _eliminatePlayer(address player, string memory reason) internal {
        string memory logMessage = string.concat(
            "Eliminating player: ",
            Strings.toHexString(uint256(uint160(player)), 20),
            ", Reason: ",
            reason
        );
        console.log(logMessage);
        eliminatedPlayers[player] = true;
        console.log("Player eliminated status: true");
        emit PlayerEliminated(player, reason);
    }

    function _checkGameEnd() internal {
        if (gameState != GameState.InProgress) return;

        console.log("Active players count initialization:", 0);
        uint256 activePlayers = 0;
        address[3] memory topFinishers;
        uint256[3] memory finishTimes;
        uint256 winnerCount = 0;

        for (uint256 i = 0; i < playerList.length; i++) {
            address player = playerList[i];
            if (!eliminatedPlayers[player]) {
                activePlayers++;
                console.log("Player not eliminated:", Strings.toHexString(uint256(uint160(player)), 20));
                console.log("Player progress:", playerProgress[player]);
                if (playerProgress[player] > TOTAL_QUESTIONS) {
                    console.log("Player finished, finish time:", playerFinishTime[player]);
                    if (winnerCount < 3) {
                        topFinishers[winnerCount] = player;
                        finishTimes[winnerCount] = playerFinishTime[player];
                        winnerCount++;
                    } else {
                        uint256 slowestIdx = 0;
                        for (uint256 j = 1; j < 3; j++) {
                            if (finishTimes[j] > finishTimes[slowestIdx]) {
                                slowestIdx = j;
                            }
                        }
                        if (playerFinishTime[player] < finishTimes[slowestIdx]) {
                            topFinishers[slowestIdx] = player;
                            finishTimes[slowestIdx] = playerFinishTime[player];
                        }
                    }
                }
            }
        }

        console.log("After loop - Active players:", activePlayers);
        console.log("Winner count:", winnerCount);
        if (activePlayers == 0) {
            gameState = GameState.Ended;
            emit GameEnded(address(0), 0);
            return;
        }

        bool allFinished = true;
        for (uint256 i = 0; i < playerList.length; i++) {
            address player = playerList[i];
            if (!eliminatedPlayers[player] && playerProgress[player] < TOTAL_QUESTIONS) {
                console.log("Player not finished:", Strings.toHexString(uint256(uint160(player)), 20));
                allFinished = false;
                break;
            }
        }
        console.log("All finished:", allFinished ? "true" : "false");
        

        if (activePlayers <= 1 || allFinished) {
            gameState = GameState.Ended;

            uint256 totalLost = 0;
            for (uint256 i = 0; i < playerList.length; i++) {
                address player = playerList[i];
                if (eliminatedPlayers[player]) {
                    totalLost += playerStakes[player];
                }
            }
            console.log("Total lost stakes:", totalLost);

            uint256 creatorShare = (totalLost * 20) / 100;
            uint256 platformShare = (totalLost * 20) / 100;
            uint256 winnerShare = (totalLost * 60) / 100 / (winnerCount > 0 ? winnerCount : 1);
            console.log("Creator share:", creatorShare);
            console.log("Platform share:", platformShare);
            console.log("Winner share:", winnerShare);

            if (!token.transfer(creator, creatorShare)) revert TransferFailed();
            if (!token.transfer(entryPointAddress, platformShare)) revert TransferFailed();

            for (uint256 i = 0; i < winnerCount; i++) {
                address winner = topFinishers[i];
                if (winner != address(0)) {
                    console.log("Transferring to winner:", Strings.toHexString(uint256(uint160(winner)), 20));
                    if (!token.transfer(winner, winnerShare)) revert TransferFailed();
                    playerStakes[winner] = 0;
                    string memory badgeTokenURI = "bafkreib27pyy3ll4o24vtysgngdefsjnnrrh3ennqy2kpce2lbz76ro72i";
                    try nftBadge.mintBadge(winner, badgeTokenURI) returns (uint256 tokenId) {
                        emit BadgeMintedForWinner(winner, tokenId);
                    } catch {
                        revert BadgeMintingFailed();
                    }
                }
            }

            for (uint256 i = 0; i < playerList.length; i++) {
                address player = playerList[i];
                if (eliminatedPlayers[player] && playerProgress[player] > 0) {
                    uint256 stageEliminated = (playerProgress[player] - 1) / QUESTIONS_PER_STAGE;
                    uint256 refundPercentage;
                    if (stageEliminated == 0) refundPercentage = 0;
                    else if (stageEliminated == 1) refundPercentage = 30;
                    else if (stageEliminated == 2) refundPercentage = 70;
                    uint256 refundAmount = (playerStakes[player] * refundPercentage) / 100;
                    console.log("Refunding player:", Strings.toHexString(uint256(uint160(player)), 20));
                    console.log("Refund amount:", refundAmount);
                    if (refundAmount > 0 && !token.transfer(player, refundAmount)) revert TransferFailed();
                    playerStakes[player] -= refundAmount;
                }
            }

            emit GameEnded(topFinishers[0], totalLost);
        }
    }
}