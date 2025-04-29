// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Custom errors for gas-efficient reverts
error CapExceeded();
error Unauthorized(); // Note: Not used in contract but included as provided

/// @title FriendToken - ERC-20 token for FriendChain MVP
/// @notice Implements Friend (FRND) token with minting and hard cap for testnet
contract FriendToken is ERC20, Ownable {
    // Optional hard cap on total supply (0 means no cap)
    uint256 public maxSupply;

    // Event for minting transparency
    event Mint(address indexed to, uint256 amount);

    /// @notice Initializes token with 1000 FRND to owner
    /// @param initialOwner Platform creator's address
    /// @param _maxSupply Optional hard cap (e.g., 10,000 * 10^18 for testnet)
    constructor(address initialOwner, uint256 _maxSupply)
        ERC20("Friend", "FRND")
        Ownable(initialOwner)
    {
        maxSupply = _maxSupply;
        _mint(initialOwner, 1000 * 10**decimals());
    }

    /// @notice Mints tokens to specified address (owner-only)
    /// @param to Recipient address
    /// @param amount Amount to mint (in wei)
    function mint(address to, uint256 amount) public onlyOwner {
        if (maxSupply > 0 && totalSupply() + amount > maxSupply) {
            revert CapExceeded();
        }
        _mint(to, amount);
        emit Mint(to, amount);
    }

    /// @notice Returns token decimals (18)
    /// @return uint8 Number of decimals
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}