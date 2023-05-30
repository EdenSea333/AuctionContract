// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IGNFT.sol";
import "hardhat/console.sol";

contract GNFT is ERC721, Ownable, ReentrancyGuard, IGNFT {
   mapping(uint256 => string) private tokenURIs;
   using Counters for Counters.Counter;
   using Strings for uint256;

   address private fundAddress;
   Counters.Counter tokenIDs;
   uint256 private mintPrice;

   event mint(
      address minter,
      string tokenURI,
      uint256 tokenID
   );

   constructor (uint256 mintPrice_) ERC721('Gelom NFT', 'GNFT') {
      mintPrice = mintPrice_;
      fundAddress = msg.sender;
   }

   function setFundAddress(address newAddr_) external onlyOwner {
      fundAddress = newAddr_;
   }

   function tokenURI(uint256 tokenID_) public view virtual override returns (string memory) {
      return tokenURIs[tokenID_];
   }

   function mintNFT(
      string calldata tokenURI_
   ) external payable nonReentrant override {
		require(msg.value >= mintPrice, "Insufficient value");
      uint256 newID = tokenIDs.current();
      _mint(msg.sender, newID);
      tokenIDs.increment();
      tokenURIs[newID] = tokenURI_;

      emit mint(msg.sender, tokenURI_, newID);
   }

   function withDraw() external override {
      uint256 balance = address(this).balance;
      if (balance > 0) {
         payable(fundAddress).transfer(balance);
      }
   }

   receive() external payable {}
}