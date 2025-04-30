// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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
    mapping(uint256 => uint256) public correctAnswers; // Question number => correct answer (1-3)

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
        address _entryPointAddress
    ) {
        if (_tokenAddress == address(0) || _creator == address(0)) revert InvalidAddress();
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
    }

    // --- Existing Functions ---
function joinGame(string calldata _basename, string calldata _twitterHandle) external {
      if (gameState != GameState.Open) revert GameNotOpen();
      if (bytes(players[msg.sender]).length != 0) revert AlreadyJoined();
      if (playerCount >= playerLimit) revert PlayerLimitReached();
      if (bytes(_basename).length == 0) revert InvalidBasename();
      if (bytes(_twitterHandle).length == 0) revert EmptyTwitterHandle();

      uint256 allowance = token.allowance(msg.sender, address(this));
      if (allowance < stakeAmount) revert InsufficientStake();

      // Use try-catch to handle transferFrom failure
      try token.transferFrom(msg.sender, address(this), stakeAmount) returns (bool success) {
          if (!success) revert TransferFailed();
      } catch {
          revert TransferFailed();
      }

      players[msg.sender] = _basename;
      playerStakes[msg.sender] = stakeAmount;
      playerTwitterHandles[msg.sender] = _twitterHandle;
      playerList.push(msg.sender); // Add player to the list
      playerCount++;

      emit PlayerJoined(msg.sender, _basename, _twitterHandle);
  }

    function setQuestions(string calldata _questionsIpfsHash, uint256[] calldata _correctAnswers) external {
        if (msg.sender != creator) revert Unauthorized();
        if (gameState != GameState.Open) revert GameNotOpen();
        if (bytes(_questionsIpfsHash).length == 0) revert InvalidBasename();
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

        gameState = GameState.InProgress;
        emit GameStarted(gameId, basename, block.timestamp);
    }

        // --- Stage 4 Functions ---
    function submitAnswer(uint8 answer) external {
        // Validate game state and player
        if (gameState != GameState.InProgress) revert GameNotInProgress();
        if (bytes(players[msg.sender]).length == 0) revert NotAPlayer();
        if (eliminatedPlayers[msg.sender]) revert AlreadyEliminated();
        if (answer < 1 || answer > 3) revert InvalidAnswer();

        // Initialize progress if player hasn't started
        if (playerProgress[msg.sender] == 0) {
            playerProgress[msg.sender] = 1;
            questionStartTimes[msg.sender] = block.timestamp;
        }

        uint256 currentQuestion = playerProgress[msg.sender];
        if (currentQuestion > TOTAL_QUESTIONS) {
            // Player has already answered all questions
            return;
        }

        // Check if the player has exceeded the time limit
        if (block.timestamp > questionStartTimes[msg.sender] + QUESTION_TIME_LIMIT) {
            _eliminatePlayer(msg.sender, "TimeLimitExceeded");
            return;
        }

        // Process the answer
        bool isCorrect = (answer == correctAnswers[currentQuestion]);
        emit AnswerSubmitted(msg.sender, currentQuestion, answer, isCorrect); // Moved here

        if (isCorrect) {
            playerScores[msg.sender]++;
        } else {
            _eliminatePlayer(msg.sender, "IncorrectAnswer");
            return;
        }

        // Move to the next question
        playerProgress[msg.sender]++;
        if (playerProgress[msg.sender] <= TOTAL_QUESTIONS) {
            questionStartTimes[msg.sender] = block.timestamp; // Reset timer for the next question
        }

        // Check if the game should end
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
        eliminatedPlayers[player] = true;
        emit PlayerEliminated(player, reason);
    }

    function _checkGameEnd() internal {
        if (gameState != GameState.InProgress) return;

        // Count remaining players and find the winner
        uint256 activePlayers = 0;
        address lastPlayer;
        uint256 highestScore = 0;
        address potentialWinner;

        for (uint256 i = 0; i < playerList.length; i++) {
            address player = playerList[i];
            if (!eliminatedPlayers[player]) {
                activePlayers++;
                lastPlayer = player;

                // Track the player with the highest score
                if (playerScores[player] > highestScore) {
                    highestScore = playerScores[player];
                    potentialWinner = player;
                } else if (playerScores[player] == highestScore) {
                    // In case of a tie, prefer the player who answered faster (lower questionStartTimes for the last question)
                    if (playerProgress[player] > TOTAL_QUESTIONS && playerProgress[potentialWinner] > TOTAL_QUESTIONS) {
                        if (questionStartTimes[player] < questionStartTimes[potentialWinner]) {
                            potentialWinner = player;
                        }
                    }
                }
            }
        }

        // End the game if only one player remains or all players have answered all questions
        if (activePlayers <= 1) {
            gameState = GameState.Ended;
            address winner = activePlayers == 1 ? lastPlayer : address(0);
            uint256 prize = winner != address(0) ? stakeAmount * playerCount : 0;

            if (winner != address(0)) {
                bool success = token.transfer(winner, prize);
                if (!success) revert TransferFailed();
            }

            emit GameEnded(winner, prize);
        } else {
            // Check if all remaining players have answered all questions
            bool allFinished = true;
            for (uint256 i = 0; i < playerList.length; i++) {
                address player = playerList[i];
                if (!eliminatedPlayers[player] && playerProgress[player] <= TOTAL_QUESTIONS) {
                    allFinished = false;
                    break;
                }
            }

            if (allFinished) {
                gameState = GameState.Ended;
                address winner = potentialWinner;
                uint256 prize = winner != address(0) ? stakeAmount * playerCount : 0;

                if (winner != address(0)) {
                    bool success = token.transfer(winner, prize);
                    if (!success) revert TransferFailed();
                }

                emit GameEnded(winner, prize);
            }
        }
    }
}