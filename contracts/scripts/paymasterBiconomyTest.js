const { ethers } = require("hardhat");
const { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } = require("@biconomy/account");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing Biconomy Smart Account with account:", deployer.address);

  const biconomyApiKey = process.env.BICONOMY_API_KEY;
  if (!biconomyApiKey) throw new Error("Missing BICONOMY_API_KEY");

  // Biconomy Bundler URL for Base Sepolia
  const bundlerUrl = "https://bundler.biconomy.io/api/v2/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44";

  // Create a Biconomy Smart Account
  const smartAccount = await BiconomySmartAccountV2.create({
    chainId: 84532, // Base Sepolia
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    signer: deployer,
    bundlerUrl: bundlerUrl,
  });

  // Log the smart account address to verify
  const smartAccountAddress = await smartAccount.getAccountAddress();
  console.log("Smart Account Address:", smartAccountAddress);

  // GameFactory contract interaction
  const gameFactoryAddress = "0xA5bBc7A0C122708463319e7802Ba9E6739FE048F";
  const GameFactory = await ethers.getContractFactory("GameFactory");

  // Authorize the smart account as a creator using the deployer
  const gameFactoryWithDeployer = GameFactory.attach(gameFactoryAddress).connect(deployer);
  console.log("Authorizing smart account as creator...");
  const isAuthorized = await gameFactoryWithDeployer.authorizedCreators(smartAccountAddress);
  if (!isAuthorized) {
    const tx = await gameFactoryWithDeployer.authorizeCreator(smartAccountAddress);
    await tx.wait();
    console.log("Smart account authorized as creator.");
  } else {
    console.log("Smart account is already authorized.");
  }

  // Now interact with GameFactory using the smart account
  const gameFactory = GameFactory.attach(gameFactoryAddress).connect(smartAccount);

  // Build the transaction
  const txData = await gameFactory.createGameInstance.populateTransaction(
    ethers.parseEther("50"),
    5,
    "creator.base.eth",
    "QmValidIpfsHash1234567890abcdef1234567890abcdef"
  );

  // Build the user operation
  let userOp = await smartAccount.buildUserOp(
    [{ to: gameFactoryAddress, data: txData.data }]
  );

  console.log("UserOp:", JSON.stringify(userOp, null, 2));

  // Skip Paymaster sponsorship
  console.log("Skipping Paymaster sponsorship, sending transaction directly...");

  // Send the transaction
  const userOpResponse = await smartAccount.sendUserOp(userOp);
  console.log("UserOp Hash:", userOpResponse.userOpHash);

  // Wait for the transaction to be mined and get the receipt
  const receipt = await userOpResponse.wait(1);
  console.log("Receipt:", JSON.stringify(receipt, null, 2));

  // Check if the user operation was successful
  if (!receipt.success) {
    console.error("User operation failed. Reason:", receipt.reason || "No reason provided");
    process.exit(1);
  }

  // Parse the GameCreated event using the contract's interface
  const gameCreatedEvent = receipt.receipt.logs
    .map(log => {
      try {
        return gameFactory.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find(event => event && event.name === "GameCreated");

  if (!gameCreatedEvent) {
    console.error("GameCreated event not found in logs.");
    process.exit(1);
  }

  const instanceAddress = gameCreatedEvent.args.gameInstance;
  console.log("GameInstance deployed with Biconomy Smart Account to:", instanceAddress);

  // Log the transaction hash
  console.log("Transaction Hash:", receipt.receipt.transactionHash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });