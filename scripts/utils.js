const { ethers, upgrades, network } = require("hardhat")
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const fs = require('fs')

const updateABI = async (contractName)=>{
    const abiDir = `${__dirname}/../abi`;
    if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir);
    }
    const Artifact = artifacts.readArtifactSync(contractName);
    fs.writeFileSync(
        `${abiDir}/${contractName}.json`,
        JSON.stringify(Artifact.abi, null, 2)
    )
}
  
const deploy = async (contractName, ...args)=>{
    const factory = await ethers.getContractFactory(contractName)
    const contract = await factory.deploy(...args)
    await contract.deployed()
    await updateABI(contractName)
    await verify(contract.address,[...args])
    console.log(contractName, contract.address)
    return contract
}
  
const deployProxy = async (contractName, args = [])=>{
    const factory = await ethers.getContractFactory(contractName)
    const contract = await upgrades.deployProxy(factory,args)
    await contract.deployed()
    const implAddress = await getImplementationAddress(ethers.provider, contract.address);
    await updateABI(contractName)
    await verify(implAddress,args)
    console.log(contractName, contract.address, implAddress)
    return contract
}
  
const upgradeProxy = async (contractName, contractAddress)=>{
    const factory = await ethers.getContractFactory(contractName)
    const contract = await upgrades.upgradeProxy(contractAddress, factory)
    await contract.deployed()
    const implAddress = await getImplementationAddress(ethers.provider, contract.address);
    await updateABI(contractName)
    await verify(implAddress)
    console.log(contractName, contract.address)
    return contract
}

const getAt = async (contractName, contractAddress)=>{
    return await ethers.getContractAt(contractName, contractAddress)
}

const verify = async (contractAddress, args = [])=> {
    if(network=='localhost' || network=='hardhat') return
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        });
    } catch(ex) {}
}

module.exports = {
    getAt, deploy, deployProxy, upgradeProxy
}