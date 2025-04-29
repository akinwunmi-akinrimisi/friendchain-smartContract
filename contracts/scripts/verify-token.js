const hre = require("hardhat");

async function main() {
  const tokenAddress = "0x8A7d82633697bF2FC2250661A1173c6139f326B1";
  const Token = await hre.ethers.getContractFactory("FriendToken");
  const token = await Token.attach(tokenAddress);

  console.log("Name:", await token.name());
  console.log("Symbol:", await token.symbol());
  console.log("Decimals:", await token.decimals());
  console.log("Total Supply:", hre.ethers.formatEther(await token.totalSupply()));
  console.log("Owner Balance:", hre.ethers.formatEther(await token.balanceOf("0x671b2d2b41AF93A1DBeb9E72e68E3Ce1C018B845")));
  console.log("Max Supply:", hre.ethers.formatEther(await token.maxSupply()));
  console.log("Owner:", await token.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});