const { ethers } = require("hardhat");

async function main() {
  const gameFactoryAddress = "0x92612132Fce3542aDC196DF1b05b82ae48221452";
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.attach(gameFactoryAddress);

  const tx = await gameFactory.createGameInstance(
    ethers.parseEther("50"),
    5,
    "test.base.eth",
    "QmTestIpfsHash1234567890abcdef1234567890abcdef"
  );
  const receipt = await tx.wait();
  console.log("New GameInstance deployed to:", receipt.logs[0].args.gameInstance);
}

main().catch(console.error);