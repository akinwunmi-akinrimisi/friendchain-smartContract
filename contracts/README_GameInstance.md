GameInstance.sol Development Plan (Revised with Updated Payout Mechanics)
Overview
GameInstance.sol manages a single trivia game instance created by GameFactory.sol for the FriendChain MVP on Base Sepolia testnet. The contract implements a 15-question trivia game across three stages (5 questions each), with staking, eliminations, payouts, referral rewards, and IPFS storage for AI-generated questions. Players progress automatically through stages by answering all questions correctly in each stage; a single wrong answer results in elimination with stage-dependent refunds. The game ends automatically after a set duration (e.g., 48 or 72 hours), and the first 3 players to complete all stages correctly, ranked by shortest total time, are declared main winners, splitting the prize pool. The contract integrates Basenames, supports ERC-4337 gasless transactions, and ensures 100% payout accuracy with no vulnerabilities.
This plan aligns with the FriendChain MVP Smart Contract Developer Task Document (Task 4) and FriendChain MVP Product Requirements Document (PRD) (FR5, FR7, FR8, FR10, FR11), incorporating updated payout mechanics:

Stage 1 wrong answer: 0% refund (lose entire stake).
Stage 2 wrong answer: 30% refund (prize for winning Stage 1).
Stage 3 wrong answer: 70% refund (prize for winning Stages 1 and 2).
Stage 3 completion: 100% refund.
Main winners: First 3 to complete all stages, ranked by shortest time, split the prize pool.


Requirements

Trivia Game Mechanics:
15 questions across 3 stages (5 questions each).
Players progress automatically to the next stage by answering all 5 questions correctly.
A single wrong answer results in elimination:
Stage 1: 0% refund (lose entire stake).
Stage 2: 30% refund (prize for winning Stage 1).
Stage 3: 70% refund (prize for winning Stages 1 and 2).


Completing Stage 3 (all 15 questions correct): 100% refund.
Main winners: First 3 players to complete all 15 questions correctly, ranked by shortest total time, split the prize pool (total stakes + creator fee).
Game ends automatically after a creator-set duration (e.g., 48 or 72 hours).
30 seconds per question (fixed, configurable in future iterations).
100% payout accuracy.


Player Participation:
Players stake 10-100 FRND tokens (gasless).
Players submit their Twitter username (no verification).
Players provide a Basename that resolves to their address.


Referral System:
Players earn 1 FRND token per referral (max 10 per game).


IPFS Integration:
Store IPFS hashes for AI-generated questions.
Emit events for hash storage and allow retrieval for frontend display.


Basenames Integration:
Resolve Basenames via Base ENS resolver.
Track and display Basenames in events and interactions.


ERC-4337 Gasless Transactions:
Support gasless staking, answer submissions, and payouts.
Ensure <2s contract calls.


Security and Fairness:
Prevent vulnerabilities (e.g., reentrancy, front-running).
Ensure <5% bot entries through rate-limiting and logging.
100% payout accuracy.




Contract Structure and State Variables
State Variables

Game Metadata (inherited from GameFactory):
gameId: Unique identifier for the game.
creator: Address of the game creator.
creatorBasename: Creator’s Basename (e.g., "bob.base").
stakeAmount: Amount of FRND tokens each player stakes (10–100 FRND, in wei).
playerLimit: Maximum number of players (2–10).
ipfsHash: IPFS hash for AI-generated questions.
createdAt: Timestamp of game creation.
creatorFee: Fee percentage set by the creator (e.g., 5% of total stakes).
gameDuration: Total duration of the game in seconds (e.g., 48 hours = 172,800 seconds).
gameEndTime: Timestamp when the game ends (createdAt + gameDuration).


Token and External Contracts:
tokenAddress: Address of FriendToken.sol (ERC-20).
resolverAddress: Address of the Base ENS resolver.
entryPointAddress: Address of the ERC-4337 EntryPoint contract.
nftBadgeAddress: Address of NFTBadge.sol for minting winner badges.


