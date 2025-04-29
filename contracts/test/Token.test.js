const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FriendToken", function () {
  let Token, token, owner, addr1, addr2;
  const INITIAL_SUPPLY = ethers.parseEther("1000");
  const MAX_SUPPLY = ethers.parseEther("10000");

  beforeEach(async function () {
    Token = await ethers.getContractFactory("FriendToken");
    [owner, addr1, addr2] = await ethers.getSigners();
    token = await Token.deploy(owner.address, MAX_SUPPLY);
  });

  describe("Deployment", function () {
    it("Should set correct name and symbol", async function () {
      expect(await token.name()).to.equal("Friend");
      expect(await token.symbol()).to.equal("FRND");
    });

    it("Should set correct decimals", async function () {
      expect(await token.decimals()).to.equal(18);
    });

    it("Should mint 1000 tokens to owner", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Should set maxSupply", async function () {
      expect(await token.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it("Should set owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const amount = ethers.parseEther("500");
      await token.mint(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + amount);
    });

    it("Should emit Mint event", async function () {
      const amount = ethers.parseEther("500");
      await expect(token.mint(addr1.address, amount))
        .to.emit(token, "Mint")
        .withArgs(addr1.address, amount);
    });

    it("Should revert if non-owner mints", async function () {
      const amount = ethers.parseEther("500");
      await expect(
        token.connect(addr1).mint(addr2.address, amount)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("Should revert if mint exceeds maxSupply", async function () {
      const amount = MAX_SUPPLY - INITIAL_SUPPLY + ethers.parseEther("1");
      await expect(
        token.mint(addr1.address, amount)
      ).to.be.revertedWithCustomError(token, "CapExceeded");
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens", async function () {
      const amount = ethers.parseEther("200");
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - amount);
    });

    it("Should revert transfer to zero address", async function () {
      await expect(
        token.transfer(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "ERC20InvalidReceiver");
    });

    it("Should revert transfer with insufficient balance", async function () {
      await expect(
        token.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Approvals", function () {
    it("Should approve tokens", async function () {
      const amount = ethers.parseEther("100");
      await token.approve(addr1.address, amount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(amount);
    });
  });
});