const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const initialGameInstance = "0x4EF7e15D67F4aB205a6753CB0A266F48f000f8c0";
  const gameFactory = "0xEd424E2936662797c2ada33af2960F3f7CCa8C85";
  const baseURI = "https://ipfs.io/ipfs/"; // Use IPFS gateway as base URI

  const NFTBadge = await hre.ethers.getContractFactory("NFTBadge");
  const nftBadge = await NFTBadge.deploy(initialGameInstance, gameFactory, baseURI);
  await nftBadge.waitForDeployment();
  const nftBadgeAddress = await nftBadge.getAddress();

  console.log("NFTBadge deployed to:", nftBadgeAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});