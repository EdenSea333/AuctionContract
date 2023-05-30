// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IGNFT {
   function mintNFT(string calldata tokenURI_) external payable;

   function withDraw() external;
}