Game State:
gameState: Enum to track the game’s state (Open, InProgress, Completed).
players: Mapping of player addresses to their Basenames (mapping(address => string) players).
playerCount: Current number of players.
playerStakes: Mapping of player addresses to their staked amounts.
playerTwitterHandles: Mapping of player addresses to their Twitter usernames.
playerProgress: Mapping of player addresses to their current stage (1, 2, 3, or 0 if eliminated).
playerAnswers: Mapping of player addresses to their answers (mapping(address => mapping(uint256 => uint256)) playerAnswers).
playerAnswerTimes: Mapping of player addresses to the total time taken for answers (mapping(address => uint256) playerAnswerTimes).
playerQuestionTimes: Mapping of player addresses to timestamps for each question (mapping(address => mapping(uint256 => uint256)) playerQuestionTimes).
eliminatedPlayers: Mapping of player addresses to their elimination status.
winners: Array of the first 3 players to complete all stages, ranked by time (address, Basename, total time).
leaderboard: Array of all players’ final rankings (address, Basename, stage reached, total time, refund amount).


Referral System:
referrals: Mapping of player addresses to their referral count (mapping(address => uint256) referrals).
referredBy: Mapping of player addresses to the address that referred them.


IPFS and Questions:
questionsIpfsHash: IPFS hash for the 15 questions.
correctAnswers: Mapping of question IDs (1–15) to correct answer indices (0–3), set by the creator.


Constants:
QUESTION_TIMER: Fixed at 30 seconds (configurable in future iterations).
QUESTIONS_PER_STAGE: Fixed at 5.
TOTAL_QUESTIONS: Fixed at 15.
MAX_WINNERS: Fixed at 3.
STAGE_1_REFUND_PERCENTAGE: 0% (no refund for Stage 1 elimination).
STAGE_2_REFUND_PERCENTAGE: 30% (refund for Stage 2 elimination).
STAGE_3_REFUND_PERCENTAGE: 70% (refund for Stage 3 elimination).
STAGE_3_COMPLETION_REFUND_PERCENTAGE: 100% (refund for completing Stage 3).



Enums

GameState:
Open: Players can join the game.
InProgress: Game is active, players are answering questions.
Completed: Game has ended, payouts distributed.




Development Flow and Logic
1. Contract Setup and Initialization
Objective: Initialize the contract with parameters from GameFactory.sol.

Flow:
GameFactory.sol deploys GameInstance.sol with arguments: tokenAddress, resolverAddress, entryPointAddress, nftBadgeAddress, creator, stakeAmount, playerLimit, creatorBasename, creatorFee, gameDuration.
Store these parameters in state variables.
Set initial state: gameState = Open, playerCount = 0, createdAt = block.timestamp, gameEndTime = createdAt + gameDuration.
Validate inputs:
Ensure tokenAddress, resolverAddress, entryPointAddress, and nftBadgeAddress are not zero addresses.
Ensure stakeAmount is between 10–100 FRND (in wei, e.g., 10e18 to 100e18 for 18 decimals).
Ensure playerLimit is between 2–10 to ensure a viable game.
Ensure creatorBasename resolves to the creator address using the Base ENS resolver.
Ensure creatorFee is reasonable (e.g., ≤10% to prevent excessive fees).
Ensure gameDuration is reasonable (e.g., ≥24 hours to give players enough time).


Initialize constants like QUESTION_TIMER (30 seconds), QUESTIONS_PER_STAGE (5), TOTAL_QUESTIONS (15), MAX_WINNERS (3), and refund percentages (0%, 30%, 70%, 100%).


Conditions:
Revert if any address parameter is the zero address.
Revert if stakeAmount, playerLimit, creatorFee, or gameDuration is out of bounds.
Revert if creatorBasename does not resolve to the creator address.




2. Store IPFS Hashes for Questions
Objective: Allow the creator to store the IPFS hash for the 15 AI-generated questions, ensuring they are available before the game starts.

Flow:
The creator calls a storeQuestions function, providing the IPFS hash (questionsIpfsHash) and the correct answers for the 15 questions.
Verify conditions:
Ensure the caller is the creator (to prevent unauthorized question setting).
Ensure gameState == Open (questions can only be set before the game starts).
Ensure the IPFS hash is a non-empty string (to ensure validity).
Ensure the correct answers array has exactly 15 entries (one for each question), with each answer being an integer between 0–3 (representing the index of the correct option among 4 choices).


