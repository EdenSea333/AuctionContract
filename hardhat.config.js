/**
 * @type import('hardhat/config').HardhatUserConfig
 */
 require("@nomiclabs/hardhat-waffle");
 require('@nomiclabs/hardhat-ethers');
 require("@nomiclabs/hardhat-etherscan");
 require("hardhat-contract-sizer");
 require("solidity-coverage");
 
 const { deployerWalletPrivateKey } = require('./secrets.json');
 const { etherscanAPIkey } = require('./secrets.json');
 
 module.exports = {
   defaultNetwork: "hardhat",
   networks: {
     hardhat: {
       allowUnlimitedContractSize: true,
     },
     ropsten: {
       url: "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
       chainId: 3,
       accounts: [deployerWalletPrivateKey],
       allowUnlimitedContractSize: true,
     },
     rinkeby: {
       url: "https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
       chainId: 4,
       accounts: [deployerWalletPrivateKey],
       allowUnlimitedContractSize: true,
     },
     mumbai: {
       url: "https://rpc-mumbai.maticvigil.com",
       chainId: 80001,
       accounts: [deployerWalletPrivateKey],
       allowUnlimitedContractSize: true,
     }
   },
   solidity: {
     compilers: [
       {
         version: '0.8.0',
         settings: {
           optimizer: {
             enabled: true,
             runs: 200
           },
         },
       },
       {
         version: '0.8.4',
         settings: {
           optimizer: {
             enabled: true,
             runs: 200
           },
         },
       },
       {
         version: '0.7.5',
         settings: {
           optimizer: {
             enabled: true,
             runs: 200
           },
         },
       },
     ],
   },
   etherscan: {
     apiKey: etherscanAPIkey
   },
   mocha: {
     timeout: 200000
   }
 };
 