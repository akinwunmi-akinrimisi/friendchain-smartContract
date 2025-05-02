require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Low value to focus on reducing code size
      },
      evmVersion: "paris", 
    },
  },
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY,
                process.env.PRIVATE_KEY_1,
                process.env.PRIVATE_KEY_2,
                process.env.PRIVATE_KEY_3,
                process.env.PRIVATE_KEY_4,
                process.env.PRIVATE_KEY_5,
                process.env.PRIVATE_KEY_6,
              ],
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY, // API key for Base Sepolia
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
  sourcify: {
    enabled: false, // Suppresses Sourcify warning
  },
};