Update state:
Store the IPFS hash in questionsIpfsHash for frontend retrieval.
Store the correct answers in correctAnswers mapping (e.g., correctAnswers[1] = 2 for question 1).


Emit a QuestionsStored event with the game ID and IPFS hash to notify the frontend and other contracts.


Conditions:
Revert if the caller is not the creator.
Revert if gameState != Open.
Revert if the IPFS hash is empty.
Revert if the correct answers array does not have exactly 15 entries or contains invalid values (not 0–3).




3. Player Joining (Join Game Logic)
Objective: Allow players to join the game by staking FRND tokens, submitting their Twitter username, and providing their Basename, with support for referrals.

Flow:
A player calls the joinGame function, providing their Basename (e.g., "alex.base"), Twitter username (e.g., "alex123"), and an optional referrer address.
Verify the player’s eligibility:
Check if gameState == Open (players can only join before the game starts).
Ensure playerCount < playerLimit (to enforce the maximum player limit).
Ensure the Twitter username is a non-empty string (required for personality analysis, as per PRD FR1).
Ensure the provided Basename resolves to the player’s address using the Base ENS resolver (to verify identity).
Ensure the player hasn’t already joined (to prevent duplicates).


Transfer the stakeAmount of FRND tokens from the player to the contract using OpenZeppelin’s SafeERC20 library (gasless via ERC-4337):
The contract will hold these tokens until the game ends or the player is eliminated with a refund.


Handle referrals:
If a referrer address is provided, ensure the referrer is already a player in the game (exists in the players mapping).
Ensure the referrer has not exceeded the referral limit (10 referrals max, as per PRD FR5).
Increment the referrer’s referrals count in the referrals mapping.
Record the referrer in referredBy for the player (to track referral relationships).


Update state:
Add the player to the players mapping with their Basename (e.g., players[playerAddress] = "alex.base").
Increment playerCount to track the total number of players.
Record the stake in playerStakes (e.g., playerStakes[playerAddress] = stakeAmount).
Store the Twitter username in playerTwitterHandles (e.g., playerTwitterHandles[playerAddress] = "alex123").
Set playerProgress[playerAddress] = 1 (start at Stage 1).


Emit a PlayerJoined event with the player’s address, Basename, and Twitter username to notify the frontend and other contracts.


Conditions:
Revert if gameState != Open.
Revert if playerCount >= playerLimit.
Revert if the Twitter username is empty.
Revert if the Basename does not resolve to the player’s address.
Revert if the player has already joined (check players[playerAddress]).
Revert if the token transfer fails (e.g., insufficient balance or approval).
Revert if the referrer is not a player in the game or has reached the referral limit (10).




4. Start Game (Transition to InProgress)
Objective: Transition the game to the InProgress state once enough players have joined and questions are set, allowing players to start answering questions.

Flow:
Any player or the creator calls a startGame function to begin the game.
Verify conditions:
Ensure gameState == Open (game can only start if it hasn’t already).
Ensure playerCount >= MIN_PLAYERS (set to 2, to ensure the game is viable).
Ensure questionsIpfsHash is set (questions must be available before starting).


Update state:
Set gameState = InProgress to indicate the game is active.


Emit a GameStarted event with the game ID, creator Basename, and timestamp to notify the frontend and other contracts.


Conditions:
Revert if gameState != Open.
Revert if playerCount < MIN_PLAYERS.
Revert if questionsIpfsHash is not set (questions must be stored).




5. Answer Submission and Automatic Progression
Objective: Allow players to submit answers for each question, automatically handle progression through stages, and process eliminations with stage-dependent refunds.

Flow:
A player calls a submitAnswer function, providing the question ID (1–15) and their answer (0–3, representing the selected option).
Verify conditions:
Ensure gameState == InProgress (game must be active).
Ensure block.timestamp <= gameEndTime (game must not have ended).
Ensure the caller is a player and not eliminated (playerProgress[player] > 0).
Determine the player’s current stage based on playerProgress (e.g., Stage 1 for questions 1–5, Stage 2 for 6–10, Stage 3 for 11–15).
Ensure the question ID matches the player’s current stage:
Stage 1: Questions 1–5.
Stage 2: Questions 6–10.
Stage 3: Questions 11–15.


