# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```



Deploying contracts with account: 0x671b2d2b41AF93A1DBeb9E72e68E3Ce1C018B845
FriendToken deployed to: 0x4e83e8658B27BEF023eE431B1A2D97e6B3d014AD
GameFactory deployed to: 0x92612132Fce3542aDC196DF1b05b82ae48221452
Authorized creator: 0x671b2d2b41AF93A1DBeb9E72e68E3Ce1C018B845
GameInstance deployed to: 0xf8c6449B6Bd895E8d08fb2a23415E1aBcdC462bb
➜  contracts git:(main) ✗ npx hardhat run scripts/verify.js --network baseSepolia   
Verifying FriendToken at: 0x4e83e8658B27BEF023eE431B1A2D97e6B3d014AD
Successfully submitted source code for contract
contracts/FriendToken.sol:FriendToken at 0x4e83e8658B27BEF023eE431B1A2D97e6B3d014AD
for verification on the block explorer. Waiting for verification result...

Successfully verified contract FriendToken on the block explorer.
https://sepolia.basescan.org/address/0x4e83e8658B27BEF023eE431B1A2D97e6B3d014AD#code

Verifying GameFactory at: 0x92612132Fce3542aDC196DF1b05b82ae48221452
Successfully submitted source code for contract
contracts/GameFactory.sol:GameFactory at 0x92612132Fce3542aDC196DF1b05b82ae48221452
for verification on the block explorer. Waiting for verification result...

Successfully verified contract GameFactory on the block explorer.
https://sepolia.basescan.org/address/0x92612132Fce3542aDC196DF1b05b82ae48221452#code

Verifying GameInstance at: 0xf8c6449B6Bd895E8d08fb2a23415E1aBcdC462bb
Successfully submitted source code for contract
contracts/GameInstance.sol:GameInstance at 0xf8c6449B6Bd895E8d08fb2a23415E1aBcdC462bb
for verification on the block explorer. Waiting for verification result...

Successfully verified contract GameInstance on the block explorer.
https://sepolia.basescan.org/address/0xf8c6449B6Bd895E8d08fb2a23415E1aBcdC462bb#code

