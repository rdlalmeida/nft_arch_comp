require("dotenv").config();
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("ethers");
const { METAMASK_PRIV_KEY, METAMASK_SEPOLIA_ACCOUNT } = process.env;


module.exports = buildModule("AnotherNFTDeployerModule", (module) => {

    // How to get the account object from a local account (does not work with a testnet)
    // const deployer = module.getAccount(0);
    // let deployer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    let deployer = "0x97E4D02EFc1e247d819D30b93C5A269EBf53Fec9";

    // This one is the "real" metamask account with Sepolia test ETH
    // let deployer = `0x${METAMASK_PRIV_KEY}`;
    // let deployer = METAMASK_SEPOLIA_ACCOUNT;
    const nftContract = module.contract("AnotherNFT", [deployer, "AnotherNFT", "ANFT"]);

    // module.call(nftContract, "saySomething", ["Ricardo"]);

    let response = module.staticCall(nftContract, "saySomething", ["Daniel"]);

    // console.log("Response = ", response);

    return {
        nftContract
    };
});
