const { ethers } = require('hardhat');
const { expect } = require('chai');
require('dotenv').config();
const chalk = require('chalk');

const { contractHelpers } = require('../../utils/contractHelper.js');
const { getAllSimpleStorage } = require('../../utils/storageHelper.js');

const BigNumber = require('bignumber.js');
const util = require('util');

let contractInstance, action;
let contractName = 'ExampleNFT';
let nftName = 'ExampleNFT';
let nftSymbol = 'ENFT';
let constructorArguments;
let signers, owner, signer01, signer02;
let contractAddress;

before('Setup the base parameters for the exercise', async () => {
	signers = await ethers.getSigners();
	owner = signers[0];
	signer01 = signers[1];
	signer02 = signers[2];
	constructorArguments = [owner.address, nftName, nftSymbol];
});

describe('When accessing ExampleNFT storage', () => {
	it('should deploy the ExampleNFT contract', async () => {
		[contractInstance, action] = await contractHelpers.processContract(
			contractName,
			constructorArguments
		);

		contractAddress = await contractInstance.getAddress();
	});

	it('should have various storage in different slots', async () => {
		let totalSupply = await contractInstance.getTotalSupply();
		let nextTokenId = await contractInstance.getNextTokenId();
		let name = await contractInstance.name();
		let symbol = await contractInstance.symbol();

		console.log('local variables: ');
		console.log(
			chalk.yellow(
				'totalSupply: ',
				ethers.hexlify(ethers.toUtf8Bytes(totalSupply.toString()))
			)
		);
		console.log(
			chalk.magenta(
				'nextTokenId: ',
				ethers.hexlify(ethers.toUtf8Bytes(nextTokenId.toString()))
			)
		);
		console.log(
			chalk.magenta('name: ', ethers.hexlify(ethers.toUtf8Bytes(name)))
		);
		console.log(
			chalk.magenta(
				'symbol: ',
				ethers.hexlify(ethers.toUtf8Bytes(symbol))
			)
		);
		console.log(chalk.magenta('owner: ', owner.address));

		const simpleStorage = await getAllSimpleStorage(contractAddress);

		console.log('Storage: ');
		console.log(util.inspect(simpleStorage, false, null));
	});
});
