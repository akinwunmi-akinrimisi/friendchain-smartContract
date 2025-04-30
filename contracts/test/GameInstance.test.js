const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameInstance Contract - Step 2: Constructor and Validation", function () {
  let GameInstance;
  let gameInstance;
  let owner;
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
  const IPFS_HASH = "QmValidIpfsHash1234567890abcdef1234567890abcdef";
  const RESOLVER_ADDRESS = "0x0000000000000000000000000000000000000001";
  const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  beforeEach(async function () {
    // Get signers (owner will act as the creator)
    [owner] = await ethers.getSigners();

    // Deploy a mock FriendToken contract
    FriendToken = await ethers.getContractFactory("FriendToken");
    friendToken = await FriendToken.deploy(owner.address, ethers.parseEther("10000"));
    await friendToken.waitForDeployment();

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
      IPFS_HASH,
      mockResolverAddress,
      mockEntryPointAddress
    );

    // Get the deployment transaction receipt to extract the block timestamp
    const deploymentTx = gameInstance.deploymentTransaction();
    const receipt = await deploymentTx.wait();
    deploymentTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
  });

  describe("Deployment and State Variable Initialization", function () {
    it("should deploy the contract and initialize existing state variables correctly", async function () {
      // Verify state variables set by constructor
      expect(await gameInstance.tokenAddress()).to.equal(friendToken.target);
      expect(await gameInstance.creator()).to.equal(owner.address);
      expect(await gameInstance.gameId()).to.equal(GAME_ID);
      expect(await gameInstance.stakeAmount()).to.equal(STAKE_AMOUNT);
      expect(await gameInstance.playerLimit()).to.equal(PLAYER_LIMIT);
      expect(await gameInstance.basename()).to.equal(CREATOR_BASENAME);
      expect(await gameInstance.ipfsHash()).to.equal(IPFS_HASH);
      expect(await gameInstance.resolverAddress()).to.equal(mockResolverAddress);
      expect(await gameInstance.entryPointAddress()).to.equal(mockEntryPointAddress);
      expect(await gameInstance.createdAt()).to.equal(deploymentTimestamp);
      expect(await gameInstance.creatorFee()).to.equal(0);
      expect(await gameInstance.gameDuration()).to.equal(0);
      expect(await gameInstance.gameEndTime()).to.equal(0);
      expect(await gameInstance.nftBadgeAddress()).to.equal(ethers.ZeroAddress);
      expect(await gameInstance.gameState()).to.equal(0); // GameState.Open
      expect(await gameInstance.playerCount()).to.equal(0);
      expect(await gameInstance.questionsIpfsHash()).to.equal("");
    });

    it("should initialize constants correctly", async function () {
      expect(await gameInstance.QUESTION_TIMER()).to.equal(30);
      expect(await gameInstance.QUESTIONS_PER_STAGE()).to.equal(5);
      expect(await gameInstance.TOTAL_QUESTIONS()).to.equal(15);
      expect(await gameInstance.MAX_WINNERS()).to.equal(3);
      expect(await gameInstance.STAGE_1_REFUND_PERCENTAGE()).to.equal(0);
      expect(await gameInstance.STAGE_2_REFUND_PERCENTAGE()).to.equal(30);
      expect(await gameInstance.STAGE_3_REFUND_PERCENTAGE()).to.equal(70);
      expect(await gameInstance.STAGE_3_COMPLETION_REFUND_PERCENTAGE()).to.equal(100);
      expect(await gameInstance.MIN_STAKE()).to.equal(ethers.parseEther("10"));
      expect(await gameInstance.MAX_STAKE()).to.equal(ethers.parseEther("100"));
      expect(await gameInstance.MIN_PLAYERS()).to.equal(2);
      expect(await gameInstance.MAX_PLAYERS()).to.equal(10);
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
          IPFS_HASH,
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
          IPFS_HASH,
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
        IPFS_HASH,
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
          IPFS_HASH,
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
          IPFS_HASH,
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
          IPFS_HASH,
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
          IPFS_HASH,
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
          IPFS_HASH,
          mockResolverAddress,
          mockEntryPointAddress
        )
      ).to.be.revertedWithCustomError(GameInstance, "InvalidBasename");
    });
  });

  describe("Storage Layout", function () {
    it("should initialize mappings and arrays as empty", async function () {
      // Test mappings
      expect(await gameInstance.players(owner.address)).to.equal("");
      expect(await gameInstance.playerStakes(owner.address)).to.equal(0);
      expect(await gameInstance.playerTwitterHandles(owner.address)).to.equal("");
      expect(await gameInstance.playerProgress(owner.address)).to.equal(0);
      expect(await gameInstance.playerAnswers(owner.address, 1)).to.equal(0);
      expect(await gameInstance.playerAnswerTimes(owner.address)).to.equal(0);
      expect(await gameInstance.playerQuestionTimes(owner.address, 1)).to.equal(0);
      expect(await gameInstance.eliminatedPlayers(owner.address)).to.equal(false);
      expect(await gameInstance.referrals(owner.address)).to.equal(0);
      expect(await gameInstance.referredBy(owner.address)).to.equal(ethers.ZeroAddress);
      expect(await gameInstance.correctAnswers(1)).to.equal(0);

      // Test arrays
      const winnersLength = Number(await gameInstance.winners.length);
      expect(winnersLength).to.equal(0);

      const leaderboardLength = Number(await gameInstance.leaderboard.length);
      expect(leaderboardLength).to.equal(0);
    });
  });
});