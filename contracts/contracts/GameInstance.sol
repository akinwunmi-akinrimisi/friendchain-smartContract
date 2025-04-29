// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GameInstance {
    address public tokenAddress;
    address public creator;
    uint256 public stakeAmount;
    uint256 public playerLimit;
    string public basename;
    string public ipfsHash;
    address public resolverAddress;
    address public entryPointAddress;

    constructor(
        address _tokenAddress,
        address _creator,
        uint256 _stakeAmount,
        uint256 _playerLimit,
        string memory _basename,
        string memory _ipfsHash,
        address _resolverAddress,
        address _entryPointAddress
    ) {
        tokenAddress = _tokenAddress;
        creator = _creator;
        stakeAmount = _stakeAmount;
        playerLimit = _playerLimit;
        basename = _basename;
        ipfsHash = _ipfsHash;
        resolverAddress = _resolverAddress;
        entryPointAddress = _entryPointAddress;
    }
}