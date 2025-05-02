const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy FriendToken
  const FriendToken = await hre.ethers.getContractFactory("FriendToken");
  const friendToken = await FriendToken.deploy(deployer.address, hre.ethers.parseEther("10000"));
  await friendToken.waitForDeployment();
  console.log("FriendToken deployed to:", friendToken.target);

  // Deploy GameInstance
  const GAME_ID = 1;
  const STAKE_AMOUNT = hre.ethers.parseEther("50");
  const PLAYER_LIMIT = 5;
  const CREATOR_BASENAME = "creator.base.eth";
  const METADATA_IPFS_HASH = "QmValidIpfsHash1234567890abcdef1234567890abcdef";
  const RESOLVER_ADDRESS = "0x0000000000000000000000000000000000000001";
  const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  const GameInstance = await hre.ethers.getContractFactory("GameInstance");
  const gameInstance = await GameInstance.deploy(
    friendToken.target,
    deployer.address,
    GAME_ID,
    STAKE_AMOUNT,
    PLAYER_LIMIT,
    CREATOR_BASENAME,
    METADATA_IPFS_HASH,
    RESOLVER_ADDRESS,
    ENTRY_POINT_ADDRESS
  );
  await gameInstance.waitForDeployment();
  console.log("GameInstance deployed to:", gameInstance.target);

  // Mint tokens for testing
  await friendToken.mint(deployer.address, hre.ethers.parseEther("1000"));
  console.log("Minted 1000 tokens to deployer");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });