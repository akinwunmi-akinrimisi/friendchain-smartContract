const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy FriendToken
  const FriendToken = await ethers.getContractFactory("FriendToken");
  const maxSupply = ethers.parseEther("10000"); // 10,000 FRND
  const friendToken = await FriendToken.deploy(deployer.address, maxSupply);
  await friendToken.waitForDeployment();
  console.log("FriendToken deployed to:", friendToken.target);

  // Mock addresses for resolver and entry point (replace with actual Base Sepolia addresses if available)
  const RESOLVER_ADDRESS = "0x0000000000000000000000000000000000000001";
  const ENTRY_POINT_ADDRESS = "0x0000000000000000000000000000000000000002";

  // Deploy GameFactory
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.deploy(
    friendToken.target,
    deployer.address,
    RESOLVER_ADDRESS,
    ENTRY_POINT_ADDRESS
  );
  await gameFactory.waitForDeployment();
  console.log("GameFactory deployed to:", gameFactory.target);

  // Authorize deployer as creator
  await gameFactory.authorizeCreator(deployer.address);
  console.log("Authorized creator:", deployer.address);

  // Deploy GameInstance
  const tx = await gameFactory.createGameInstance(
    ethers.parseEther("50"), // stakeAmount
    5, // playerLimit
    "creator.base.eth", // basename
    "QmValidIpfsHash1234567890abcdef1234567890abcdef", // ipfsHash
    { gasLimit: 1000000 } // Override gas limit
  );
  const receipt = await tx.wait();
  const instanceAddress = (await receipt.logs.filter(log => log.eventName === "GameCreated"))[0].args.gameInstance;
  console.log("GameInstance deployed to:", instanceAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });