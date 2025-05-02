const hre = require("hardhat");

   async function main() {
     const [deployer] = await hre.ethers.getSigners();
     console.log("Updating base URI with account:", deployer.address);

     const nftBadgeAddress = "0xEadeE77776E47b262e81Fcf1101dA23117800270"; // Deployed contract address
     const NFTBadge = await hre.ethers.getContractAt("NFTBadge", nftBadgeAddress);

     const newBaseURI = "https://ipfs.io/ipfs/";
     const tx = await NFTBadge.connect(deployer).setBaseURI(newBaseURI);
     await tx.wait();
     console.log("setBaseURI transaction hash:", tx.hash);
     console.log("Base URI updated to:", newBaseURI);

     // Verify the token URI
     const tokenId = 0;
     const tokenURI = await NFTBadge.tokenURI(tokenId);
     console.log("Token URI for tokenId 0:", tokenURI);
   }

   main().catch((error) => {
     console.error("Error updating base URI:", error);
     process.exitCode = 1;
   });