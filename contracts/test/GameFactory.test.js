const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameFactory Constructor", function () {
  let GameFactory, gameFactory, owner, addr1;
  const TOKEN_ADDRESS = "0x8A7d82633697bF2FC2250661A1173c6139f326B1";
  const RESOLVER_ADDRESS = "0x0000000000000000000000000000000000000001"; // Mock
  const ENTRY_POINT_ADDRESS = "0x0000000000000000000000000000000000000002"; // Mock

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    GameFactory = await ethers.getContractFactory("GameFactory");
  });

  it("Should initialize correctly with valid inputs", async function () {
    gameFactory = await GameFactory.deploy(
      TOKEN_ADDRESS,
      owner.address,
      RESOLVER_ADDRESS,
      ENTRY_POINT_ADDRESS
    );

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
    gameFactory = await GameFactory.deploy(
      TOKEN_ADDRESS,
      owner.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );

    expect(await gameFactory.resolverAddress()).to.equal(ethers.ZeroAddress);
    expect(await gameFactory.entryPointAddress()).to.equal(ethers.ZeroAddress);
  });
});