Check the timer for the question:
If the question’s start time is not set, record the current timestamp in playerQuestionTimes[player][questionId].
Calculate the time taken: timeTaken = block.timestamp - playerQuestionTimes[player][questionId].
Ensure timeTaken <= QUESTION_TIMER (30 seconds).


Ensure the player hasn’t already answered this question (check playerAnswers[player][questionId]).


Store the answer in playerAnswers (e.g., playerAnswers[player][questionId] = answer).
Record the time taken for this answer in playerAnswerTimes:
Add timeTaken to the player’s total: playerAnswerTimes[player] += timeTaken.


Check if the answer is correct by comparing it to correctAnswers[questionId].
Elimination and Refunds:
If the answer is incorrect:
Mark the player as eliminated: playerProgress[player] = 0, eliminatedPlayers[player] = true.
Determine the refund based on the stage:
Stage 1 (questions 1–5): 0% refund (player loses entire stake).
Stage 2 (questions 6–10): 30% refund (prize for winning Stage 1).
Refund amount = playerStakes[player] * STAGE_2_REFUND_PERCENTAGE / 100.
Transfer the refund amount to the player using SafeERC20 (gasless).


Stage 3 (questions 11–15): 70% refund (prize for winning Stages 1 and 2).
Refund amount = playerStakes[player] * STAGE_3_REFUND_PERCENTAGE / 100.
Transfer the refund amount to the player using SafeERC20 (gasless).




Add the player to the leaderboard with their stage reached, total time, and refund amount.
Emit a PlayerEliminated event with the player’s address, Basename, stage, and refund amount.


If the answer is correct:
If this is the last question in the stage (e.g., question 5, 10, or 15):
Advance the player to the next stage: playerProgress[player] += 1.
If this is question 15 (end of Stage 3):
The player has completed all stages.
Refund 100% of their stake as a base reward for completing Stage 3:
Refund amount = playerStakes[player] * STAGE_3_COMPLETION_REFUND_PERCENTAGE / 100.
Transfer the refund amount to the player using SafeERC20 (gasless).


Add the player to the winners array if there are fewer than 3 winners:
Store the player’s address, Basename, and total time (playerAnswerTimes[player]).
Sort winners by total time (shortest time first).
Cap at 3 winners (discard later finishers).


Add the player to the leaderboard with stage 3, total time, and refund amount.








Emit an AnswerSubmitted event with the player’s address, Basename, question ID, correctness, and time taken.
Check if the game duration has ended (block.timestamp > gameEndTime):
If true, automatically call the internal _finalizeGame function to end the game (see Step 6).




Conditions:
Revert if gameState != InProgress.
Revert if the game has ended (block.timestamp > gameEndTime).
Revert if the caller is not a player or is eliminated.
Revert if the question ID doesn’t match the player’s current stage.
Revert if the timer has expired (timeTaken > QUESTION_TIMER).
Revert if the player has already answered the question.
Revert if the token transfer fails during a refund.


Security:
Use a commitment scheme for answer submissions (e.g., require players to submit a hash of their answer and a nonce, then reveal the answer) to prevent front-running.
Rate-limit answer submissions to prevent bot activity (e.g., enforce a minimum time between submissions, targeting <5% bot entries as per PRD NFR12).
Use SafeERC20 for all token transfers to prevent reentrancy attacks.




6. Automatic Game Finalization
Objective: Automatically end the game after the set duration, update the leaderboard, and distribute the prize pool to the main winners, along with referral rewards and creator fees.

Flow:
An internal _finalizeGame function is triggered automatically when block.timestamp > gameEndTime (checked in submitAnswer or via a public finalizeGame function for manual triggering).
Verify conditions:
Ensure gameState == InProgress (game must be active to finalize).


Update state:
Set gameState = Completed to indicate the game has ended.


