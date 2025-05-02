const hre = require("hardhat");

async function main() {
  // Get signers and verify availability
  const signers = await hre.ethers.getSigners();
  if (signers.length < 7) {
    throw new Error(`Not enough signers available. Expected at least 7, but got ${signers.length}. Check your Hardhat configuration.`);
  }
  const [deployer, player1, player2, player3, player4, player5, player6] = signers;
  console.log("Deployer:", deployer.address);
  console.log("Player 1:", player1.address);
  console.log("Player 2:", player2.address);
  console.log("Player 3:", player3.address);
  console.log("Player 4:", player4.address);
  console.log("Player 5:", player5.address);
  console.log("Player 6:", player6.address);

  // Step 1: Deploy FriendToken for staking
  const Token = await hre.ethers.getContractFactory("FriendToken", deployer);
  const token = await Token.deploy(deployer.address, hre.ethers.parseEther("10000"));
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("FriendToken deployed to:", tokenAddress);
  console.log("Deployer balance after deployment:", hre.ethers.formatEther(await token.balanceOf(deployer.address)));

  // Mint tokens for players and wait for transactions to be mined
  const stakeAmount = hre.ethers.parseEther("50");
  try {
    const mintTx1 = await token.mint(player1.address, hre.ethers.parseEther("200"));
    await mintTx1.wait();
    console.log("Minted 200 tokens for Player 1");
  } catch (error) {
    console.error("Failed to mint tokens for Player 1:", error.message);
    throw error;
  }

  try {
    const mintTx2 = await token.mint(player2.address, hre.ethers.parseEther("200"));
    await mintTx2.wait();
    console.log("Minted 200 tokens for Player 2");
  } catch (error) {
    console.error("Failed to mint tokens for Player 2:", error.message);
    throw error;
  }

  try {
    const mintTx3 = await token.mint(player3.address, hre.ethers.parseEther("200"));
    await mintTx3.wait();
    console.log("Minted 200 tokens for Player 3");
  } catch (error) {
    console.error("Failed to mint tokens for Player 3:", error.message);
    throw error;
  }

  try {
    const mintTx4 = await token.mint(player4.address, hre.ethers.parseEther("200"));
    await mintTx4.wait();
    console.log("Minted 200 tokens for Player 4");
  } catch (error) {
    console.error("Failed to mint tokens for Player 4:", error.message);
    throw error;
  }

  try {
    const mintTx5 = await token.mint(player5.address, hre.ethers.parseEther("200"));
    await mintTx5.wait();
    console.log("Minted 200 tokens for Player 5");
  } catch (error) {
    console.error("Failed to mint tokens for Player 5:", error.message);
    throw error;
  }

  try {
    const mintTx6 = await token.mint(player6.address, hre.ethers.parseEther("200"));
    await mintTx6.wait();
    console.log("Minted 200 tokens for Player 6");
  } catch (error) {
    console.error("Failed to mint tokens for Player 6:", error.message);
    throw error;
  }

  console.log("Player 1 balance:", hre.ethers.formatEther(await token.balanceOf(player1.address)));
  console.log("Player 2 balance:", hre.ethers.formatEther(await token.balanceOf(player2.address)));
  console.log("Player 3 balance:", hre.ethers.formatEther(await token.balanceOf(player3.address)));
  console.log("Player 4 balance:", hre.ethers.formatEther(await token.balanceOf(player4.address)));
  console.log("Player 5 balance:", hre.ethers.formatEther(await token.balanceOf(player5.address)));
  console.log("Player 6 balance:", hre.ethers.formatEther(await token.balanceOf(player6.address)));

  // Step 2: Deploy the NFTBadge contract for testing
  const initialGameInstance = player1.address;
  const gameFactory = deployer.address;
  const baseURI = "https://ipfs.io/ipfs/";
  const NFTBadge = await hre.ethers.getContractFactory("NFTBadge", deployer);
  const nftBadge = await NFTBadge.deploy(initialGameInstance, gameFactory, baseURI);
  await nftBadge.waitForDeployment();
  const nftBadgeAddress = await nftBadge.getAddress();
  console.log("NFTBadge deployed to:", nftBadgeAddress);

  // Step 3: Deploy the GameInstance contract
  const gameId = 1;
  const playerLimit = 6;
  const basename = "creator.base.eth";
  const metadataIpfsHash = "QmValidIpfsHash1234567890abcdef1234567890abcdef";
  const resolverAddress = "0x0000000000000000000000000000000000000001";
  const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const GameInstance = await hre.ethers.getContractFactory("GameInstance", deployer);
  const gameInstance = await GameInstance.deploy(
    tokenAddress,
    deployer.address,
    gameId,
    stakeAmount,
    playerLimit,
    basename,
    metadataIpfsHash,
    resolverAddress,
    entryPointAddress,
    nftBadgeAddress
  );
  await gameInstance.waitForDeployment();
  const gameInstanceAddress = await gameInstance.getAddress();
  console.log("GameInstance deployed to:", gameInstanceAddress);

  // Grant MINTER_ROLE to GameInstance
  const MINTER_ROLE = await nftBadge.MINTER_ROLE();
  await nftBadge.grantRole(MINTER_ROLE, gameInstanceAddress);
  console.log("Granted MINTER_ROLE to GameInstance:", gameInstanceAddress);

  // Approve GameInstance to spend tokens for both players
  try {
    const approveTx1 = await token.connect(player1).approve(gameInstanceAddress, hre.ethers.parseEther("100"));
    await approveTx1.wait();
    console.log("Player 1 approved GameInstance to spend tokens");
  } catch (error) {
    console.error("Player 1 failed to approve tokens:", error.message);
    throw error;
  }

  try {
    const approveTx2 = await token.connect(player2).approve(gameInstanceAddress, hre.ethers.parseEther("100"));
    await approveTx2.wait();
    console.log("Player 2 approved GameInstance to spend tokens");
  } catch (error) {
    console.error("Player 2 failed to approve tokens:", error.message);
    throw error;
  }

  try {
    const approveTx3 = await token.connect(player3).approve(gameInstanceAddress, hre.ethers.parseEther("100"));
    await approveTx3.wait();
    console.log("Player 3 approved GameInstance to spend tokens");
  } catch (error) {
    console.error("Player 3 failed to approve tokens:", error.message);
    throw error;
  }

  try {
    const approveTx4 = await token.connect(player4).approve(gameInstanceAddress, hre.ethers.parseEther("100"));
    await approveTx4.wait();
    console.log("Player 4 approved GameInstance to spend tokens");
  } catch (error) {
    console.error("Player 4 failed to approve tokens:", error.message);
    throw error;
  }

  try {
    const approveTx5 = await token.connect(player5).approve(gameInstanceAddress, hre.ethers.parseEther("100"));
    await approveTx5.wait();
    console.log("Player 5 approved GameInstance to spend tokens");
  } catch (error) {
    console.error("Player 5 failed to approve tokens:", error.message);
    throw error;
  }

  try {
    const approveTx6 = await token.connect(player6).approve(gameInstanceAddress, hre.ethers.parseEther("100"));
    await approveTx6.wait();
    console.log("Player 6 approved GameInstance to spend tokens");
  } catch (error) {
    console.error("Player 6 failed to approve tokens:", error.message);
    throw error;
  }

  console.log("Player 1 allowance for GameInstance:", hre.ethers.formatEther(await token.allowance(player1.address, gameInstanceAddress)));
  console.log("Player 2 allowance for GameInstance:", hre.ethers.formatEther(await token.allowance(player2.address, gameInstanceAddress)));
  console.log("Player 3 allowance for GameInstance:", hre.ethers.formatEther(await token.allowance(player3.address, gameInstanceAddress)));
  console.log("Player 4 allowance for GameInstance:", hre.ethers.formatEther(await token.allowance(player4.address, gameInstanceAddress)));
  console.log("Player 5 allowance for GameInstance:", hre.ethers.formatEther(await token.allowance(player5.address, gameInstanceAddress)));
  console.log("Player 6 allowance for GameInstance:", hre.ethers.formatEther(await token.allowance(player6.address, gameInstanceAddress)));

  // Step 4: Test the game flow
  // Test 1: Players join the game
  console.log("\nTest 1: Players joining the game...");
  try {
    const tx1 = await gameInstance.connect(player1).joinGame("player.base.eth", "player1_twitter");
    await tx1.wait();
    console.log("Player 1 joined successfully");
    console.log("Player 1 basename:", await gameInstance.players(player1.address));
  } catch (error) {
    console.error("Player 1 failed to join:", error.message);
    throw error;
  }

  try {
    const tx2 = await gameInstance.connect(player2).joinGame("player2.base.eth", "player2_twitter");
    await tx2.wait();
    console.log("Player 2 joined successfully");
    console.log("Player 2 basename:", await gameInstance.players(player2.address));
  } catch (error) {
    console.error("Player 2 failed to join:", error.message);
    throw error;
  }

  try {
    const tx3 = await gameInstance.connect(player3).joinGame("player3.base.eth", "player3_twitter");
    await tx3.wait();
    console.log("Player 3 joined successfully");
    console.log("Player 3 basename:", await gameInstance.players(player3.address));
  } catch (error) {
    console.error("Player 3 failed to join:", error.message);
    throw error;
  }

  try {
    const tx4 = await gameInstance.connect(player4).joinGame("player4.base.eth", "player4_twitter");
    await tx4.wait();
    console.log("Player 4 joined successfully");
    console.log("Player 4 basename:", await gameInstance.players(player4.address));
  } catch (error) {
    console.error("Player 4 failed to join:", error.message);
    throw error;
  }

  try {
    const tx5 = await gameInstance.connect(player5).joinGame("player5.base.eth", "player5_twitter");
    await tx5.wait();
    console.log("Player 5 joined successfully");
    console.log("Player 5 basename:", await gameInstance.players(player5.address));
  } catch (error) {
    console.error("Player 5 failed to join:", error.message);
    throw error;
  }

  try {
    const tx6 = await gameInstance.connect(player6).joinGame("player6.base.eth", "player6_twitter");
    await tx6.wait();
    console.log("Player 6 joined successfully");
    console.log("Player 6 basename:", await gameInstance.players(player6.address));
  } catch (error) {
    console.error("Player 6 failed to join:", error.message);
    throw error;
  }

  console.log("Player count:", (await gameInstance.playerCount()).toString());


  // Test 2: Set questions and start the game
  console.log("\nTest 2: Setting questions and starting the game...");
  const questionsIpfsHash = "QmQuestionsIpfsHash1234567890abcdef1234567890";
  const correctAnswers = Array(15).fill(1); // All 15 questions have answer "1"
  try {
    const setQuestionsTx = await gameInstance.setQuestions(questionsIpfsHash, correctAnswers);
    const receipt = await setQuestionsTx.wait();
    console.log("Questions set transaction mined");

    // Check for QuestionsStored event
    const event = receipt.logs.find(log => {
      try {
        const parsedLog = gameInstance.interface.parseLog(log);
        return parsedLog && parsedLog.name === "QuestionsStored";
      } catch (e) {
        return false;
      }
    });
    if (event) {
      const parsedLog = gameInstance.interface.parseLog(event);
      console.log("QuestionsStored event emitted with gameId:", parsedLog.args[0].toString(), "and IPFS hash:", parsedLog.args[1]);
    } else {
      console.error("QuestionsStored event not found in transaction receipt");
    }
  } catch (error) {
    console.error("Failed to set questions:", error.message);
    throw error;
  }

  console.log("Questions IPFS hash:", await gameInstance.questionsIpfsHash());
  console.log("Game state before start:", (await gameInstance.gameState()).toString());
  console.log("Player count before start:", (await gameInstance.playerCount()).toString());
  console.log("Creator address:", await gameInstance.creator());

  try {
    const startTx = await gameInstance.startGame();
    await startTx.wait();
    console.log("Game started successfully");
    console.log("Game state after start:", (await gameInstance.gameState()).toString());
  } catch (error) {
    console.error("Failed to start game:", error.message);
    console.error("Error details:", error);
    throw error;
  }

  // Test 3: Players submit answers
    console.log("\nTest 3: Players submitting answers...");

    // Player 1: Answers all correctly
    for (let i = 1; i <= 15; i++) {
        console.log(`Player 1 submitting answer ${i} of 15...`);
        try {
            const tx = await gameInstance.connect(player1).submitAnswer(1);
            await tx.wait();
            console.log(`Player 1 answered question ${i} correctly`);
        } catch (error) {
            console.error(`Error for Player 1 answer ${i}:`, error.message);
            break;
        }
        const gameState = await gameInstance.gameState();
        if (gameState.toString() !== "1") {
            console.log(`Game ended early after Player 1's answer ${i}. Game state: ${gameState.toString()}`);
            break;
        }
    }
    if ((await gameInstance.gameState()).toString() === "1") {
        console.log("Player 1 score:", (await gameInstance.playerScores(player1.address)).toString());
    }
    
    // Player 2: Answers 5 questions (eliminated at stage 0)
    for (let i = 1; i <= 5; i++) {
        console.log(`Player 2 submitting answer ${i} of 5...`);
        const answer = (i == 3) ? 2 : 1; // Changed from 0 to 2 to avoid InvalidAnswer
        try {
            const tx = await gameInstance.connect(player2).submitAnswer(answer);
            await tx.wait();
            console.log(`Player 2 answered question ${i}`);
        } catch (error) {
            console.error(`Error for Player 2 answer ${i}:`, error.message);
            break;
        }
        const gameState = await gameInstance.gameState();
        if (gameState.toString() !== "1") {
            console.log(`Game ended early after Player 2's answer ${i}. Game state: ${gameState.toString()}`);
            break;
        }
    }
    console.log("Player 2 eliminated:", await gameInstance.eliminatedPlayers(player2.address));
    
    // Player 3: Answers 10 questions (eliminated at stage 1)
    for (let i = 1; i <= 10; i++) {
        console.log(`Player 3 submitting answer ${i} of 10...`);
        const answer = (i == 7) ? 2 : 1; // Changed from 0 to 2 to avoid InvalidAnswer
        try {
            const tx = await gameInstance.connect(player3).submitAnswer(answer);
            await tx.wait();
            console.log(`Player 3 answered question ${i}`);
        } catch (error) {
            console.error(`Error for Player 3 answer ${i}:`, error.message);
            break;
        }
        const gameState = await gameInstance.gameState();
        if (gameState.toString() !== "1") {
            console.log(`Game ended early after Player 3's answer ${i}. Game state: ${gameState.toString()}`);
            break;
        }
    }
    console.log("Player 3 eliminated:", await gameInstance.eliminatedPlayers(player3.address));
    
    // Player 4: Answers all but fails stage 2
    for (let i = 1; i <= 15; i++) {
        console.log(`Player 4 submitting answer ${i} of 15...`);
        const answer = (i == 12) ? 2 : 1; // Changed from 0 to 2 to avoid InvalidAnswer
        try {
            const tx = await gameInstance.connect(player4).submitAnswer(answer);
            await tx.wait();
            console.log(`Player 4 answered question ${i}`);
        } catch (error) {
            console.error(`Error for Player 4 answer ${i}:`, error.message);
            break;
        }
        const gameState = await gameInstance.gameState();
        if (gameState.toString() !== "1") {
            console.log(`Game ended early after Player 4's answer ${i}. Game state: ${gameState.toString()}`);
            break;
        }
    }
    console.log("Player 4 eliminated:", await gameInstance.eliminatedPlayers(player4.address));
    
    // Player 5: Answers all correctly (slower)
    for (let i = 1; i <= 15; i++) {
        console.log(`Player 5 submitting answer ${i} of 15...`);
        try {
            const tx = await gameInstance.connect(player5).submitAnswer(1);
            await tx.wait();
            console.log(`Player 5 answered question ${i} correctly`);
        } catch (error) {
            console.error(`Error for Player 5 answer ${i}:`, error.message);
            break;
        }
        if (i % 5 == 0 && i < 15) await new Promise(resolve => setTimeout(resolve, 2000)); // Reverted to original 2-second delay
        const gameState = await gameInstance.gameState();
        if (gameState.toString() !== "1") {
            console.log(`Game ended early after Player 5's answer ${i}. Game state: ${gameState.toString()}`);
            break;
        }
    }
    if ((await gameInstance.gameState()).toString() === "1") {
        console.log("Player 5 score:", (await gameInstance.playerScores(player5.address)).toString());
    }
    
    // Player 6: Answers all correctly (faster, but with minimal delay)
    for (let i = 1; i <= 15; i++) {
        console.log(`Player 6 submitting answer ${i} of 15...`);
        try {
            const tx = await gameInstance.connect(player6).submitAnswer(1);
            await tx.wait();
            console.log(`Player 6 answered question ${i} correctly`);
        } catch (error) {
            console.error(`Error for Player 6 answer ${i}:`, error.message);
            break;
        }
        if (i % 5 == 0 && i < 15) await new Promise(resolve => setTimeout(resolve, 1000)); // Reverted to original 1-second delay
        const gameState = await gameInstance.gameState();
        if (gameState.toString() !== "1") {
            console.log(`Game ended early after Player 6's answer ${i}. Game state: ${gameState.toString()}`);
            break;
        }
    }
    if ((await gameInstance.gameState()).toString() === "1") {
        console.log("Player 6 score:", (await gameInstance.playerScores(player6.address)).toString());
    }

  // Test 4: Verify game ended and badge was minted
  console.log("\nTest 4: Verifying game ended and badge was minted...");
  console.log("Game state:", (await gameInstance.gameState()).toString());
  
  try {
    const badgeOwner = await nftBadge.ownerOf(0);
    console.log("Badge owner (should be Player 1):", badgeOwner);
    const tokenURI = await nftBadge.tokenURI(0);
    console.log("Badge token URI:", tokenURI);
  } catch (error) {
    console.error("Failed to verify badge minting:", error.message);
    console.error("Error details:", error);
  }

  console.log("\nGameInstance tests completed.");
}

// Run main function and catch any errors
main().catch((error) => {
  console.error("Error during testing:", error);
  process.exitCode = 1;
});