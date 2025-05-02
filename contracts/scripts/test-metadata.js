const hre = require("hardhat");

async function main() {
  // Get accounts from Hardhat (deployer and unauthorized account)
  const [deployer, unauthorizedAccount] = await hre.ethers.getSigners();
  console.log("Testing with deployer account:", deployer.address);
  console.log("Unauthorized account:", unauthorizedAccount.address);

  // Load the deployed NFTBadge contract on Base Sepolia
  const nftBadgeAddress = "0xEadeE77776E47b262e81Fcf1101dA23117800270"; // new deployed address
  const NFTBadge = await hre.ethers.getContractAt("NFTBadge", nftBadgeAddress);

  // Test 1: Mint a badge with a token URI as admin
  console.log("\nTest 1: Minting a badge with token URI as admin...");
  let tokenId;
  const badgeTokenURI = "bafkreib27pyy3ll4o24vtysgngdefsjnnrrh3ennqy2kpce2lbz76ro72i"; // Use the metadata CID as the token URI
  try {
    const tx = await NFTBadge.connect(deployer).mintBadge(deployer.address, badgeTokenURI);
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

  // Test 2: Retrieve the token URI
  console.log("\nTest 2: Retrieving the token URI...");
  const retrievedTokenURI = await NFTBadge.tokenURI(tokenId);
  console.log("Retrieved token URI:", retrievedTokenURI);
  console.log("Expected token URI:", "https://ipfs.io/ipfs/bafkreib27pyy3ll4o24vtysgngdefsjnnrrh3ennqy2kpce2lbz76ro72i");

  // Test 3: Mint a badge as unauthorized account (should fail)
  console.log("\nTest 3: Minting a badge as unauthorized account (should fail)...");
  try {
    const tx = await NFTBadge.connect(unauthorizedAccount).mintBadge(unauthorizedAccount.address, badgeTokenURI);
    await tx.wait();
    console.log("Unexpected success: Unauthorized account minted a badge");
  } catch (error) {
    console.log("Expected failure: Unauthorized account cannot mint badge");
    console.log("Error message:", error.message);
  }

  // Test 4: Update the base URI as admin
  console.log("\nTest 4: Updating the base URI as admin...");
  const newBaseURI = "https://new-ipfs-gateway.io/ipfs/";
  try {
    const tx = await NFTBadge.connect(deployer).setBaseURI(newBaseURI);
    await tx.wait();
    console.log("setBaseURI transaction hash:", tx.hash);
    const updatedTokenURI = await NFTBadge.tokenURI(tokenId);
    console.log("Updated token URI:", updatedTokenURI);
    console.log("Expected updated token URI:", newBaseURI + badgeTokenURI);
  } catch (error) {
    console.log("Error in setBaseURI (admin):", error.message);
    return;
  }

  // Test 5: Update the base URI as unauthorized account (should fail)
  console.log("\nTest 5: Updating the base URI as unauthorized account (should fail)...");
  try {
    const tx = await NFTBadge.connect(unauthorizedAccount).setBaseURI("https://malicious-ipfs-gateway.io/ipfs/");
    await tx.wait();
    console.log("Unexpected success: Unauthorized account updated the base URI");
  } catch (error) {
    console.log("Expected failure: Unauthorized account cannot update base URI");
    console.log("Error message:", error.message);
  }

  console.log("\nMetadata tests completed.");
}

main().catch((error) => {
  console.error("Error during testing:", error);
  process.exitCode = 1;
});