Finalize Leaderboard:
For all players not yet in the leaderboard (e.g., still active), add them with their current stage, total time, and refund amount (0 if not yet refunded).
Sort the leaderboard by stage reached (descending), then by total time (ascending) for players who reached the same stage.
Include refund amounts in the leaderboard to reflect each player’s rewards (0%, 30%, 70%, or 100% of their stake, plus any prize pool share for winners).


Payout Distribution:
Prize Pool for Main Winners:
Calculate the total stakes: totalStakes = stakeAmount * playerCount.
Calculate the creator fee: creatorFeeAmount = totalStakes * creatorFee / 100.
Calculate the prize pool: prizePool = totalStakes + creatorFeeAmount.
If there are winners (players in the winners array):
Split the prizePool equally among the winners (up to 3).
For each winner, transfer their share of the prize pool using SafeERC20 (gasless).
Note: Winners already received their 100% refund upon completing Stage 3; this is an additional reward.


If there are no winners (no one completed Stage 3), the prizePool remains in the contract (or can be transferred to the creator, depending on future requirements).


Referral Rewards:
For each player, calculate referral rewards: referrals[player] * 1 FRND (max 10 FRND, as per PRD FR5).
Transfer the referral rewards to the player using SafeERC20 (gasless).


Creator Fee:
Transfer the creatorFeeAmount to the creator using SafeERC20 (gasless).




Emit events:
GameEnded with the game ID, winner Basenames (if any), and their total times.
LeaderboardUpdated with the final leaderboard (player addresses, Basenames, stages reached, total times, and refund amounts).
PayoutsDistributed with winner Basenames, prize pool amounts, referral rewards, and creator fee.




Conditions:
Revert if gameState != InProgress.
Revert if any token transfer fails (e.g., insufficient contract balance).


Security:
Ensure 100% payout accuracy by double-checking all calculations (total stakes, creator fee, prize pool split, refunds).
Prevent reentrancy by using SafeERC20 for all token transfers.
Log all payouts for off-chain verification and bot detection.




7. NFT Minting for Winners
Objective: Allow the main winners (first 3 to finish) to mint gasless NFTs via NFTBadge.sol as a reward for their achievement.

Flow:
A winner calls a mintNFT function to mint their NFT badge.
Verify conditions:
Ensure gameState == Completed (NFTs can only be minted after the game ends).
Ensure the caller is in the winners array (only the top 3 winners can mint NFTs).
Ensure the caller hasn’t already minted an NFT for this game (to prevent duplicates).


Call the mint function on NFTBadge.sol, passing the winner’s address, Basename, and game metadata (e.g., game ID, stage reached, total time), executed gaslessly via ERC-4337.
Emit an NFTMinted event with the winner’s Basename, game ID, and token ID to notify the frontend.


Conditions:
Revert if gameState != Completed.
Revert if the caller is not in the winners array.
Revert if the caller has already minted an NFT for this game.


Additional Notes:
The NFT metadata will include the winner’s Basename (e.g., "alex.base’s Winner Badge") and game details, as per Task Document (Task 5).
The minting process must achieve an 80% mint rate target, as specified in the Task Document, which will be supported by UI integration.




8. ERC-4337 Gasless Transactions
Objective: Support gasless transactions for all player interactions (staking, answer submissions, payouts, and NFT minting) using ERC-4337 and Base Paymaster.

Flow:
Inherit from an ERC-4337-compatible base contract, such as OpenZeppelin’s BaseAccount, to enable gasless transactions.
Implement the validateUserOp function to validate user operations:
Verify the user operation signature to ensure authenticity.
Check that the entryPointAddress matches the expected ERC-4337 EntryPoint contract address.
Ensure the user operation targets only authorized functions (joinGame, submitAnswer, mintNFT).


Optimize gas usage to meet performance requirements:
Minimize user operation overhead by batching signature verification where possible.
Use mappings instead of arrays for state variables (e.g., playerAnswers, playerAnswerTimes) to reduce gas costs.
Ensure all contract calls complete in <2 seconds, as per PRD NFR1.


Integrate with Base Paymaster to sponsor gas fees for players:
Ensure staking, answer submissions, refunds, payouts, and NFT minting are gasless for players.




