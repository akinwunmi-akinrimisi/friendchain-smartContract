const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameFactory", function () {
  let GameFactory, gameFactory, owner, addr1, addr2, mockToken, friendToken;
  const RESOLVER_ADDRESS = "0x0000000000000000000000000000000000000001";
  const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const STAKE_AMOUNT = ethers.parseEther("50");
  const PLAYER_LIMIT = 5;
  const BASENAME = "creator.base.eth";
  const IPFS_HASH = "QmValidIpfsHash1234567890abcdef1234567890abcdef";

  beforeEach(async function () {
    try {
      [owner, addr1, addr2] = await ethers.getSigners();

      // Deploy a fresh FriendToken contract
      const FriendToken = await ethers.getContractFactory("FriendToken");
      friendToken = await FriendToken.deploy(owner.address, ethers.parseEther("10000"));
      await friendToken.waitForDeployment();

      // Deploy a mock token for updating token address
      const MockToken = await ethers.getContractFactory("FriendToken");
      mockToken = await MockToken.deploy(owner.address, ethers.parseEther("10000"));
      await mockToken.waitForDeployment();

      GameFactory = await ethers.getContractFactory("GameFactory");
      console.log("Deploying GameFactory with args:", {
        tokenAddress: friendToken.target,
        owner: owner.address,
        RESOLVER_ADDRESS,
        ENTRY_POINT_ADDRESS
      });
      gameFactory = await GameFactory.deploy(
        friendToken.target,
        owner.address,
        RESOLVER_ADDRESS,
        ENTRY_POINT_ADDRESS
      );
      await gameFactory.waitForDeployment();
    } catch (error) {
      console.error("Error in beforeEach:", error);
      throw error;
    }
  });

  describe("Constructor", function () {
    it("Should initialize correctly with valid inputs", async function () {
      expect(await gameFactory.tokenAddress()).to.equal(friendToken.target);
      expect(await gameFactory.owner()).to.equal(owner.address);
      expect(await gameFactory.resolverAddress()).to.equal(RESOLVER_ADDRESS);
      expect(await gameFactory.entryPointAddress()).to.equal(ENTRY_POINT_ADDRESS);
      expect(await gameFactory.nextGameId()).to.equal(1);
      expect(await gameFactory.MIN_STAKE()).to.equal(ethers.parseEther("10"));
      expect(await gameFactory.MAX_STAKE()).to.equal(ethers.parseEther("100"));
      expect(await gameFactory.MIN_PLAYERS()).to.equal(2);
      expect(await gameFactory.MAX_PLAYERS()).to.equal(10);
      const gameInstances = await gameFactory.getGameInstances();
      expect(gameInstances.length).to.equal(0);
      expect(await gameFactory.authorizedCreators(owner.address)).to.be.false;
    });

    it("Should revert if token address is zero", async function () {
      await expect(
        GameFactory.deploy(
          ethers.ZeroAddress,
          owner.address,
          RESOLVER_ADDRESS,
          ENTRY_POINT_ADDRESS
        )
      ).to.be.revertedWithCustomError(GameFactory, "InvalidTokenAddress");
    });

    it("Should initialize with zero resolver and entry point addresses", async function () {
      const factory = await GameFactory.deploy(
        friendToken.target,
        owner.address,
        ethers.ZeroAddress,
        ethers.ZeroAddress
      );
      await factory.waitForDeployment();
      expect(await factory.resolverAddress()).to.equal(ethers.ZeroAddress);
      expect(await factory.entryPointAddress()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Authorization Functions", function () {
    it("Should allow owner to authorize a creator", async function () {
      const tx = await gameFactory.authorizeCreator(addr1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      await expect(tx)
        .to.emit(gameFactory, "CreatorAuthorized")
        .withArgs(addr1.address, block.timestamp);
      expect(await gameFactory.authorizedCreators(addr1.address)).to.be.true;
    });

    it("Should revert if non-owner tries to authorize a creator", async function () {
      await expect(
        gameFactory.connect(addr1).authorizeCreator(addr2.address)
      ).to.be.revertedWithCustomError(gameFactory, "OwnableUnauthorizedAccount");
    });

    it("Should revert if authorizing zero address", async function () {
      await expect(
        gameFactory.authorizeCreator(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidCreator");
    });

    it("Should allow owner to revoke a creator", async function () {
      await gameFactory.authorizeCreator(addr1.address);
      const tx = await gameFactory.revokeCreator(addr1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      await expect(tx)
        .to.emit(gameFactory, "CreatorRevoked")
        .withArgs(addr1.address, block.timestamp);
      expect(await gameFactory.authorizedCreators(addr1.address)).to.be.false;
    });

    it("Should revert if non-owner tries to revoke a creator", async function () {
      await gameFactory.authorizeCreator(addr1.address);
      await expect(
        gameFactory.connect(addr1).revokeCreator(addr1.address)
      ).to.be.revertedWithCustomError(gameFactory, "OwnableUnauthorizedAccount");
    });

    it("Should revert if revoking zero address", async function () {
      await expect(
        gameFactory.revokeCreator(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidCreator");
    });
  });

  describe("Create Game Instance", function () {
    beforeEach(async function () {
      await gameFactory.authorizeCreator(addr1.address);
    });

    it("Should create a game instance with valid parameters", async function () {
      const tx = await gameFactory.connect(addr1).createGameInstance(
        STAKE_AMOUNT,
        PLAYER_LIMIT,
        BASENAME,
        IPFS_HASH
      );
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const instanceAddress = (await receipt.logs.filter(log => log.eventName === "GameCreated"))[0].args.gameInstance;

      await expect(tx)
        .to.emit(gameFactory, "GameCreated")
        .withArgs(1, instanceAddress, addr1.address, BASENAME, STAKE_AMOUNT, PLAYER_LIMIT, IPFS_HASH, block.timestamp);

      const gameInstances = await gameFactory.getGameInstances();
      expect(gameInstances.length).to.equal(1);
      expect(gameInstances[0]).to.equal(instanceAddress);

      const metadata = await gameFactory.getGameDetails(instanceAddress);
      expect(metadata.gameId).to.equal(1);
      expect(metadata.creator).to.equal(addr1.address);
      expect(metadata.basename).to.equal(BASENAME);
      expect(metadata.stakeAmount).to.equal(STAKE_AMOUNT);
      expect(metadata.playerLimit).to.equal(PLAYER_LIMIT);
      expect(metadata.ipfsHash).to.equal(IPFS_HASH);
      expect(typeof metadata.createdAt).to.equal("bigint");

      expect(await gameFactory.nextGameId()).to.equal(2);

      const gameInstance = await ethers.getContractAt("GameInstance", instanceAddress);
      expect(await gameInstance.tokenAddress()).to.equal(friendToken.target);
      expect(await gameInstance.creator()).to.equal(addr1.address);
      expect(await gameInstance.stakeAmount()).to.equal(STAKE_AMOUNT);
      expect(await gameInstance.playerLimit()).to.equal(PLAYER_LIMIT);
      expect(await gameInstance.basename()).to.equal(BASENAME);
      expect(await gameInstance.ipfsHash()).to.equal(IPFS_HASH);
      expect(await gameInstance.resolverAddress()).to.equal(RESOLVER_ADDRESS);
      expect(await gameInstance.entryPointAddress()).to.equal(ENTRY_POINT_ADDRESS);
    });

    it("Should revert if caller is not authorized", async function () {
      await expect(
        gameFactory.connect(addr2).createGameInstance(STAKE_AMOUNT, PLAYER_LIMIT, BASENAME, IPFS_HASH)
      ).to.be.revertedWithCustomError(gameFactory, "UnauthorizedCreator");
    });

    it("Should revert if stake amount is too low", async function () {
      await expect(
        gameFactory.connect(addr1).createGameInstance(ethers.parseEther("5"), PLAYER_LIMIT, BASENAME, IPFS_HASH)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidGameParameters");
    });

    it("Should revert if stake amount is too high", async function () {
      await expect(
        gameFactory.connect(addr1).createGameInstance(ethers.parseEther("150"), PLAYER_LIMIT, BASENAME, IPFS_HASH)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidGameParameters");
    });

    it("Should revert if player limit is too low", async function () {
      await expect(
        gameFactory.connect(addr1).createGameInstance(STAKE_AMOUNT, 1, BASENAME, IPFS_HASH)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidGameParameters");
    });

    it("Should revert if player limit is too high", async function () {
      await expect(
        gameFactory.connect(addr1).createGameInstance(STAKE_AMOUNT, 11, BASENAME, IPFS_HASH)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidGameParameters");
    });

    it("Should revert if basename is empty", async function () {
      await expect(
        gameFactory.connect(addr1).createGameInstance(STAKE_AMOUNT, PLAYER_LIMIT, "", IPFS_HASH)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidBasename");
    });
  });

  describe("Get Game Instances and Details", function () {
    let instanceAddress;

    beforeEach(async function () {
      await gameFactory.authorizeCreator(addr1.address);
      const tx = await gameFactory.connect(addr1).createGameInstance(
        STAKE_AMOUNT,
        PLAYER_LIMIT,
        BASENAME,
        IPFS_HASH
      );
      const receipt = await tx.wait();
      instanceAddress = (await receipt.logs.filter(log => log.eventName === "GameCreated"))[0].args.gameInstance;
    });

    it("Should return empty game instances initially", async function () {
      const factory = await GameFactory.deploy(
        friendToken.target,
        owner.address,
        RESOLVER_ADDRESS,
        ENTRY_POINT_ADDRESS
      );
      await factory.waitForDeployment();
      const gameInstances = await factory.getGameInstances();
      expect(gameInstances.length).to.equal(0);
    });

    it("Should return correct game instances after creation", async function () {
      const gameInstances = await gameFactory.getGameInstances();
      expect(gameInstances.length).to.equal(1);
      expect(gameInstances[0]).to.equal(instanceAddress);
    });

    it("Should return correct game details for valid instance", async function () {
      const metadata = await gameFactory.getGameDetails(instanceAddress);
      expect(metadata.gameId).to.equal(1);
      expect(metadata.creator).to.equal(addr1.address);
      expect(metadata.basename).to.equal(BASENAME);
      expect(metadata.stakeAmount).to.equal(STAKE_AMOUNT);
      expect(metadata.playerLimit).to.equal(PLAYER_LIMIT);
      expect(metadata.ipfsHash).to.equal(IPFS_HASH);
      expect(typeof metadata.createdAt).to.equal("bigint");
    });

    it("Should revert for invalid instance address", async function () {
      await expect(
        gameFactory.getGameDetails(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidInstanceAddress");
    });
  });

  describe("Update Token Contract", function () {
    it("Should allow owner to update token contract", async function () {
      const tx = await gameFactory.updateTokenContract(mockToken.target);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(gameFactory, "TokenContractUpdated")
        .withArgs(friendToken.target, mockToken.target, block.timestamp);

      expect(await gameFactory.tokenAddress()).to.equal(mockToken.target);

      // Verify new game instances use the updated token address
      await gameFactory.authorizeCreator(addr1.address);
      const createTx = await gameFactory.connect(addr1).createGameInstance(
        STAKE_AMOUNT,
        PLAYER_LIMIT,
        BASENAME,
        IPFS_HASH
      );
      const createReceipt = await createTx.wait();
      const instanceAddress = (await createReceipt.logs.filter(log => log.eventName === "GameCreated"))[0].args.gameInstance;
      const gameInstance = await ethers.getContractAt("GameInstance", instanceAddress);
      expect(await gameInstance.tokenAddress()).to.equal(mockToken.target);
    });

    it("Should revert if non-owner tries to update token contract", async function () {
      await expect(
        gameFactory.connect(addr1).updateTokenContract(mockToken.target)
      ).to.be.revertedWithCustomError(gameFactory, "OwnableUnauthorizedAccount");
    });

    it("Should revert if new token address is zero", async function () {
      await expect(
        gameFactory.updateTokenContract(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(gameFactory, "InvalidTokenAddress");
    });
  });
});