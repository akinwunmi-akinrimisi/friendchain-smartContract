const hre = require("hardhat");

async function main() {
  const accounts = await hre.ethers.getSigners();
  console.log("Available accounts:");
  accounts.forEach((account, index) => {
    console.log(`Account ${index}: ${account.address}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});