const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Use existing FriendToken and GameInstance addresses
  const friendTokenAddress = "0x8bF05884EA666706F92FD0134076e15d3dd7B0CD";
  const gameInstanceAddress = "0x4EF7e15D67F4aB205a6753CB0A266F48f000f8c0";
  const friendToken = await hre.ethers.getContractAt("FriendToken", friendTokenAddress);
  const gameInstance = await hre.ethers.getContractAt("GameInstance", gameInstanceAddress);
  console.log("Using existing FriendToken at:", friendTokenAddress);
  console.log("Using existing GameInstance at:", gameInstanceAddress);

  // Deploy GameFactory with all required constructor arguments
  const RESOLVER_ADDRESS = "0x0000000000000000000000000000000000000001";
  const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const GameFactory = await hre.ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.deploy(
    friendTokenAddress,
    deployer.address, // Owner
    RESOLVER_ADDRESS,
    ENTRY_POINT_ADDRESS
  );
  await gameFactory.waitForDeployment();
  console.log("GameFactory deployed to:", gameFactory.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });