const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameFactory", function () {
  let GameFactory;
  let gameFactory;
  let owner, creator, unauthorizedUser;
  let FriendToken;
  let friendToken;
  let mockResolverAddress;
  let mockEntryPointAddress;

  const RESOLVER_ADDRESS = "0x0000000000000000000000000000000000000001";
  const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const TWITTER_USERNAME = "creator_twitter";
  const BASENAME = "creator.base.eth";
  const METADATA_IPFS_HASH = "QmValidIpfsHash1234567890abcdef1234567890abcdef";
  const GAME_ID = 1;
  const STAKE_AMOUNT = ethers.parseEther("50");
  const PLAYER_LIMIT = 5;

  beforeEach(async function () {
    [owner, creator, unauthorizedUser] = await ethers.getSigners();

    FriendToken = await ethers.getContractFactory("FriendToken");
    friendToken = await FriendToken.deploy(owner.address, ethers.parseEther("10000"));
    await friendToken.waitForDeployment();

    mockResolverAddress = RESOLVER_ADDRESS;
    mockEntryPointAddress = ENTRY_POINT_ADDRESS;

    GameFactory = await ethers.getContractFactory("GameFactory");
    gameFactory = await GameFactory.deploy(
      friendToken.target,
      owner.address,
      mockResolverAddress,
      mockEntryPointAddress
    );
    await gameFactory.deploymentTransaction().wait();
  });

  describe("Constructor", function () {
    it("Should initialize correctly with valid inputs", async function () {
      expect(await gameFactory.tokenAddress()).to.equal(friendToken.target);
      expect(await gameFactory.owner()).to.equal(owner.address);
      expect(await gameFactory.resolverAddress()).to.equal(mockResolverAddress);
      expect(await gameFactory.entryPointAddress()).to.equal(mockEntryPointAddress);
    });

    it("Should revert if token address is zero", async function () {
      await expect(
        GameFactory.deploy(
          ethers.ZeroAddress,
          owner.address,
          mockResolverAddress,
          mockEntryPointAddress
        )
      ).to.be.revertedWithCustomError(GameFactory, "InvalidAddress");
    });

    it("Should initialize with zero resolver and entry point addresses", async function () {
      const factory = await GameFactory.deploy(
        friendToken.target,
        owner.address,
        ethers.ZeroAddress,
        ethers.ZeroAddress
      );
      await factory.deploymentTransaction().wait();
      expect(await factory.resolverAddress()).to.equal(ethers.ZeroAddress);
      expect(await factory.entryPointAddress()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Authorization Functions", function () {
    it("Should allow owner to authorize a creator", async function () {
      await expect(gameFactory.connect(owner).authorizeCreator(creator.address))
        .to.emit(gameFactory, "CreatorAuthorized")
        .withArgs(creator.address);
      expect(await gameFactory.authorizedCreators(creator.address)).to.be.true;
    });

    it("Should revert if non-owner tries to authorize a creator", async function () {
      await expect(
        gameFactory.connect(unauthorizedUser).authorizeCreator(creator.address)
      ).to.be.revertedWithCustomError(gameFactory, "Unauthorized");
    });

    it("Should revert if authorizing zero address", async function () {
      await expect(
        gameFactory.connect(owner).authorizeCreator(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidAddress");
    });

    it("Should allow owner to revoke a creator", async function () {
      await gameFactory.connect(owner).authorizeCreator(creator.address);
      await expect(gameFactory.connect(owner).revokeCreator(creator.address))
        .to.emit(gameFactory, "CreatorRevoked")
        .withArgs(creator.address);
      expect(await gameFactory.authorizedCreators(creator.address)).to.be.false;
    });

    it("Should revert if non-owner tries to revoke a creator", async function () {
      await gameFactory.connect(owner).authorizeCreator(creator.address);
      await expect(
        gameFactory.connect(unauthorizedUser).revokeCreator(creator.address)
      ).to.be.revertedWithCustomError(gameFactory, "Unauthorized");
    });

    it("Should revert if revoking zero address", async function () {
      await expect(
        gameFactory.connect(owner).revokeCreator(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidAddress");
    });
  });

  describe("Creator Submission Functions", function () {
    beforeEach(async function () {
      await gameFactory.connect(owner).authorizeCreator(creator.address);
    });

    it("Should allow authorized creator to submit details", async function () {
      await expect(
        gameFactory.connect(creator).submitCreatorDetails(TWITTER_USERNAME, BASENAME)
      )
        .to.emit(gameFactory, "CreatorSubmissionStored")
        .withArgs(creator.address, TWITTER_USERNAME, BASENAME);

      const submission = await gameFactory.creatorSubmissions(creator.address);
      expect(submission.twitterUsername).to.equal(TWITTER_USERNAME);
      expect(submission.basename).to.equal(BASENAME);
      expect(submission.metadataIpfsHash).to.equal("");
      expect(submission.submitted).to.be.true;
    });

    it("Should revert if caller is not authorized", async function () {
      await expect(
        gameFactory.connect(unauthorizedUser).submitCreatorDetails(TWITTER_USERNAME, BASENAME)
      ).to.be.revertedWithCustomError(gameFactory, "Unauthorized");
    });

    it("Should revert if Twitter username is empty", async function () {
      await expect(
        gameFactory.connect(creator).submitCreatorDetails("", BASENAME)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidTwitterUsername");
    });

    it("Should revert if basename is empty", async function () {
      await expect(
        gameFactory.connect(creator).submitCreatorDetails(TWITTER_USERNAME, "")
      ).to.be.revertedWithCustomError(gameFactory, "InvalidBasename");
    });

    it("Should revert if creator has already submitted", async function () {
      await gameFactory.connect(creator).submitCreatorDetails(TWITTER_USERNAME, BASENAME);
      await expect(
        gameFactory.connect(creator).submitCreatorDetails(TWITTER_USERNAME, BASENAME)
      ).to.be.revertedWithCustomError(gameFactory, "AlreadySubmitted");
    });

    it("Should allow owner to update IPFS hash", async function () {
      await gameFactory.connect(creator).submitCreatorDetails(TWITTER_USERNAME, BASENAME);
      await expect(
        gameFactory.connect(owner).updateIpfsHash(creator.address, METADATA_IPFS_HASH)
      )
        .to.emit(gameFactory, "IpfsHashUpdated")
        .withArgs(creator.address, METADATA_IPFS_HASH);

      const submission = await gameFactory.creatorSubmissions(creator.address);
      expect(submission.metadataIpfsHash).to.equal(METADATA_IPFS_HASH);
    });

    it("Should revert if updating IPFS hash for non-existent submission", async function () {
      await expect(
        gameFactory.connect(owner).updateIpfsHash(unauthorizedUser.address, METADATA_IPFS_HASH)
      ).to.be.revertedWithCustomError(gameFactory, "SubmissionNotFound");
    });

    it("Should revert if non-owner tries to update IPFS hash", async function () {
      await gameFactory.connect(creator).submitCreatorDetails(TWITTER_USERNAME, BASENAME);
      await expect(
        gameFactory.connect(unauthorizedUser).updateIpfsHash(creator.address, METADATA_IPFS_HASH)
      ).to.be.revertedWithCustomError(gameFactory, "Unauthorized");
    });

    it("Should revert if IPFS hash is empty", async function () {
      await gameFactory.connect(creator).submitCreatorDetails(TWITTER_USERNAME, BASENAME);
      await expect(
        gameFactory.connect(owner).updateIpfsHash(creator.address, "")
      ).to.be.revertedWithCustomError(gameFactory, "InvalidBasename");
    });

    it("Should allow retrieval of creator submission", async function () {
      await gameFactory.connect(creator).submitCreatorDetails(TWITTER_USERNAME, BASENAME);
      const [twitterUsername, basename, metadataIpfsHash] = await gameFactory
        .connect(creator)
        .getCreatorSubmission(creator.address);

      expect(twitterUsername).to.equal(TWITTER_USERNAME);
      expect(basename).to.equal(BASENAME);
      expect(metadataIpfsHash).to.equal("");
    });

    it("Should revert if retrieving submission for non-existent creator", async function () {
      await expect(
        gameFactory.connect(creator).getCreatorSubmission(unauthorizedUser.address)
      ).to.be.revertedWithCustomError(gameFactory, "SubmissionNotFound");
    });
  });

  describe("Create Game Instance", function () {
    beforeEach(async function () {
      await gameFactory.connect(owner).authorizeCreator(creator.address);
      await gameFactory.connect(creator).submitCreatorDetails(TWITTER_USERNAME, BASENAME);
      await gameFactory.connect(owner).updateIpfsHash(creator.address, METADATA_IPFS_HASH);
    });

    it("Should create a game instance with valid parameters", async function () {
      const tx = await gameFactory.connect(creator).createGameInstance(GAME_ID, STAKE_AMOUNT, PLAYER_LIMIT);
      await expect(tx)
        .to.emit(gameFactory, "GameCreated")
        .withArgs(
          (await gameFactory.getGameInstances()).at(-1), // gameInstance address
          creator.address,
          GAME_ID,
          STAKE_AMOUNT,
          PLAYER_LIMIT,
          BASENAME,
          METADATA_IPFS_HASH
        );

      const gameInstances = await gameFactory.getGameInstances();
      expect(gameInstances.length).to.equal(1);

      // Access creatorToGames mapping correctly
      const creatorGames = await gameFactory.getCreatorGames(creator.address);
      expect(creatorGames.length).to.equal(1);
      expect(creatorGames[0]).to.equal(gameInstances[0]);
    });

    it("Should revert if caller is not authorized", async function () {
      await expect(
        gameFactory.connect(unauthorizedUser).createGameInstance(GAME_ID, STAKE_AMOUNT, PLAYER_LIMIT)
      ).to.be.revertedWithCustomError(gameFactory, "Unauthorized");
    });

    it("Should revert if creator has not submitted details", async function () {
      await gameFactory.connect(owner).authorizeCreator(unauthorizedUser.address);
      await expect(
        gameFactory.connect(unauthorizedUser).createGameInstance(GAME_ID, STAKE_AMOUNT, PLAYER_LIMIT)
      ).to.be.revertedWithCustomError(gameFactory, "SubmissionNotFound");
    });

    it("Should revert if IPFS hash is not set", async function () {
      await gameFactory.connect(owner).authorizeCreator(unauthorizedUser.address);
      await gameFactory.connect(unauthorizedUser).submitCreatorDetails(TWITTER_USERNAME, BASENAME);
      await expect(
        gameFactory.connect(unauthorizedUser).createGameInstance(GAME_ID, STAKE_AMOUNT, PLAYER_LIMIT)
      ).to.be.revertedWithCustomError(gameFactory, "SubmissionNotFound");
    });

    it("Should revert if stake amount is too low", async function () {
      const invalidStakeAmount = ethers.parseEther("5");
      await expect(
        gameFactory.connect(creator).createGameInstance(GAME_ID, invalidStakeAmount, PLAYER_LIMIT)
      ).to.be.revertedWithCustomError(GameFactory, "InvalidStakeAmount");
    });

    it("Should revert if stake amount is too high", async function () {
      const invalidStakeAmount = ethers.parseEther("150");
      await expect(
        gameFactory.connect(creator).createGameInstance(GAME_ID, invalidStakeAmount, PLAYER_LIMIT)
      ).to.be.revertedWithCustomError(GameFactory, "InvalidStakeAmount");
    });

    it("Should revert if player limit is too low", async function () {
      const invalidPlayerLimit = 1;
      await expect(
        gameFactory.connect(creator).createGameInstance(GAME_ID, STAKE_AMOUNT, invalidPlayerLimit)
      ).to.be.revertedWithCustomError(GameFactory, "InvalidPlayerLimit");
    });

    it("Should revert if player limit is too high", async function () {
      const invalidPlayerLimit = 11;
      await expect(
        gameFactory.connect(creator).createGameInstance(GAME_ID, STAKE_AMOUNT, invalidPlayerLimit)
      ).to.be.revertedWithCustomError(GameFactory, "InvalidPlayerLimit");
    });
  });

  describe("Get Game Instances and Details", function () {
    let gameInstanceAddress;

    beforeEach(async function () {
      await gameFactory.connect(owner).authorizeCreator(creator.address);
      await gameFactory.connect(creator).submitCreatorDetails(TWITTER_USERNAME, BASENAME);
      await gameFactory.connect(owner).updateIpfsHash(creator.address, METADATA_IPFS_HASH);
      const tx = await gameFactory.connect(creator).createGameInstance(GAME_ID, STAKE_AMOUNT, PLAYER_LIMIT);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try {
            return gameFactory.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((log) => log && log.name === "GameCreated");
      gameInstanceAddress = event.args.gameInstance;
    });

    it("Should return empty game instances initially", async function () {
      const newFactory = await GameFactory.deploy(
        friendToken.target,
        owner.address,
        mockResolverAddress,
        mockEntryPointAddress
      );
      await newFactory.deploymentTransaction().wait();
      const gameInstances = await newFactory.getGameInstances();
      expect(gameInstances.length).to.equal(0);
    });

    it("Should return correct game instances after creation", async function () {
      const gameInstances = await gameFactory.getGameInstances();
      expect(gameInstances.length).to.equal(1);
      expect(gameInstances[0]).to.equal(gameInstanceAddress);
    });

    it("Should return correct game details for valid instance", async function () {
      const details = await gameFactory.getGameDetails(gameInstanceAddress);
      expect(details.creator).to.equal(creator.address);
      expect(details.gameId).to.equal(GAME_ID);
      expect(details.stakeAmount).to.equal(STAKE_AMOUNT);
      expect(details.playerLimit).to.equal(PLAYER_LIMIT);
      expect(details.basename).to.equal(BASENAME);
      expect(details.metadataIpfsHash).to.equal(METADATA_IPFS_HASH);
      expect(details.playerCount).to.equal(0);
      expect(details.gameState).to.equal(0); // GameState.Open
    });

    it("Should revert for invalid instance address", async function () {
      await expect(
        gameFactory.getGameDetails(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidAddress");
    });

    it("Should return correct creator games", async function () {
      // Access creatorToGames mapping correctly
      const creatorGames = await gameFactory.getCreatorGames(creator.address);
      expect(creatorGames.length).to.equal(1);
      expect(creatorGames[0]).to.equal(gameInstanceAddress);

      const otherCreatorGames = await gameFactory.getCreatorGames(unauthorizedUser.address);
      expect(otherCreatorGames.length).to.equal(0);
    });
  });

  describe("Update Token Contract", function () {
    it("Should allow owner to update token contract", async function () {
      const newToken = await FriendToken.deploy(owner.address, ethers.parseEther("10000"));
      await newToken.waitForDeployment();

      await expect(gameFactory.connect(owner).updateTokenContract(newToken.target))
        .to.emit(gameFactory, "TokenContractUpdated")
        .withArgs(newToken.target);

      expect(await gameFactory.tokenAddress()).to.equal(newToken.target);
    });

    it("Should revert if non-owner tries to update token contract", async function () {
      const newToken = await FriendToken.deploy(owner.address, ethers.parseEther("10000"));
      await newToken.waitForDeployment();

      await expect(
        gameFactory.connect(unauthorizedUser).updateTokenContract(newToken.target)
      ).to.be.revertedWithCustomError(gameFactory, "Unauthorized");
    });

    it("Should revert if new token address is zero", async function () {
      await expect(
        gameFactory.connect(owner).updateTokenContract(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidAddress");
    });
  });
});