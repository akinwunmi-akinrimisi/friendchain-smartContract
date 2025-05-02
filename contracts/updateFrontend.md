Update lib/config.js

Replace the existing lib/config.js with the updated version, but make sure to use the actual GameFactory address from your deployment.

    Open lib/config.js:
        Navigate to frontend/lib/config.js in your code editor (e.g., VS Code, or use a text editor like nano):
        bash

    nano frontend/lib/config.js

Replace the Content:

    Copy the following content and paste it into lib/config.js, replacing the GAME_FACTORY address with the actual address from your deployment output:
    javascript

module.exports = {
  CONTRACT_ADDRESSES: {
    FRIEND_TOKEN: "0x8bF05884EA666706F92FD0134076e15d3dd7B0CD",
    GAME_INSTANCE: "0x4EF7e15D67F4aB205a6753CB0A266F48f000f8c0",
    GAME_FACTORY: "0xEd424E2936662797c2ada33af2960F3f7CCa8C85", 
  },
  NETWORK: {
    CHAIN_ID: 84532, // Base Sepolia testnet chain ID
    NAME: "Base Sepolia",
    RPC_URL: "https://sepolia.base.org",
  },
};


3.3: Update lib/utils/contract.js

Replace the existing lib/utils/contract.js with the updated version.

    Open lib/utils/contract.js:
        Navigate to frontend/lib/utils/contract.js:
        bash

    nano frontend/lib/utils/contract.js

Replace the Content:

    Copy the following content and paste it into lib/utils/contract.js:
    javascript

        const ethers = require("ethers");
        const FriendTokenABI = require("../contracts/FriendTokenABI.json");
        const GameInstanceABI = require("../contracts/GameInstanceABI.json");
        const GameFactoryABI = require("../contracts/GameFactoryABI.json");
        const { CONTRACT_ADDRESSES, NETWORK } = require("../config");

        // Initialize provider (MetaMask or Smart Wallet)
        function getProvider() {
          if (window.ethereum) {
            return new ethers.BrowserProvider(window.ethereum);
          }
          throw new Error("No Ethereum provider found. Please install MetaMask.");
        }

        // Initialize contracts
        async function getFriendTokenContract(signer) {
          return new ethers.Contract(
            CONTRACT_ADDRESSES.FRIEND_TOKEN,
            FriendTokenABI,
            signer
          );
        }

        async function getGameInstanceContract(signer, gameAddress = CONTRACT_ADDRESSES.GAME_INSTANCE) {
          return new ethers.Contract(gameAddress, GameInstanceABI, signer);
        }

        async function getGameFactoryContract(signer) {
          return new ethers.Contract(
            CONTRACT_ADDRESSES.GAME_FACTORY,
            GameFactoryABI,
            signer
          );
        }

        // Switch to Base Sepolia network
        async function switchNetwork() {
          const provider = getProvider();
          try {
            await provider.send("wallet_switchEthereumChain", [
              { chainId: `0x${NETWORK.CHAIN_ID.toString(16)}` },
            ]);
          } catch (switchError) {
            if (switchError.code === 4902) {
              await provider.send("wallet_addEthereumChain", [
                {
                  chainId: `0x${NETWORK.CHAIN_ID.toString(16)}`,
                  chainName: NETWORK.NAME,
                  rpcUrls: [NETWORK.RPC_URL],
                },
              ]);
            } else {
              throw switchError;
            }
          }
        }

        module.exports = {
          getProvider,
          getFriendTokenContract,
          getGameInstanceContract,
          getGameFactoryContract,
          switchNetwork,
        };
        Save the file.

3.4: Update src/components/Marketplace.js

Replace the existing Marketplace.js with the updated version.

    Open src/components/Marketplace.js:
        Navigate to frontend/src/components/Marketplace.js:
        bash

    nano frontend/src/components/Marketplace.js

Replace the Content:

    Copy the following content and paste it into Marketplace.js:
    javascript

        const React = require("react");
        const { useState, useEffect } = React;
        const { Link } = require("react-router-dom");
        const { getGameFactoryContract, getGameInstanceContract } = require("../../lib/utils/contract");
        const ethers = require("ethers");

        const Marketplace = ({ setGameAddress }) => {
          const [games, setGames] = useState([]);
          const [signer, setSigner] = useState(null);

          useEffect(() => {
            const initializeSigner = async () => {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const signer = await provider.getSigner();
              setSigner(signer);
            };
            initializeSigner();
          }, []);

          useEffect(() => {
            const fetchGames = async () => {
              if (!signer) return;
              try {
                const gameFactoryContract = await getGameFactoryContract(signer);
                const gameAddresses = await gameFactoryContract.getGameInstances();

                const gameDetails = await Promise.all(
                  gameAddresses.map(async (address) => {
                    const gameInstanceContract = await getGameInstanceContract(signer, address);
                    const details = await gameFactoryContract.getGameDetails(address);

                    return {
                      address,
                      creatorBasename: details.basename,
                      stake: ethers.formatEther(details.stakeAmount),
                      state: ["Open", "InProgress", "Ended"][details.gameState],
                    };
                  })
                );

                setGames(gameDetails);
              } catch (error) {
                console.error("Failed to fetch games:", error);
              }
            };
            fetchGames();
          }, [signer]);

          return (
            <div>
              <h2>Marketplace</h2>
              <div className="game-grid">
                {games.map((game, index) => (
                  <div key={index} className="game-card">
                    <p>Game by {game.creatorBasename}</p>
                    <p>Stake: {game.stake} FRIEND</p>
                    <p>State: {game.state}</p>
                    <Link to={`/game-lobby/${game.address}`}>
                      <button onClick={() => setGameAddress(game.address)}>Join Game</button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        };

        module.exports = Marketplace;
        Save the file.

3.5: Update README.md Files

Update the README.md files in both the contracts and frontend directories with the new GameFactory address.

    Update contracts/README.md:

        Nav

igate to contracts/README.md:
bash
nano contracts/README.md

Replace the content with:
markdown
# FriendChain Smart Contracts

Smart contracts for the FriendChain MVP, deployed on Base Sepolia testnet.

## Deployed Contracts

- **FriendToken**: `0x8bF05884EA666706F92FD0134076e15d3dd7B0CD`
- **GameInstance**: `0x4EF7e15D67F4aB205a6753CB0A266F48f000f8c0`
- **GameFactory**: `0x9876543210fedcba9876543210fedcba98765432`

## Deployment

1. **Install Dependencies**:
   ```bash
   npm install

    Compile Contracts:
    bash