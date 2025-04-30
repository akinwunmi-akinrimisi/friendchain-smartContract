const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const smartAccountAddress = "0xa558aDf4bd66894F6eF0F97C55F7CaeF6fad6a39";
  const amount = ethers.parseEther("0.001");

  console.log(`Funding smart account ${smartAccountAddress} with 0.001 ETH...`);
  const tx = await deployer.sendTransaction({
    to: smartAccountAddress,
    value: amount,
  });
  await tx.wait();
  console.log("Smart account funded!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });