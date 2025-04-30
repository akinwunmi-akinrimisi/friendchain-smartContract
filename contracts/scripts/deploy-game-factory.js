const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying GameFactory with account:", deployer.address);

  // Constructor arguments
  const tokenAddress = "0x4e83e8658B27BEF023eE431B1A2D97e6B3d014AD"; // Token.sol address (use a mock address for local testing)
  const resolverAddress = "0x0000000000000000000000000000000000000001"; // Mock resolver address
  const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"; // EntryPoint address for Base Sepolia

  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.deploy(
    tokenAddress,
    deployer.address,
    resolverAddress,
    entryPointAddress
  );

  await gameFactory.waitForDeployment();
  console.log("GameFactory deployed to:", await gameFactory.getAddress());

  // For Base Sepolia deployment, you would verify with:
  // npx hardhat verify --network baseSepolia <contract-address> <tokenAddress> <deployer.address> <resolverAddress> <entryPointAddress>
  console.log("To verify on Base Sepolia, run:");
  console.log(
    `npx hardhat verify --network baseSepolia ${await gameFactory.getAddress()} ${tokenAddress} ${deployer.address} ${resolverAddress} ${entryPointAddress}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });