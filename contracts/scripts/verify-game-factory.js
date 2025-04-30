const { ethers } = require("hardhat");

  async function main() {
    const gameFactoryAddress = "0xA5bBc7A0C122708463319e7802Ba9E6739FE048F";
    const GameFactory = await ethers.getContractFactory("GameFactory");
    const gameFactory = GameFactory.attach(gameFactoryAddress);

    console.log("Token Address:", await gameFactory.tokenAddress());
    console.log("Owner:", await gameFactory.owner());
    console.log("MIN_STAKE:", ethers.formatEther(await gameFactory.MIN_STAKE()));
    console.log("MAX_STAKE:", ethers.formatEther(await gameFactory.MAX_STAKE()));
    console.log("MIN_PLAYERS:", await gameFactory.MIN_PLAYERS());
    console.log("MAX_PLAYERS:", await gameFactory.MAX_PLAYERS());
  }

  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });