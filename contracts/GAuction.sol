// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IStruct.sol";
import "hardhat/console.sol";

contract GAuction is ReentrancyGuard, Ownable, IStruct {
   using Counters for Counters.Counter;

   Auction[] private auctions;
   Counters.Counter auctionCount;

   uint8 private immutable AUCTION_ON = 0;
   uint8 private immutable AUCTION_FINISHED = 1;
   uint8 private immutable AUCTION_CLAIMED = 2;

   event StartAuction(
      address maker,
      address tokenAddress,
      uint256 tokenID,
      uint256 floorPrice,
      uint256 blockNo
   );

   function startAuction(
      address tokenAddress_,
      uint256 tokenID_,
      uint256 floorPrice_,
      uint256 blockNo_
   ) external nonReentrant {
      IERC721 token = IERC721(tokenAddress_);
      require (token.ownerOf(tokenID_) == msg.sender, 'not owner');
      require (floorPrice_ > 0, 'wrong floor price');
      require (blockNo_ >= block.number, 'wrong block number');

      token.transferFrom(msg.sender, address(this), tokenID_);
      
      auctions.push(Auction({
         maker: msg.sender,
         tokenAddress: tokenAddress_,
         topBider: address(0),
         auctionID: auctions.length,
         tokenID: tokenID_,
         floorPrice: floorPrice_,
         blockNo: blockNo_,
         topBidAmount: 0,
         auctionStatus: AUCTION_ON
      }));

      auctionCount.increment();

      emit StartAuction(
         msg.sender,
         tokenAddress_,
         tokenID_,
         floorPrice_,
         blockNo_
      );
   }

   function cancelAuction(uint256 auctionID_) external {
      require (auctions.length > auctionID_, 'wrong auction ID');
      Auction memory auction = auctions[auctionID_];
      require (auction.maker == msg.sender, 'no permission');
      require (auction.auctionStatus == AUCTION_ON, 'already finished');
      require (auction.topBider == address(0), 'biders exist');
      
      if (auction.blockNo < block.number) {
         auction.auctionStatus = AUCTION_FINISHED;
         revert ('finished auction');
      }

      IERC721 token = IERC721(auction.tokenAddress);
      token.transferFrom(address(this), auction.maker, auction.tokenID);
      auctionCount.decrement();
      auctions[auctionID_].auctionStatus = AUCTION_CLAIMED;
   }

   function completeAuction(uint256 auctionID_) public {
      require (auctions.length > auctionID_, 'wrong auction ID');
      Auction memory auction = auctions[auctionID_];
      require (auction.auctionStatus == AUCTION_ON, 'already finished');
      
      if (auction.blockNo >= block.number) {
         revert ('not finished auction');
      }

      IERC721 token = IERC721(auction.tokenAddress);
      if (auction.topBider != address(0)) {
         if (auction.topBidAmount >= auction.floorPrice) {
            token.transferFrom(address(this), auction.topBider, auction.tokenID);
         } else {
            token.transferFrom(address(this), auction.maker, auction.tokenID);   
            payable(auction.topBider).transfer(auction.topBidAmount);
            auctions[auctionID_].auctionStatus = AUCTION_CLAIMED;
            return;
         }
      } else {
         token.transferFrom(address(this), auction.maker, auction.tokenID);
      }
      
      auctionCount.decrement();
      auctions[auctionID_].auctionStatus = AUCTION_FINISHED;
   }

   function claimAuction(uint256 auctionID_) external nonReentrant {
      require (auctions.length > auctionID_, 'wrong auction ID');
      Auction memory auction = auctions[auctionID_];
      require (auction.maker == msg.sender, 'no permission');
      require (auction.auctionStatus == AUCTION_FINISHED || auction.auctionStatus == AUCTION_ON, 'can not claim');

      if (auction.auctionStatus == AUCTION_ON) {
         completeAuction(auctionID_);
      }

      auctions[auctionID_].auctionStatus = AUCTION_CLAIMED;
      payable(msg.sender).transfer(auction.topBidAmount);
   }

   function bidAuction(uint256 auctionID_) external payable nonReentrant {
      require (auctions.length > auctionID_, 'wrong auction ID');
      Auction storage auction = auctions[auctionID_];
      require (auction.maker != msg.sender, 'sender is maker');
      require (auction.auctionStatus == AUCTION_ON, 'already finished');
      require (auction.blockNo >= block.number, 'finished auction');

      require (auction.topBidAmount < msg.value, 'wrong bid amount');
      if (auction.topBider != address(0)) {
         payable(auction.topBider).transfer(auction.topBidAmount);
      }

      auction.topBidAmount = msg.value;
      auction.topBider = msg.sender;
   }

   function getAuctions() external view returns(Auction[] memory) {
      Auction[] memory surviveAuction = new Auction[](auctionCount.current());

      uint256 cnt = 0;
      uint56 index = 0;
      for (uint256 i = 0; i < auctions.length; i ++) {
         if (auctions[i].blockNo >= block.number && auctions[i].auctionStatus == AUCTION_ON) {
            surviveAuction[index ++] = auctions[i];
            cnt ++;
         }
      }

      Auction[] memory resp = new Auction[](cnt);

      for (uint256 i = 0; i < cnt; i ++) {
         resp[i] = surviveAuction[i];
      }

      return resp;
   }
}