Conditions:
Revert if the user operation signature is invalid.
Revert if the entryPointAddress does not match the expected EntryPoint.
Revert if the user operation targets an unauthorized function (e.g., internal functions).


Additional Notes:
Gas optimization is critical for ERC-4337 transactions to ensure scalability, especially with multiple players submitting answers.
The Task Document (Task 7) requires gasless transactions to complete in <2 seconds, which will be tested during deployment.




9. Security and Edge Cases
Objective: Ensure the contract is secure against vulnerabilities and handles edge cases gracefully.

Security Measures:
Reentrancy Protection:
Use OpenZeppelin’s SafeERC20 for all FRND token transfers (staking, refunds, payouts, referral rewards) to prevent reentrancy attacks, as required by Task Document (Task 10).


Front-Running Prevention:
Implement a commitment scheme for answer submissions to prevent front-running:
Players first submit a hash of their answer combined with a nonce (commit phase).
Players then reveal their answer and nonce (reveal phase), which is verified against the hash.
This ensures other players cannot copy answers by observing transactions in the mempool.




Bot Prevention:
Rate-limit answer submissions to prevent bot activity (e.g., enforce a minimum time between submissions, targeting <5% bot entries as per PRD NFR12).
Log all player actions (joins, answer submissions, eliminations, payouts) for off-chain bot detection by the admin dashboard (PRD FR14).


Circuit Breaker:
Add a circuit breaker mechanism (creator-only) to pause the game in emergencies (e.g., detected exploits, network issues).
Pausing halts answer submissions and payouts but allows players to view the current state (e.g., leaderboard).


Access Control:
Restrict sensitive functions like storeQuestions to the creator.
Ensure only winners can call mintNFT.


Input Validation:
Validate all inputs (e.g., question IDs, answer indices, Basenames) to prevent invalid states.
Sanitize inputs to prevent injection attacks, as per PRD NFR7.




Edge Cases:
Timer Expiry:
If a player does not submit an answer within the 30-second QUESTION_TIMER, mark their answer as incorrect and process elimination (with appropriate refund: 0%, 30%, or 70% based on stage).


Game Ends Mid-Stage:
If the game duration ends (block.timestamp > gameEndTime) while a player is in the middle of a stage, eliminate them and add them to the leaderboard with their current stage, total time, and refund amount.


No Winners:
If no players complete all stages by the end of the game, the prize pool (total stakes + creator fee) remains in the contract (or can be transferred to the creator, pending future requirements).


Failed Token Transfers:
If a token transfer fails during a refund or payout (e.g., due to contract balance issues), allow retrying with a separate function (retryPayout) to ensure players receive their rewards.


Invalid Basenames:
If a player provides a Basename that doesn’t resolve to their address, revert early during joinGame to prevent invalid identities.


Insufficient Players:
If the game starts with fewer than 2 players (MIN_PLAYERS), it will still proceed, but the prize pool may be smaller (future iterations could add a minimum prize pool).






Development Sequence

Contract Setup and Initialization (Week 1):
Define state variables, enums, and constants (e.g., refund percentages, question timer).
Implement the constructor with input validation.
Set up inheritance for ERC-4337 compatibility.


IPFS and Question Management (Week 2):
Implement storeQuestions for IPFS hash storage and correct answer recording.
Add a retrieval function for questionsIpfsHash to support frontend display.


Player Joining and Referral System (Week 1):
Implement joinGame with Basename resolution, staking, Twitter username storage, and referral tracking.
Add validation for player eligibility and referrer limits.


Trivia Gameplay (Automated Progression) (Weeks 1–2):
Implement startGame to transition to the InProgress state.
Implement submitAnswer with automatic stage progression, elimination logic, and stage-dependent refunds (0%, 30%, 70%, 100%).
Add timing logic to track playerAnswerTimes and rank winners.


Game Finalization and Payouts (Week 3):
Implement _finalizeGame for automatic game ending after the set duration.
Update the leaderboard with stages reached, total times, and refund amounts.
Distribute the prize pool to the top 3 winners, referral rewards to players, and creator fee to the creator.


NFT Minting (Week 3):
Implement mintNFT with integration to NFTBadge.sol for the top 3 winners.
Ensure gasless minting via ERC-4337.


