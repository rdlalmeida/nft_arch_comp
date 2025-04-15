/**
 * This test file emulates the scripts/04_gas_coverage_test.js but in a test format so that I can trigger the gas reporter tool
 * The idea is to test all the contract base function and get how much gas it spends
 */
const { ethers } = require('hardhat');
const { expect } = require('chai');
const { contractHelpers } = require('../../utils/contractHelper.js');
require('dotenv').config();

let contractInstance, action;
let contractName = 'ExampleNFT';
let nftName = 'ExampleNFT';
let nftSymbol = 'ENFT';
let constructorArguments;
let tokenId;
let signers, owner, signer01, signer02;
let mintTx, transferTx, burnTx;
let eventName, eventArgs;

// Begin counting time to determine the execution times of the whole scripts, as well as particular sections of it
console.time('ExampleNFT_test_execution');

before(
	'Setup the process variables and deploy the contract for a fresh run',
	async () => {
		console.time('Setup');

		// Get the signers array and select the first 3 for owner and signers
		signers = await ethers.getSigners();

		// This signer gets account #0, which is also used to deploy the contract
		owner = signers[0];
		signer01 = signers[1];
		signer02 = signers[2];
		constructorArguments = [owner.address, nftName, nftSymbol];

		[contractInstance, action] = await contractHelpers.processContract(
			contractName,
			constructorArguments
		);

		console.timeEnd('Setup');
	}
);

describe('Mint and transfer an Example NFT', async () => {
	it('Should mint an ExampleNFT into signer01 account', async () => {
		console.time('Mint'),
			(mintTx = await contractInstance.safeMint(
				signer01.address,
				0,
				'Test Example NFT #0'
			));

		eventName = 'Transfer';
		expect(mintTx).to.emit(contractInstance, eventName);

		eventArgs = await contractHelpers.saveEvents(mintTx, eventName);
		tokenId = eventArgs[2];

		await mintTx.wait();

		console.timeEnd('Mint');
	});

	it('Should transfer ExampleNFT token from signer01 to signer02', async () => {
		console.time('Transfer');

		transferTx = await contractInstance
			.connect(signer01)
			.safeTransferFrom(signer01.address, signer02.address, tokenId);

		eventName = 'Transfer';
		expect(transferTx).to.emit(contractInstance, eventName);

		await transferTx.wait();

		console.timeEnd('Transfer');
	});
});

describe('Burn the ExampleNFT', async () => {
	it('Should burn the Example NFT if the contract is connected to signer02', async () => {
		console.time('Burn'),
			(burnTx = await contractInstance.connect(signer02).burn(tokenId));

		eventName = 'Transfer';
		expect(burnTx).to.emit(contractInstance, eventName);

		await transferTx.wait();
		console.timeEnd('Burn');
	});
});

console.timeEnd('ExampleNFT_test_execution');
