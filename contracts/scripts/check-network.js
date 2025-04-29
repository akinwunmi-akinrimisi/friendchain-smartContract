const hre = require("hardhat");

async function main() {
  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();
  console.log("Connected to network:", network.name, network.chainId);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});