ERC-4337 Integration (Week 4):
Implement validateUserOp for gasless transactions.
Optimize gas usage to ensure <2s contract calls (e.g., use mappings, batch operations).


Security and Optimization (Week 4):
Add security measures (commitment scheme for answers, rate-limiting, circuit breaker).
Optimize gas usage for scalability (e.g., minimize storage writes, batch transfers).


Testing and Integration (Week 5):
Write unit tests for all functions (joining, answering, eliminations, payouts, NFT minting).
Test edge cases (e.g., timer expiry, failed transfers, no winners, bot submissions).
Run security audits using tools like Slither to identify vulnerabilities (e.g., reentrancy, access control issues).
Test integration with GameFactory.sol (game creation) and NFTBadge.sol (NFT minting).




Events

QuestionsStored(uint256 gameId, string ipfsHash):
Emitted when the creator stores the IPFS hash and correct answers for the 15 questions.
Used by the frontend to retrieve questions for display.


PlayerJoined(address player, string basename, string twitterHandle):
Emitted when a player joins the game with their Basename and Twitter username.
Used by the frontend to update the game lobby.


GameStarted(uint256 gameId, string creatorBasename, uint256 timestamp):
Emitted when the game transitions to the InProgress state.
Notifies players that they can start answering questions.


AnswerSubmitted(address player, string basename, uint256 questionId, bool isCorrect, uint256 timeTaken):
Emitted when a player submits an answer, including whether it was correct and the time taken.
Used by the frontend to update the player’s progress and display results.


PlayerEliminated(address player, string basename, uint256 stage, uint256 refundAmount):
Emitted when a player is eliminated due to a wrong answer, including the stage and refund amount.
Used by the frontend to notify the player and update the leaderboard.


GameEnded(uint256 gameId, string[] winnerBasenames, uint256[] totalTimes):
Emitted when the game ends, including the Basenames and total times of the main winners (if any).
Notifies the frontend that the game is complete.


LeaderboardUpdated(address[] players, string[] basenames, uint256[] stages, uint256[] totalTimes, uint256[] refundAmounts):
Emitted when the leaderboard is updated at the end of the game.
Used by the frontend to display final rankings, stages reached, times, and rewards.


PayoutsDistributed(string[] winnerBasenames, uint256[] prizePoolAmounts, uint256[] referralRewards, uint256 creatorFee):
Emitted when payouts are distributed, including prize pool shares for winners, referral rewards for all players, and the creator fee.
Used for transparency and auditing.


NFTMinted(string winnerBasename, uint256 gameId, uint256 tokenId):
Emitted when a winner mints an NFT badge.
Used by the frontend to display the NFT in the player’s collection.



Errors

GameNotOpen():
Thrown when trying to join a game that is not in the Open state (e.g., already started or completed).


GameNotInProgress():
Thrown when an action (e.g., submitting an answer) requires the game to be in the InProgress state.


GameEnded():
Thrown if the game duration has elapsed (block.timestamp > gameEndTime) and an action is attempted.


PlayerLimitReached():
Thrown when the maximum number of players (playerLimit) has been reached during joinGame.


EmptyTwitterHandle():
Thrown if the Twitter username provided during joinGame is empty.


InvalidBasename():
Thrown if the Basename provided during joinGame does not resolve to the player’s address.


QuestionTimerExpired():
Thrown if an answer is submitted after the 30-second timer for the question.


ReferralLimitReached():
Thrown if a referrer has already reached the maximum of 10 referrals.


QuestionsNotSet():
Thrown if the game tries to start (startGame) but the questions have not been set.


Unauthorized():
Thrown if a non-creator tries to call a creator-only function (e.g., storeQuestions).


NotAWinner():
Thrown if a player who is not in the winners array tries to mint an NFT.


AlreadyMinted():
Thrown if a winner tries to mint an NFT more than once for the same game.




Future Considerations

Configurable Question Timer:
Currently fixed at 30 seconds, but the PRD (US8) allows creators to set timers between 15–40 seconds. Future iterations can make QUESTION_TIMER a configurable parameter set during game creation.


