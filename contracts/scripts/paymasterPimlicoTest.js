const { ethers } = require("hardhat");
const { createPublicClient, http, parseEther } = require("viem");
const { baseSepolia } = require("viem/chains");
const { createBundlerClient, toSafeSmartAccount } = require("permissionless");
const { privateKeyToAccount } = require("viem/accounts");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing Pimlico Paymaster with account:", deployer.address);

  // Pimlico configuration
  const pimlicoApiKey = process.env.PIMLICO_API_KEY;
  if (!pimlicoApiKey) throw new Error("Missing PIMLICO_API_KEY");

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(`https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`),
  });

  const pimlicoUrl = `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${pimlicoApiKey}`;
  const bundlerClient = createBundlerClient({
    chain: baseSepolia,
    transport: http(pimlicoUrl),
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  });

  // Create a Safe smart account
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing PRIVATE_KEY");
  const owner = privateKeyToAccount(privateKey);
  const account = await toSafeSmartAccount({
    client: publicClient,
    owners: [owner],
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    safeVersion: "1.4.1",
  });

  const smartAccountClient = bundlerClient.extend(() => ({
    account,
    paymaster: {
      getPaymasterAndData: async () => {
        // Request Paymaster data from Pimlico
        const response = await fetch(`${pimlicoUrl}/getPaymasterAndData`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userOperation: { sender: account.address } }),
        });
        const data = await response.json();
        return data.paymasterAndData || "0x";
      },
    },
  }));

  // GameFactory contract interaction
  const gameFactoryAddress = "0xA5bBc7A0C122708463319e7802Ba9E6739FE048F";
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = GameFactory.attach(gameFactoryAddress).connect(smartAccountClient);

  // Create GameInstance with Paymaster
  const tx = await gameFactory.createGameInstance(
    parseEther("50"),
    5,
    "creator.base.eth",
    "QmValidIpfsHash1234567890abcdef1234567890abcdef"
  );
  const receipt = await tx.wait();
  const instanceAddress = receipt.logs.find(log => log.eventName === "GameCreated")?.args.gameInstance;
  console.log("GameInstance deployed with Pimlico Paymaster to:", instanceAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });