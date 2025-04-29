const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const maxSupply = hre.ethers.parseEther("10000"); // 10,000 FRND for testnet
  const Token = await hre.ethers.getContractFactory("FriendToken");
  const token = await Token.deploy(deployer.address, maxSupply);
  console.log("FriendToken deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});