Advanced Bot Prevention:
Integrate an oracle or off-chain backend for more sophisticated bot detection (e.g., CAPTCHA, behavioral analysis) to further reduce bot entries below 5% (PRD NFR12).


Bonus Points for Speed:
Add bonus points or additional rewards for players who answer questions faster within the 30-second window, enhancing the competitive element.


Multi-Language Support:
Support questions in multiple languages, as suggested in PRD (FE3), to broaden the game’s accessibility.


Upgradeability:
Use OpenZeppelin’s upgradeable contracts to allow future updates to the game mechanics (e.g., adjusting refund percentages, adding new features).


Prize Pool Distribution for No Winners:
Currently, the prize pool remains in the contract if no one completes Stage 3. Future iterations could distribute it to the creator or roll it over to a future game.




Timeline

Week 1: Contract setup, player joining, referral system, and basic gameplay structure.
Define state variables, enums, and constants.
Implement joinGame and startGame.


Week 2: Question management, answer submission, and automated progression.
Implement storeQuestions and submitAnswer.
Add logic for eliminations, refunds (0%, 30%, 70%, 100%), and winner ranking.


Week 3: Game finalization, leaderboard updates, and payouts.
Implement _finalizeGame for automatic game ending.
Update the leaderboard and distribute prize pool, referral rewards, and creator fee.
Add NFT minting for winners.


Week 4: ERC-4337 integration, security measures, and gas optimization.
Implement gasless transactions with validateUserOp.
Add security features (commitment scheme, rate-limiting, circuit breaker).
Optimize gas usage for scalability.


Week 5: Testing, security audits, and integration.
Write comprehensive unit tests for all functions.
Test edge cases and security vulnerabilities.
Integrate with GameFactory.sol and NFTBadge.sol.




Dependencies and Coordination

AI Engineer:
Coordinate for the IPFS hash format (questionsIpfsHash) and question structure (15 questions, 4 options each, correct answer index 0–3), as per Task Document (Task 8).
Ensure the IPFS hash is retrievable by the frontend for question display.


Frontend Developer:
Provide the questionsIpfsHash and events (AnswerSubmitted, PlayerEliminated, LeaderboardUpdated) for UI updates.
Ensure the UI supports displaying Basenames (up to 63 characters, PRD NFR9) in the game lobby, question interface, leaderboard, and NFT collection.
Support gasless transactions via Smart Wallet integration (PRD FR8).


Backend Developer:
Integrate contract ABIs for /analyze and /questions/{gameId} endpoints (PRD Section 5.2).
Log player actions for bot detection (PRD FR14).


Project Manager:
Coordinate testing with 5-10 mock players by April 28, 2025, and 50 players by April 29, 2025, as per Task Document (Section 5).
Ensure Base Sepolia testnet, Base Paymaster, and ENS resolver are available.




Success Metrics

Functionality:
Players can join the game, submit answers, and progress through stages automatically.
Eliminations trigger correct refunds: 0% for Stage 1, 30% for Stage 2, 70% for Stage 3, 100% for Stage 3 completion.
The first 3 players to complete all stages, ranked by shortest time, are correctly identified as winners and split the prize pool.
IPFS hashes are stored and retrievable for frontend display.
Basenames are resolved and displayed in all interactions.
Gasless transactions work for staking, answer submissions, refunds, payouts, and NFT minting.


Accuracy:
100% payout accuracy for refunds, prize pool distribution, referral rewards, and creator fee (PRD NFR6, Task Document Task 4).


Security:
No vulnerabilities (e.g., reentrancy, front-running, unauthorized access), as per Task Document (Task 10).
Bot entries are kept below 5% through rate-limiting and logging (PRD NFR12).


Performance:
Contract calls (e.g., answer submissions, payouts) complete in <2 seconds (PRD NFR1).
Question retrieval from IPFS completes in <2 seconds (PRD NFR1).


Integration:
Basenames resolve correctly in all interactions (PRD FR7, Task Document Task 6).
Gasless transactions are supported via Smart Wallet (PRD FR8, Task Document Task 7).
IPFS hashes are stored and retrievable (PRD FR11, Task Document Task 8).



