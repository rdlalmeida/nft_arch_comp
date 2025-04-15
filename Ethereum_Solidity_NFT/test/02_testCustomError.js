require('dotenv').config();
const { contractHelpers } = require('../../utils/contractHelper.js');
const { ethers } = require('hardhat');
const { expect } = require('chai');

describe.skip('Test the custom error capabilities of the contract', async () => {
	it.skip('Should revert the transaction with the custom error message', async () => {
		let contractInstance;
		let signers = await ethers.getSigners();

		let constructor_arguments = [signers[0].address, 'ExampleNFT', 'ENFT'];

		[contractInstance, action] = await contractHelpers.processContract(
			'ExampleNFT',
			constructor_arguments
		);

		let my_message = 'Ricardo custom error message';

		let another_message = await contractInstance.saySomething();

		console.log(another_message);

		await expect(
			contractInstance.testError()
		).to.be.revertedWithCustomError(
			contractInstance,
			'ERC721NonexistentToken'
		);

		console.log('Done!');
	});
});
