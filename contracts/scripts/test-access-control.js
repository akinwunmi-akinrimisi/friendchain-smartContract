const hre = require("hardhat");

async function main() {
  // Get accounts from Hardhat (deployer and unauthorized account)
  const [deployer, unauthorizedAccount] = await hre.ethers.getSigners();
  console.log("Testing with deployer account:", deployer.address);
  console.log("Unauthorized account:", unauthorizedAccount.address);

  // Check deployer's balance
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(deployerBalance), "ETH");

  // Load the deployed NFTBadge contract on Base Sepolia
  const nftBadgeAddress = "0xfCeBAF5FB16AE68d1f8bae575826b926bac5De60";
  const NFTBadge = await hre.ethers.getContractAt("NFTBadge", nftBadgeAddress);

  // Test 1: Verify initial roles
  console.log("\nTest 1: Verifying initial roles...");
  const defaultAdminRole = await NFTBadge.DEFAULT_ADMIN_ROLE();
  const minterRole = await NFTBadge.MINTER_ROLE();

  const adminHasAdminRole = await NFTBadge.hasRole(defaultAdminRole, deployer.address);
  console.log("Admin has DEFAULT_ADMIN_ROLE:", adminHasAdminRole);

  const adminHasMinterRole = await NFTBadge.hasRole(minterRole, deployer.address);
  console.log("Admin has MINTER_ROLE:", adminHasMinterRole);

  const gameInstance = "0x4EF7e15D67F4aB205a6753CB0A266F48f000f8c0";
  const gameInstanceHasMinterRole = await NFTBadge.hasRole(minterRole, gameInstance);
  console.log("Initial GameInstance has MINTER_ROLE:", gameInstanceHasMinterRole);

  // Test 2: Add a new minter as admin
  console.log("\nTest 2: Adding a new minter as admin...");
  const newMinter = "0x1234567890ABCDEF1234567890ABCDEF12345678";
  try {
    const tx = await NFTBadge.connect(deployer).addMinter(newMinter);
    await tx.wait(); // Wait for the transaction to be mined
    console.log("addMinter transaction hash:", tx.hash);
  } catch (error) {
    console.log("Error in addMinter:", error.message);
  }
  const newMinterHasRole = await NFTBadge.hasRole(minterRole, newMinter);
  console.log("New minter has MINTER_ROLE:", newMinterHasRole);

  // Test 3: Remove the minter as admin
  console.log("\nTest 3: Removing the minter as admin...");
  try {
    const tx = await NFTBadge.connect(deployer).removeMinter(newMinter);
    await tx.wait(); // Wait for the transaction to be mined
    console.log("removeMinter transaction hash:", tx.hash);
  } catch (error) {
    console.log("Error in removeMinter:", error.message);
  }
  const newMinterStillHasRole = await NFTBadge.hasRole(minterRole, newMinter);
  console.log("New minter still has MINTER_ROLE after removal:", newMinterStillHasRole);

  // Test 4: Attempt to add a minter as an unauthorized account (should fail)
  console.log("\nTest 4: Attempting to add a minter as unauthorized account...");
  try {
    const tx = await NFTBadge.connect(unauthorizedAccount).addMinter(newMinter);
    await tx.wait();
    console.log("Unexpected success: Unauthorized account added a minter");
  } catch (error) {
    console.log("Expected failure: Unauthorized account cannot add minter");
    console.log("Error message:", error.message);
  }

  // Test 5: Authorize a new GameInstance (simulated using admin due to funding issues)
  console.log("\nTest 5: Authorizing a new GameInstance (simulated using admin due to funding issues)...");
  try {
    const tx = await NFTBadge.connect(deployer).addMinter(newMinter); // Simulate GameFactory behavior
    await tx.wait();
    console.log("addMinter (simulated) transaction hash:", tx.hash);
  } catch (error) {
    console.log("Error in simulated authorizeGameInstance:", error.message);
    return;
  }
  const newGameInstanceHasRole = await NFTBadge.hasRole(minterRole, newMinter);
  console.log("New GameInstance has MINTER_ROLE:", newGameInstanceHasRole);

  // Test 6: Attempt to call authorizeGameInstance as admin (should fail)
  console.log("\nTest 6: Attempting to call authorizeGameInstance as admin (should fail)...");
  try {
    const tx = await NFTBadge.connect(deployer).authorizeGameInstance(newMinter);
    await tx.wait();
    console.log("Unexpected success: Admin called authorizeGameInstance");
  } catch (error) {
    console.log("Expected failure: Admin cannot call authorizeGameInstance (GameFactory only)");
    console.log("Error message:", error.message);
  }

  console.log("\nAccess control tests completed.");
}

main().catch((error) => {
  console.error("Error during testing:", error);
  process.exitCode = 1;
});