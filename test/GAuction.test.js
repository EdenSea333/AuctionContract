const { expect } = require('chai');
const { utils } = require('ethers');
const { ethers, upgrades, network } = require('hardhat');
const { deploy, deployProxy, getAt } = require('../scripts/utils');

const bigNum = num=>(num + '0'.repeat(18))
const smallNum = num=>(parseInt(num)/bigNum(1))
const tokenURI = 'https://gateway.pinata.cloud/ipfs/QmfUk1XLTrgQmbjwGw7sKa1DggNeZoYtk5JD4n4bq1eRHk';

describe('MarketPlace: Auction', function () {
   before (async function () {
      [
         this.owner,
         this.minter1,
         this.minter2,
         this.bider1,
         this.bider2,
         this.fund
      ] = await ethers.getSigners();

      this.GNFT = await deploy('GNFT', BigInt(10 ** 15));
      this.GAuction = await deploy('GAuction');
   })

   it ('mint NFT', async function () {

      await expect(
         this.GNFT.mintNFT(tokenURI)
      ).to.be.revertedWith('Insufficient value');

      await expect(
         this.GNFT.mintNFT(
            tokenURI,
            {value: ethers.utils.parseEther('0.001')}
         )
      ).to.be.emit(this.GNFT, 'mint')
      .withArgs(
         this.owner.address,
         tokenURI,
         0
      );

      expect (await this.GNFT.tokenURI(0)).to.be.equal(tokenURI);

      await this.GNFT.setFundAddress(this.fund.address);
      let oldBal = await ethers.provider.getBalance(this.fund.address);
      await this.GNFT.withDraw();
      expect (smallNum(await ethers.provider.getBalance(this.fund.address) - oldBal)).to.greaterThan(0);
   })

   it ('start, cancel, complete, claim auction with bidders', async function () {
      let curBlockNum = (await ethers.provider.getBlock()).number;
      
      await this.GNFT.setApprovalForAll(this.GAuction.address, true);
      await expect(
         this.GAuction.startAuction(
            this.GNFT.address,
            0,
            ethers.utils.parseEther('0.1'),
            curBlockNum + 10
         )
      ).to.be.emit(this.GAuction, 'StartAuction')
      .withArgs(
         this.owner.address,
         this.GNFT.address,
         0,
         ethers.utils.parseEther('0.1'),
         curBlockNum + 10
      );

      const auctions = await this.GAuction.getAuctions();
      expect (auctions.length).to.equal(1);
      const auctionID = auctions[0].auctionID;

      await expect(this.GAuction.bidAuction(auctionID + 1)).to.be.revertedWith('wrong auction ID');
      await expect(this.GAuction.bidAuction(auctionID)).to.be.revertedWith('sender is maker');
      await expect(this.GAuction.connect(this.bider1).bidAuction(auctionID)).to.be.revertedWith('wrong bid amount');

      await this.GAuction.connect(this.bider1).bidAuction(auctionID, {value: ethers.utils.parseEther('0.15')});
      await this.GAuction.connect(this.bider2).bidAuction(auctionID, {value: ethers.utils.parseEther('0.2')});

      await expect(
         this.GAuction.completeAuction(auctionID)
      ).to.be.revertedWith('not finished auction');

      await ethers.provider.send('evm_mine');
      await ethers.provider.send('evm_mine');
      await ethers.provider.send('evm_mine');

      await expect(
         this.GAuction.connect(this.bider2).bidAuction(
            auctionID, 
            {value: ethers.utils.parseEther('0.3')}
         )
      ).to.be.revertedWith('finished auction');

      await expect(this.GAuction.cancelAuction(auctionID + 1)).to.be.revertedWith('wrong auction ID');
      await expect(this.GAuction.connect(this.minter1).cancelAuction(auctionID)).to.be.revertedWith('no permission');
      await expect(this.GAuction.cancelAuction(auctionID)).to.be.revertedWith('biders exist');

      let oldNFTBal = await this.GNFT.balanceOf(this.bider2.address);
      let oldBal = await ethers.provider.getBalance(this.owner.address);
      await this.GAuction.claimAuction(auctionID);
      expect(await this.GNFT.balanceOf(this.bider2.address) - oldNFTBal).to.equal(1);
      expect (smallNum(await ethers.provider.getBalance(this.owner.address) - oldBal)).to.greaterThanOrEqual(0.199);
   })

   it ('start, cancel, complete, claim auction without bidders', async function () {
      let curBlockNum = (await ethers.provider.getBlock()).number;
      await this.GNFT.connect(this.bider2).setApprovalForAll(this.GAuction.address, true);
      await this.GAuction.connect(this.bider2).startAuction(
         this.GNFT.address,
         0,
         ethers.utils.parseEther('0.1'),
         curBlockNum + 10
      );

      let auctions = await this.GAuction.getAuctions();
      expect (auctions.length).to.equal(1);
      let auctionID = auctions[0].auctionID;

      await this.GAuction.connect(this.bider2).cancelAuction(auctionID);

      curBlockNum = (await ethers.provider.getBlock()).number;
      await this.GNFT.connect(this.bider2).setApprovalForAll(this.GAuction.address, true);
      await this.GAuction.connect(this.bider2).startAuction(
         this.GNFT.address,
         0,
         ethers.utils.parseEther('0.1'),
         curBlockNum + 2
      );

      auctions = await this.GAuction.getAuctions();
      expect (auctions.length).to.equal(1);
      auctionID = auctions[0].auctionID;

      await network.provider.send('evm_mine');
      await network.provider.send('evm_mine');
      await network.provider.send('evm_mine');

      await expect(
         this.GAuction.connect(this.bider2).cancelAuction(auctionID)
      ).to.be.revertedWith('finished auction');

      await this.GAuction.connect(this.bider2).completeAuction(auctionID);

      curBlockNum = (await ethers.provider.getBlock()).number;
      await this.GNFT.connect(this.bider2).setApprovalForAll(this.GAuction.address, true);
      await this.GAuction.connect(this.bider2).startAuction(
         this.GNFT.address,
         0,
         ethers.utils.parseEther('0.2'),
         curBlockNum + 5
      );

      auctions = await this.GAuction.getAuctions();
      auctionID = auctions[0].auctionID;

      await this.GAuction.connect(this.minter1).bidAuction(auctionID, {value: ethers.utils.parseEther('0.1')});
      let oldBal = await ethers.provider.getBalance(this.minter1.address);
      await network.provider.send('evm_mine');
      await network.provider.send('evm_mine');
      await network.provider.send('evm_mine');

      await this.GAuction.connect(this.bider2).completeAuction(auctionID);

      expect(smallNum(await ethers.provider.getBalance(this.minter1.address) - oldBal)).to.greaterThan(0);
   })
})