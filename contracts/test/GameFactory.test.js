const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameFactory", function () {
  let GameFactory, gameFactory, owner, addr1, addr2;
  const TOKEN_ADDRESS = "0x8A7d82633697bF2FC2250661A1173c6139f326B1";
  const RESOLVER_ADDRESS = "0x0000000000000000000000000000000000000001"; // Mock
  const ENTRY_POINT_ADDRESS = "0x0000000000000000000000000000000000000002"; // Mock

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    GameFactory = await ethers.getContractFactory("GameFactory");
    gameFactory = await GameFactory.deploy(
      TOKEN_ADDRESS,
      owner.address,
      RESOLVER_ADDRESS,
      ENTRY_POINT_ADDRESS
    );
  });

  describe("Constructor", function () {
    it("Should initialize correctly with valid inputs", async function () {
      expect(await gameFactory.tokenAddress()).to.equal(TOKEN_ADDRESS);
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
        TOKEN_ADDRESS,
        owner.address,
        ethers.ZeroAddress,
        ethers.ZeroAddress
      );
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
});