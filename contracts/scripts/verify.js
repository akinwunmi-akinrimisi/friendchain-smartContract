const { run } = require("hardhat");

async function main() {
  const friendTokenAddress = "0x4e83e8658B27BEF023eE431B1A2D97e6B3d014AD";
  const gameFactoryAddress = "0x92612132Fce3542aDC196DF1b05b82ae48221452";
  const gameInstanceAddress = "0xf8c6449B6Bd895E8d08fb2a23415E1aBcdC462bb";

  console.log("Verifying FriendToken at:", friendTokenAddress);
  await run("verify:verify", {
    address: friendTokenAddress,
    constructorArguments: [
      "0x671b2d2b41AF93A1DBeb9E72e68E3Ce1C018B845", // initialOwner
      ethers.parseEther("10000"), // maxSupply
    ],
  });

  console.log("Verifying GameFactory at:", gameFactoryAddress);
  await run("verify:verify", {
    address: gameFactoryAddress,
    constructorArguments: [
      friendTokenAddress, // tokenAddress
      "0x671b2d2b41AF93A1DBeb9E72e68E3Ce1C018B845", // initialOwner
      "0x0000000000000000000000000000000000000001", // resolverAddress
      "0x0000000000000000000000000000000000000002", // entryPointAddress
    ],
  });

  console.log("Verifying GameInstance at:", gameInstanceAddress);
  await run("verify:verify", {
    address: gameInstanceAddress,
    constructorArguments: [
      friendTokenAddress, // tokenAddress
      "0x671b2d2b41AF93A1DBeb9E72e68E3Ce1C018B845", // creator
      ethers.parseEther("50"), // stakeAmount
      5, // playerLimit
      "creator.base.eth", // basename
      "QmValidIpfsHash1234567890abcdef1234567890abcdef", // ipfsHash
      "0x0000000000000000000000000000000000000001", // resolverAddress
      "0x0000000000000000000000000000000000000002", // entryPointAddress
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });