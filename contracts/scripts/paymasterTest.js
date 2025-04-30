const { ethers } = require("hardhat");
const { GasManager } = require("@alchemy/aa-alchemy");
const { AlchemyProvider } = require("@alchemy/aa-core");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing Paymaster with account:", deployer.address);

  // Alchemy Paymaster configuration
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;
  const provider = new AlchemyProvider({
    chainId: 84532, // Base Sepolia
    apiKey: alchemyApiKey,
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", // ERC-4337 EntryPoint
  });

  // Gas Manager for Paymaster
  const gasManager = new GasManager({
    policyId: "1295df14-3f35-4233-8580-7846b66767f0", //new Policy ID
    provider,
  });

  // GameFactory contract (update if redeployed)
  const gameFactoryAddress = "0x92612132Fce3542aDC196DF1b05b82ae48221452";
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = GameFactory.attach(gameFactoryAddress).connect(provider);

  // Create GameInstance with Paymaster
  const tx = await gameFactory.createGameInstance(
    ethers.parseEther("50"),
    5,
    "creator.base.eth",
    "QmValidIpfsHash1234567890abcdef1234567890abcdef",
    { gasManager }
  );
  const receipt = await tx.wait();
  const instanceAddress = (await receipt.logs.filter(log => log.eventName === "GameCreated"))[0].args.gameInstance;
  console.log("GameInstance deployed with Paymaster to:", instanceAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });