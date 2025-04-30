const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameInstance Contract - Step 3: Game Logic", function () {
  let GameInstance;
  let gameInstance;
  let owner, player1, player2, player3;
  let FriendToken;
  let friendToken;
  let mockResolverAddress;
  let mockEntryPointAddress;
  let deploymentTimestamp;

  // Constants for deployment
  const GAME_ID = 1;
  const STAKE_AMOUNT = ethers.parseEther("50");
  const PLAYER_LIMIT = 5;
  const CREATOR_BASENAME = "creator.base.eth";
  const METADATA_IPFS_HASH = "QmValidIpfsHash1234567890abcdef1234567890abcdef";
  const RESOLVER_ADDRESS = "0x0000000000000000000000000000000000000001";
  const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const PLAYER_BASENAME = "player.base.eth";
  const TWITTER_HANDLE = "player_twitter";
  const QUESTIONS_IPFS_HASH = "QmQuestionsIpfsHash1234567890abcdef1234567890";

  beforeEach(async function () {
    // Get signers
    [owner, player1, player2, player3] = await ethers.getSigners();

    // Deploy a mock FriendToken contract
    FriendToken = await ethers.getContractFactory("FriendToken");
    friendToken = await FriendToken.deploy(owner.address, ethers.parseEther("10000"));
    await friendToken.waitForDeployment();

    // Mint tokens to players for staking
    await friendToken.mint(player1.address, ethers.parseEther("1000"));
    await friendToken.mint(player2.address, ethers.parseEther("1000"));
    await friendToken.mint(player3.address, ethers.parseEther("1000"));

    // Use addresses from deployment script
    mockResolverAddress = RESOLVER_ADDRESS;
    mockEntryPointAddress = ENTRY_POINT_ADDRESS;

    // Deploy the GameInstance contract
    GameInstance = await ethers.getContractFactory("GameInstance");
    gameInstance = await GameInstance.deploy(
      friendToken.target,
      owner.address,
      GAME_ID,
      STAKE_AMOUNT,
      PLAYER_LIMIT,
      CREATOR_BASENAME,
      METADATA_IPFS_HASH,
      mockResolverAddress,
      mockEntryPointAddress
    );

    // Get the deployment transaction receipt to extract the block timestamp
    const deploymentTx = gameInstance.deploymentTransaction();
    const receipt = await deploymentTx.wait();
    deploymentTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
  });

  describe("Deployment and State Variable Initialization", function () {
    it("should deploy the contract and initialize state variables correctly", async function () {
      expect(await gameInstance.token()).to.equal(friendToken.target);
      expect(await gameInstance.creator()).to.equal(owner.address);
      expect(await gameInstance.gameId()).to.equal(GAME_ID);
      expect(await gameInstance.stakeAmount()).to.equal(STAKE_AMOUNT);
      expect(await gameInstance.playerLimit()).to.equal(PLAYER_LIMIT);
      expect(await gameInstance.basename()).to.equal(CREATOR_BASENAME);
      expect(await gameInstance.metadataIpfsHash()).to.equal(METADATA_IPFS_HASH);
      expect(await gameInstance.resolverAddress()).to.equal(mockResolverAddress);
      expect(await gameInstance.entryPointAddress()).to.equal(mockEntryPointAddress);
      expect(await gameInstance.createdAt()).to.equal(deploymentTimestamp);
      expect(await gameInstance.gameState()).to.equal(0); // GameState.Open
      expect(await gameInstance.playerCount()).to.equal(0);
      expect(await gameInstance.questionsIpfsHash()).to.equal("");
    });

    it("should initialize constants correctly", async function () {
      expect(await gameInstance.TOTAL_QUESTIONS()).to.equal(15);
      expect(await gameInstance.MIN_STAKE()).to.equal(ethers.parseEther("10"));
      expect(await gameInstance.MAX_STAKE()).to.equal(ethers.parseEther("100"));
      expect(await gameInstance.MIN_PLAYERS()).to.equal(2);
      expect(await gameInstance.MAX_PLAYERS()).to.equal(10);
      expect(await gameInstance.QUESTION_TIME_LIMIT()).to.equal(30);
    });
  });

  describe("Input Validation", function () {
    it("should revert if tokenAddress is zero", async function () {
      await expect(
        GameInstance.deploy(
          ethers.ZeroAddress,
          owner.address,
          GAME_ID,
          STAKE_AMOUNT,
          PLAYER_LIMIT,
          CREATOR_BASENAME,
          METADATA_IPFS_HASH,
          mockResolverAddress,
          mockEntryPointAddress
        )
      ).to.be.revertedWithCustomError(GameInstance, "InvalidAddress");
    });

    it("should revert if creator is zero", async function () {
      await expect(
        GameInstance.deploy(
          friendToken.target,
          ethers.ZeroAddress,
          GAME_ID,
          STAKE_AMOUNT,
          PLAYER_LIMIT,
          CREATOR_BASENAME,
          METADATA_IPFS_HASH,
          mockResolverAddress,
          mockEntryPointAddress
        )
      ).to.be.revertedWithCustomError(GameInstance, "InvalidAddress");
    });

    it("should allow zero resolver and entry point addresses", async function () {
      const instance = await GameInstance.deploy(
        friendToken.target,
        owner.address,
        GAME_ID,
        STAKE_AMOUNT,
        PLAYER_LIMIT,
        CREATOR_BASENAME,
        METADATA_IPFS_HASH,
        ethers.ZeroAddress,
        ethers.ZeroAddress
      );
      await instance.deploymentTransaction().wait();
      expect(await instance.resolverAddress()).to.equal(ethers.ZeroAddress);
      expect(await instance.entryPointAddress()).to.equal(ethers.ZeroAddress);
    });

    it("should revert if stakeAmount is too low", async function () {
      const invalidStakeAmount = ethers.parseEther("5");
      await expect(
        GameInstance.deploy(
          friendToken.target,
          owner.address,
          GAME_ID,
          invalidStakeAmount,
          PLAYER_LIMIT,
          CREATOR_BASENAME,
          METADATA_IPFS_HASH,
          mockResolverAddress,
          mockEntryPointAddress
        )
      ).to.be.revertedWithCustomError(GameInstance, "InvalidStakeAmount");
    });

    it("should revert if stakeAmount is too high", async function () {
      const invalidStakeAmount = ethers.parseEther("150");
      await expect(
        GameInstance.deploy(
          friendToken.target,
          owner.address,
          GAME_ID,
          invalidStakeAmount,
          PLAYER_LIMIT,
          CREATOR_BASENAME,
          METADATA_IPFS_HASH,
          mockResolverAddress,
          mockEntryPointAddress
        )
      ).to.be.revertedWithCustomError(GameInstance, "InvalidStakeAmount");
    });

    it("should revert if playerLimit is too low", async function () {
      const invalidPlayerLimit = 1;
      await expect(
        GameInstance.deploy(
          friendToken.target,
          owner.address,
          GAME_ID,
          STAKE_AMOUNT,
          invalidPlayerLimit,
          CREATOR_BASENAME,
          METADATA_IPFS_HASH,
          mockResolverAddress,
          mockEntryPointAddress
        )
      ).to.be.revertedWithCustomError(GameInstance, "InvalidPlayerLimit");
    });

    it("should revert if playerLimit is too high", async function () {
      const invalidPlayerLimit = 11;
      await expect(
        GameInstance.deploy(
          friendToken.target,
          owner.address,
          GAME_ID,
          STAKE_AMOUNT,
          invalidPlayerLimit,
          CREATOR_BASENAME,
          METADATA_IPFS_HASH,
          mockResolverAddress,
          mockEntryPointAddress
        )
      ).to.be.revertedWithCustomError(GameInstance, "InvalidPlayerLimit");
    });

    it("should revert if basename is empty", async function () {
      await expect(
        GameInstance.deploy(
          friendToken.target,
          owner.address,
          GAME_ID,
          STAKE_AMOUNT,
          PLAYER_LIMIT,
          "",
          METADATA_IPFS_HASH,
          mockResolverAddress,
          mockEntryPointAddress
        )
      ).to.be.revertedWithCustomError(GameInstance, "InvalidBasename");
    });
  });

  describe("Join Game", function () {
    it("should allow a player to join the game", async function () {
      await friendToken.connect(player1).approve(gameInstance.target, STAKE_AMOUNT);
      await expect(
        gameInstance.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE)
      )
        .to.emit(gameInstance, "PlayerJoined")
        .withArgs(player1.address, PLAYER_BASENAME, TWITTER_HANDLE);

      expect(await gameInstance.players(player1.address)).to.equal(PLAYER_BASENAME);
      expect(await gameInstance.playerStakes(player1.address)).to.equal(STAKE_AMOUNT);
      expect(await gameInstance.playerTwitterHandles(player1.address)).to.equal(TWITTER_HANDLE);
      expect(await gameInstance.playerCount()).to.equal(1);
      expect(await friendToken.balanceOf(gameInstance.target)).to.equal(STAKE_AMOUNT);

      const firstPlayer = await gameInstance.playerList(0);
      expect(firstPlayer).to.equal(player1.address);
    });

    it("should revert if game is not open", async function () {
      await friendToken.connect(player1).approve(gameInstance.target, STAKE_AMOUNT);
      await friendToken.connect(player2).approve(gameInstance.target, STAKE_AMOUNT);
      await gameInstance.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE);
      await gameInstance.connect(player2).joinGame("player2.base.eth", "player2_twitter");

      const correctAnswers = Array(15).fill(1);
      await gameInstance.connect(owner).setQuestions(QUESTIONS_IPFS_HASH, correctAnswers);
      await gameInstance.connect(owner).startGame();

      await friendToken.connect(player3).approve(gameInstance.target, STAKE_AMOUNT);
      await expect(
        gameInstance.connect(player3).joinGame("player3.base.eth", "player3_twitter")
      ).to.be.revertedWithCustomError(gameInstance, "GameNotOpen");
    });

    it("should revert if player has already joined", async function () {
      await friendToken.connect(player1).approve(gameInstance.target, STAKE_AMOUNT);
      await gameInstance.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE);

      await expect(
        gameInstance.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE)
      ).to.be.revertedWithCustomError(gameInstance, "AlreadyJoined");
    });

    it("should revert if player limit is reached", async function () {
      const newGame = await GameInstance.deploy(
        friendToken.target,
        owner.address,
        GAME_ID,
        STAKE_AMOUNT,
        2, // Player limit of 2
        CREATOR_BASENAME,
        METADATA_IPFS_HASH,
        mockResolverAddress,
        mockEntryPointAddress
      );
      await newGame.deploymentTransaction().wait();

      await friendToken.connect(player1).approve(newGame.target, STAKE_AMOUNT);
      await friendToken.connect(player2).approve(newGame.target, STAKE_AMOUNT);
      await newGame.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE);
      await newGame.connect(player2).joinGame("player2.base.eth", "player2_twitter");

      await friendToken.connect(player3).approve(newGame.target, STAKE_AMOUNT);
      await expect(
        newGame.connect(player3).joinGame("player3.base.eth", "player3_twitter")
      ).to.be.revertedWithCustomError(newGame, "PlayerLimitReached");
    });

    it("should revert if basename is empty", async function () {
      await friendToken.connect(player1).approve(gameInstance.target, STAKE_AMOUNT);
      await expect(
        gameInstance.connect(player1).joinGame("", TWITTER_HANDLE)
      ).to.be.revertedWithCustomError(gameInstance, "InvalidBasename");
    });

    it("should revert if Twitter handle is empty", async function () {
      await friendToken.connect(player1).approve(gameInstance.target, STAKE_AMOUNT);
      await expect(
        gameInstance.connect(player1).joinGame(PLAYER_BASENAME, "")
      ).to.be.revertedWithCustomError(gameInstance, "EmptyTwitterHandle");
    });

    it("should revert if insufficient stake approval", async function () {
      await expect(
        gameInstance.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE)
      ).to.be.revertedWithCustomError(gameInstance, "InsufficientStake");
    });

    it("should revert if token transfer fails", async function () {
      const MockToken = await ethers.getContractFactory("MockFailingToken");
      const mockToken = await MockToken.deploy(owner.address, ethers.parseEther("10000"));
      await mockToken.waitForDeployment();

      await mockToken.mint(player1.address, ethers.parseEther("1000"));

      const newGame = await GameInstance.deploy(
        mockToken.target,
        owner.address,
        GAME_ID,
        STAKE_AMOUNT,
        PLAYER_LIMIT,
        CREATOR_BASENAME,
        METADATA_IPFS_HASH,
        mockResolverAddress,
        mockEntryPointAddress
      );
      await newGame.deploymentTransaction().wait();

      await mockToken.connect(player1).approve(newGame.target, STAKE_AMOUNT);

      await expect(
        newGame.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE)
      ).to.be.revertedWithCustomError(newGame, "TransferFailed");
    });
  });

  describe("Set Questions", function () {
    it("should allow creator to set questions", async function () {
      const correctAnswers = Array(15).fill(1);
      await expect(
        gameInstance.connect(owner).setQuestions(QUESTIONS_IPFS_HASH, correctAnswers)
      )
        .to.emit(gameInstance, "QuestionsStored")
        .withArgs(GAME_ID, QUESTIONS_IPFS_HASH);

      expect(await gameInstance.questionsIpfsHash()).to.equal(QUESTIONS_IPFS_HASH);
      for (let i = 1; i <= 15; i++) {
        expect(await gameInstance.correctAnswers(i)).to.equal(1);
      }
    });

    it("should revert if caller is not creator", async function () {
      const correctAnswers = Array(15).fill(1);
      await expect(
        gameInstance.connect(player1).setQuestions(QUESTIONS_IPFS_HASH, correctAnswers)
      ).to.be.revertedWithCustomError(gameInstance, "Unauthorized");
    });

    it("should revert if game is not open", async function () {
      await friendToken.connect(player1).approve(gameInstance.target, STAKE_AMOUNT);
      await friendToken.connect(player2).approve(gameInstance.target, STAKE_AMOUNT);
      await gameInstance.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE);
      await gameInstance.connect(player2).joinGame("player2.base.eth", "player2_twitter");

      const correctAnswers = Array(15).fill(1);
      await gameInstance.connect(owner).setQuestions(QUESTIONS_IPFS_HASH, correctAnswers);
      await gameInstance.connect(owner).startGame();

      await expect(
        gameInstance.connect(owner).setQuestions(QUESTIONS_IPFS_HASH, correctAnswers)
      ).to.be.revertedWithCustomError(gameInstance, "GameNotOpen");
    });

    it("should revert if IPFS hash is empty", async function () {
      const correctAnswers = Array(15).fill(1);
      await expect(
        gameInstance.connect(owner).setQuestions("", correctAnswers)
      ).to.be.revertedWithCustomError(gameInstance, "InvalidBasename");
    });

    it("should revert if incorrect number of answers", async function () {
      const correctAnswers = Array(14).fill(1);
      await expect(
        gameInstance.connect(owner).setQuestions(QUESTIONS_IPFS_HASH, correctAnswers)
      ).to.be.revertedWithCustomError(gameInstance, "InvalidQuestionCount");
    });

    it("should revert if answers are invalid", async function () {
      const correctAnswers = Array(15).fill(4);
      await expect(
        gameInstance.connect(owner).setQuestions(QUESTIONS_IPFS_HASH, correctAnswers)
      ).to.be.revertedWithCustomError(gameInstance, "InvalidQuestionCount");
    });
  });

  describe("Start Game", function () {
    beforeEach(async function () {
      await friendToken.connect(player1).approve(gameInstance.target, STAKE_AMOUNT);
      await friendToken.connect(player2).approve(gameInstance.target, STAKE_AMOUNT);
      await gameInstance.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE);
      await gameInstance.connect(player2).joinGame("player2.base.eth", "player2_twitter");

      const correctAnswers = Array(15).fill(1);
      await gameInstance.connect(owner).setQuestions(QUESTIONS_IPFS_HASH, correctAnswers);
    });

    it("should allow creator to start the game", async function () {
      const startTx = await gameInstance.connect(owner).startGame();
      const receipt = await startTx.wait();
      const startTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      expect(await gameInstance.gameState()).to.equal(1); // GameState.InProgress

      await expect(startTx)
        .to.emit(gameInstance, "GameStarted")
        .withArgs(GAME_ID, CREATOR_BASENAME, startTimestamp);
    });

    it("should revert if caller is not creator", async function () {
      await expect(
        gameInstance.connect(player1).startGame()
      ).to.be.revertedWithCustomError(gameInstance, "Unauthorized");
    });

    it("should revert if game is not open", async function () {
      await gameInstance.connect(owner).startGame();
      await expect(
        gameInstance.connect(owner).startGame()
      ).to.be.revertedWithCustomError(gameInstance, "GameNotOpen");
    });

    it("should revert if not enough players", async function () {
      const newGame = await GameInstance.deploy(
        friendToken.target,
        owner.address,
        GAME_ID,
        STAKE_AMOUNT,
        PLAYER_LIMIT,
        CREATOR_BASENAME,
        METADATA_IPFS_HASH,
        mockResolverAddress,
        mockEntryPointAddress
      );
      await newGame.deploymentTransaction().wait();

      await friendToken.connect(player1).approve(newGame.target, STAKE_AMOUNT);
      await newGame.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE);

      const correctAnswers = Array(15).fill(1);
      await newGame.connect(owner).setQuestions(QUESTIONS_IPFS_HASH, correctAnswers);

      await expect(
        newGame.connect(owner).startGame()
      ).to.be.revertedWithCustomError(newGame, "PlayerLimitReached");
    });

    it("should revert if questions not set", async function () {
      const newGame = await GameInstance.deploy(
        friendToken.target,
        owner.address,
        GAME_ID,
        STAKE_AMOUNT,
        PLAYER_LIMIT,
        CREATOR_BASENAME,
        METADATA_IPFS_HASH,
        mockResolverAddress,
        mockEntryPointAddress
      );
      await newGame.deploymentTransaction().wait();

      await friendToken.connect(player1).approve(newGame.target, STAKE_AMOUNT);
      await friendToken.connect(player2).approve(newGame.target, STAKE_AMOUNT);
      await newGame.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE);
      await newGame.connect(player2).joinGame("player2.base.eth", "player2_twitter");

      await expect(
        newGame.connect(owner).startGame()
      ).to.be.revertedWithCustomError(newGame, "QuestionsNotSet");
    });
  });

  describe("Get Game Details", function () {
    beforeEach(async function () {
      await friendToken.connect(player1).approve(gameInstance.target, STAKE_AMOUNT);
      await gameInstance.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE);
    });

    it("should return correct game ID", async function () {
      expect(await gameInstance.gameId()).to.equal(GAME_ID);
    });

    it("should return correct creator address", async function () {
      expect(await gameInstance.creator()).to.equal(owner.address);
    });

    it("should return correct basename", async function () {
      expect(await gameInstance.basename()).to.equal(CREATOR_BASENAME);
    });

    it("should return correct metadata IPFS hash", async function () {
      expect(await gameInstance.metadataIpfsHash()).to.equal(METADATA_IPFS_HASH);
    });

    it("should return correct creation timestamp", async function () {
      expect(await gameInstance.createdAt()).to.equal(deploymentTimestamp);
    });

    it("should return correct player count", async function () {
      expect(await gameInstance.playerCount()).to.equal(1);
    });

    it("should return correct game state", async function () {
      expect(await gameInstance.gameState()).to.equal(0); // GameState.Open
    });

    it("should return correct player Twitter handle", async function () {
      expect(await gameInstance.playerTwitterHandles(player1.address)).to.equal(TWITTER_HANDLE);
    });
  });

  describe("Stage 4: Answer Submission and Game Progression", function () {
    beforeEach(async function () {
      await friendToken.connect(player1).approve(gameInstance.target, STAKE_AMOUNT);
      await friendToken.connect(player2).approve(gameInstance.target, STAKE_AMOUNT);
      await friendToken.connect(player3).approve(gameInstance.target, STAKE_AMOUNT);
      await gameInstance.connect(player1).joinGame(PLAYER_BASENAME, TWITTER_HANDLE);
      await gameInstance.connect(player2).joinGame("player2.base.eth", "player2_twitter");
      await gameInstance.connect(player3).joinGame("player3.base.eth", "player3_twitter");

      const correctAnswers = Array(15).fill(1);
      await gameInstance.connect(owner).setQuestions(QUESTIONS_IPFS_HASH, correctAnswers);
      await gameInstance.connect(owner).startGame();
    });

    it("should allow a player to submit a correct answer", async function () {
      await expect(gameInstance.connect(player1).submitAnswer(1))
        .to.emit(gameInstance, "AnswerSubmitted")
        .withArgs(player1.address, 1, 1, true);

      expect(await gameInstance.playerProgress(player1.address)).to.equal(2);
      expect(await gameInstance.playerScores(player1.address)).to.equal(1);
      expect(await gameInstance.eliminatedPlayers(player1.address)).to.be.false;
    });

    it("should eliminate a player for an incorrect answer", async function () {
      await expect(gameInstance.connect(player1).submitAnswer(2))
        .to.emit(gameInstance, "AnswerSubmitted")
        .withArgs(player1.address, 1, 2, false)
        .to.emit(gameInstance, "PlayerEliminated")
        .withArgs(player1.address, "IncorrectAnswer");

      expect(await gameInstance.eliminatedPlayers(player1.address)).to.be.true;
      expect(await gameInstance.playerScores(player1.address)).to.equal(0);
    });

    it("should eliminate a player for exceeding the time limit", async function () {
      // Submit an initial answer to set the start time
      await gameInstance.connect(player1).submitAnswer(1);
  
      // Fast-forward time by 31 seconds (past the 30-second limit)
      await ethers.provider.send("evm_increaseTime", [31]);
      await ethers.provider.send("evm_mine");
  
      await expect(gameInstance.connect(player1).submitAnswer(1))
          .to.emit(gameInstance, "PlayerEliminated")
          .withArgs(player1.address, "TimeLimitExceeded");
  
      expect(await gameInstance.eliminatedPlayers(player1.address)).to.be.true;
  });

  it("should allow checkTimeout to eliminate a player", async function () {
    // Submit an initial answer to set the start time
    await gameInstance.connect(player1).submitAnswer(1);

    // Fast-forward time by 31 seconds
    await ethers.provider.send("evm_increaseTime", [31]);
    await ethers.provider.send("evm_mine");

    await expect(gameInstance.connect(owner).checkTimeout(player1.address))
        .to.emit(gameInstance, "PlayerEliminated")
        .withArgs(player1.address, "TimeLimitExceeded");

    expect(await gameInstance.eliminatedPlayers(player1.address)).to.be.true;
});

    it("should end the game when only one player remains", async function () {
      // Player 1 and Player 2 answer incorrectly
      await gameInstance.connect(player1).submitAnswer(2); // Incorrect
      await gameInstance.connect(player2).submitAnswer(2); // Incorrect

      // Player 3 should be the last remaining player
      const totalPrize = STAKE_AMOUNT * 3n; // 3 players
      const player3BalanceBefore = await friendToken.balanceOf(player3.address);

      await expect(gameInstance.connect(player3).submitAnswer(1))
        .to.emit(gameInstance, "GameEnded")
        .withArgs(player3.address, totalPrize);

      expect(await gameInstance.gameState()).to.equal(2); // GameState.Ended
      const player3BalanceAfter = await friendToken.balanceOf(player3.address);
      expect(player3BalanceAfter).to.equal(player3BalanceBefore + totalPrize);
    });

    it("should end the game when all players finish all questions", async function () {
      const totalPrize = STAKE_AMOUNT * 3n; // 3 players
      const player1BalanceBefore = await friendToken.balanceOf(player1.address);
  
      for (let i = 0; i < 14; i++) {
          await gameInstance.connect(player1).submitAnswer(1);
          await gameInstance.connect(player2).submitAnswer(1);
          await gameInstance.connect(player3).submitAnswer(1);
      }
  
      // The last submission should end the game
      await gameInstance.connect(player1).submitAnswer(1);
      await gameInstance.connect(player2).submitAnswer(1);
      await expect(gameInstance.connect(player3).submitAnswer(1))
          .to.emit(gameInstance, "GameEnded")
          .withArgs(player1.address, totalPrize);
  
      expect(await gameInstance.gameState()).to.equal(2); // GameState.Ended
      const player1BalanceAfter = await friendToken.balanceOf(player1.address);
      expect(player1BalanceAfter).to.equal(player1BalanceBefore + totalPrize);
  });

    it("should revert if game is not in progress", async function () {
      const newGame = await GameInstance.deploy(
        friendToken.target,
        owner.address,
        GAME_ID,
        STAKE_AMOUNT,
        PLAYER_LIMIT,
        CREATOR_BASENAME,
        METADATA_IPFS_HASH,
        mockResolverAddress,
        mockEntryPointAddress
      );
      await newGame.deploymentTransaction().wait();

      await expect(
        newGame.connect(player1).submitAnswer(1)
      ).to.be.revertedWithCustomError(newGame, "GameNotInProgress");
    });

    it("should revert if caller is not a player", async function () {
      await expect(
        gameInstance.connect(owner).submitAnswer(1)
      ).to.be.revertedWithCustomError(gameInstance, "NotAPlayer");
    });

    it("should revert if player is eliminated", async function () {
      await gameInstance.connect(player1).submitAnswer(2); // Incorrect, gets eliminated
      await expect(
        gameInstance.connect(player1).submitAnswer(1)
      ).to.be.revertedWithCustomError(gameInstance, "AlreadyEliminated");
    });

    it("should revert if answer is invalid", async function () {
      await expect(
        gameInstance.connect(player1).submitAnswer(4)
      ).to.be.revertedWithCustomError(gameInstance, "InvalidAnswer");
    });
  });
});