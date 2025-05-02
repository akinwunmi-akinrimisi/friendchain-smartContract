const hre = require("hardhat");

async function main() {
  // Get accounts from Hardhat (deployer and unauthorized account)
  const [deployer, unauthorizedAccount] = await hre.ethers.getSigners();
  console.log("Testing with deployer account:", deployer.address);
  console.log("Unauthorized account:", unauthorizedAccount.address);

  // Load the deployed NFTBadge contract on Base Sepolia
  const nftBadgeAddress = "0xF83c151Ad8828fe1f90c32398Fa58Cd94F2c5764";
  const NFTBadge = await hre.ethers.getContractAt("NFTBadge", nftBadgeAddress);

  // Test 1: Mint a badge as admin (should succeed)
  console.log("\nTest 1: Minting a badge as admin...");
  let tokenId;
  try {
    const tx = await NFTBadge.connect(deployer).mintBadge(deployer.address);
    const receipt = await tx.wait();
    tokenId = receipt.logs[0].args.tokenId; // Extract tokenId from event
    console.log("mintBadge transaction hash:", tx.hash);
    console.log("Minted badge with tokenId:", tokenId.toString());
  } catch (error) {
    console.log("Error in mintBadge (admin):", error.message);
    return;
  }

  // Verify badge ownership and totalBadgesMinted
  const owner = await NFTBadge.ownerOf(tokenId);
  console.log("Badge owner:", owner);
  console.log("Expected owner:", deployer.address);

  const totalBadges = await NFTBadge.totalBadgesMinted();
  console.log("Total badges minted:", totalBadges.toString());

  // Test 2: Mint a badge as unauthorized account (should fail)
  console.log("\nTest 2: Minting a badge as unauthorized account (should fail)...");
  try {
    const tx = await NFTBadge.connect(unauthorizedAccount).mintBadge(unauthorizedAccount.address);
    await tx.wait();
    console.log("Unexpected success: Unauthorized account minted a badge");
  } catch (error) {
    console.log("Expected failure: Unauthorized account cannot mint badge");
    console.log("Error message:", error.message);
  }

  console.log("\nMinting tests completed.");
}

main().catch((error) => {
  console.error("Error during testing:", error);
  process.exitCode = 1;
});