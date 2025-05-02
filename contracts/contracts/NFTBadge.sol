// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title NFTBadge - ERC-721 contract for rewarding FriendChain game winners
/// @notice Adds role-based access control, minting, and metadata support
contract NFTBadge is ERC721URIStorage, AccessControl {
    // Admin address (deployer)
    address public admin;

    // Role for minting badges
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Address of the GameFactory contract
    address public immutable gameFactory;

    // Counter for total badges minted
    uint256 public totalBadgesMinted;

    // Base URI for badge metadata
    string private _baseTokenURI;

    // Events for access control and minting
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event BadgeMinted(address indexed recipient, uint256 tokenId);

    constructor(address initialGameInstance, address _gameFactory, string memory baseURI) 
        ERC721("FriendChain Badge", "FCB")
    {
        // Set the admin as the deployer
        admin = _msgSender();

        // Set the GameFactory address
        gameFactory = _gameFactory;

        // Set the base URI
        _baseTokenURI = baseURI;

        // Grant DEFAULT_ADMIN_ROLE to the admin
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // Grant MINTER_ROLE to the admin and initial GameInstance
        _grantRole(MINTER_ROLE, admin);
        _grantRole(MINTER_ROLE, initialGameInstance);

        // Initialize totalBadgesMinted
        totalBadgesMinted = 0;
    }

    /// @notice Authorizes a new GameInstance to mint badges, callable only by GameFactory
    /// @param gameInstance The address of the new GameInstance contract
    function authorizeGameInstance(address gameInstance) external {
        require(msg.sender == gameFactory, "NFTBadge: Caller must be GameFactory");
        _grantRole(MINTER_ROLE, gameInstance);
        emit MinterAdded(gameInstance);
    }

    /// @notice Adds a new minter, callable only by admin
    /// @param minter The address to grant MINTER_ROLE
    function addMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
        emit MinterAdded(minter);
    }

    /// @notice Removes a minter, callable only by admin
    /// @param minter The address to revoke MINTER_ROLE
    function removeMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, minter);
        emit MinterRemoved(minter);
    }

    /// @notice Mints a new badge to the specified recipient with a token URI
    /// @param recipient The address to receive the badge
    /// @param badgeTokenURI The URI for the badge's metadata
    /// @return tokenId The ID of the newly minted badge
    function mintBadge(address recipient, string memory badgeTokenURI) 
        external 
        onlyRole(MINTER_ROLE) 
        returns (uint256) 
    {
        uint256 tokenId = totalBadgesMinted;
        totalBadgesMinted += 1;
        
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, badgeTokenURI);
        
        emit BadgeMinted(recipient, tokenId);
        return tokenId;
    }

    /// @notice Returns the base URI for badge metadata
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @notice Update the base URI for all tokens
    /// @param newBaseURI The new base URI to set
    function setBaseURI(string memory newBaseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
    }

    /// @notice Required override for AccessControl and ERC721URIStorage
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}