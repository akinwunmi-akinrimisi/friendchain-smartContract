const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy FriendToken (already deployed, reuse address)
  const friendTokenAddress = "0x4e83e8658B27BEF023eE431B1A2D97e6B3d014AD";
  console.log("Using existing FriendToken at:", friendTokenAddress);

  // Correct EntryPoint address for Base Sepolia
  const RESOLVER_ADDRESS = "0x0000000000000000000000000000000000000001";
  const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  // Deploy GameFactory
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.deploy(
    friendTokenAddress,
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
    ethers.parseEther("50"),
    5,
    "creator.base.eth",
    "QmValidIpfsHash1234567890abcdef1234567890abcdef",
    { gasLimit: 1000000 }
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