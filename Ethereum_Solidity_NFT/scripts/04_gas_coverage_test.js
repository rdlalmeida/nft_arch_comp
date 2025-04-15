require('dotenv').config();
require('hardhat-gas-reporter');
const { network } = require('hardhat');
const { contractHelpers } = require('../../utils/contractHelper.js');

async function main() {
	// 1. Deploy ExampleNFT contract
	console.log('\n1. Deploy ExampleNFT contract\n');
	let contractName = 'ExampleNFT';

	// The ethers.provider.getSigner() always return the first account in the account array, I don't need to filter for the network
	// The ethers.getSigners() returns an array with all the configured accounts (objects) for the configured provider network.
	// NOTE: This is an account object, with an address property, not an address
	let accounts = await ethers.getSigners();

	let owner = accounts[0];
	let signer01 = accounts[1];
	let signer02 = accounts[2];

	let constructorArgs = [owner.address, 'ExampleNFT', 'ENFT'];

	let contractInstance, action;

	[contractInstance, action] = await contractHelpers.processContract(
		contractName,
		constructorArgs
	);

	// 2. Mint an Example NFT and set it to signer01
	let mintTx = await contractInstance.safeMint(
		signer01.address,
		0,
		'Test Example NFT #1'
	);

	// Grab the id of the token from the event
	let eventName = 'Transfer';
	let eventArgs = await contractHelpers.saveEvents(mintTx, eventName);

	// The 'Transfer' event returns 3 arguments in order: from, to and tokenId. Index 2 has the tokenId
	let tokenId = eventArgs[2];

	// Wait for the transaction to finish
	await mintTx.wait();
	console.log(
		'ExampleNFT #' + tokenId + ' minted to address ' + signer01.address
	);

	// 3. Transfer the Example NFT from signer01 to signer02
	// Need to connect the contract to signer01 first (to have it signing the transaction)
	let transferTx = await contractInstance
		.connect(signer01)
		.safeTransferFrom(signer01.address, signer02.address, tokenId);

	// Wait for the transfer to finish
	await transferTx.wait();
	console.log(
		'ExampleNFT #' +
			tokenId +
			' transferred from address ' +
			signer01.address +
			' to account ' +
			signer02.address
	);

	// 4. Burn the Example NFT that should be in signer02 account
	let burnTx = await contractInstance.connect(signer02).burn(tokenId);

	// Wait for the burn transaction to finish
	await burnTx.wait();
	console.log(
		'ExampleNFT #' + tokenId + ' burned from account ' + signer02.address
	);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
