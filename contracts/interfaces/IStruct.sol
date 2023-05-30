// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IStruct {
   struct Auction {
      address maker;
      address tokenAddress;
      address topBider;
      uint256 auctionID;
      uint256 tokenID;
      uint256 floorPrice;
      uint256 blockNo;
      uint256 topBidAmount;
      uint8 auctionStatus;
   }
}