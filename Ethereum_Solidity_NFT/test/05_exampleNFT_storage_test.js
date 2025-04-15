const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const util = require('util');
const { contractHelpers } = require('../../utils/contractHelper.js');
const {
	getAllSimpleStorage,
	getTrimmedStringFromStorage,
	hexToASCII,
	getMappingSlot,
	getMappingStorage,
	getNestedMappingStorage,
	findMappingStorage,
	findNestedMappingStorage,
} = require('../../utils/storageHelper.js');

const { assert, expect } = require('chai');

let contractInstance = null,
	action = null;
let simpleStorage;
let contractAddress = null;
let constructorArguments;
let signers;
let owner = null,
	signer01 = null,
	signer02 = null;
let tokenId01 = null,
	tokenId02 = null;

const name = 'ExampleNFT';
const symbol = 'ENFT';

/**
 *  This function is quite specific and serves as a shortcut to extract and count all data currently stored in the arrangement of mappings in this contract. In the exercise
 *  considered thus far, there are only 4 actors, i.e., 4 elements to be used as keys to retrieve the values in the mappings, namely: owner.address, signer01.address,
 *  signer02.address and tokenId. This contract with its dependencies establishes the following mappings:
 *  ExampleNFT.sol
 *      ERC721.sol
 *          (uint256 tokenId    => address) _owners
 *          (address owner      => uint256) _balances
 *          (uint256 tokenId    => address) _tokenApprovals
 *          (address owner => (address operator => bool)) _operatorApprovals
 *
 *      ERC721URIStorage.sol
 *          (uint256 tokenId    => string) _tokenURIs
 *
 *  Because Solidity is a bit dumb when it comes to find out where mapping values really are, I need this function to automate the whole process.
 */
async function analyseStorage() {
	// Start by validating the required structures
	if (contractInstance == null) {
		console.error('Unable to continue: missing a valid contractInstance!');
		process.exit(1);
	} else if (owner == null) {
		console.error('Unable to continue: missing a valid owner!');
		process.exit(1);
	} else if (signer01 == null) {
		console.error('Unable to continue: missing a valid signer01!');
		process.exit(1);
	} else if (signer02 == null) {
		console.error('Unable to continue: missing a valid signer02!');
		process.exit(1);
	}

	let totalStorage = 0;
	let totalMappingStorage = 0;
	let totalSimpleStorage = 0;

	// Proceed
	if (tokenId01 != null) {
		console.log(chalk.yellow('_owners: '));
		let currentOwner = await contractInstance.getTokenOwner(tokenId01);
		console.log(
			chalk.red(
				'tokenId ',
				tokenId01.toString(),
				' => ',
				currentOwner.toString()
			)
		);

		// Addresses are stored into 20 byte long variables.
		totalMappingStorage += 20;
	}

	let signers = [owner.address, signer01.address, signer02.address];
	console.log(chalk.yellow('_balances: '));

	let userBalance;

	for (i = 0; i < signers.length; i++) {
		userBalance = await contractInstance.balanceOf(signers[i]);

		console.log(
			chalk.red('address: ', signers[i], ' => ', userBalance.toString())
		);

		if (Number(userBalance) != 0) {
			// Balances are stored in unsigned integers of 256 bits, i.e., 32 bytes. But solidity only stores balances != 0 to save resources, so it only reserves spaces for values != 0
			totalMappingStorage += 32;
		}
	}

	if (tokenId01 != null) {
		console.log(chalk.yellow('_tokenApprovals:'));
		let tokenApproval = await contractInstance.getTokenApproval(tokenId01);
		console.log(chalk.red(tokenApproval));

		console.log(chalk.yellow('_tokenURIs: '));
		let tokenURI = await contractInstance.getTokenMetadata(tokenId01);
		console.log(
			chalk.red('tokenId ', tokenId01.toString(), ' => ', tokenURI)
		);

		// I have a function to return the token metadata in bytes already in the contract
		let tokenMetadataSize =
			await contractInstance.getMetadataSize(tokenId01);

		totalMappingStorage += Number(tokenMetadataSize);
	}

	console.log(
		chalk.green('Total mapping storage: ', totalMappingStorage, ' Bytes')
	);

	// Count the simple storage slots used. Each contributes with 32 bytes each
	simpleStorage = await getAllSimpleStorage(contractAddress);

	let emptySlot =
		'0x0000000000000000000000000000000000000000000000000000000000000000';

	for (i = 0; i < simpleStorage.length; i++) {
		if (simpleStorage[i].data != emptySlot) {
			totalSimpleStorage += 32;
		}
	}

	console.log(
		chalk.green('Total simple storage = ', totalSimpleStorage, ' Bytes')
	);

	console.log(
		chalk.green(
			'Total contract storage = ',
			totalMappingStorage + totalSimpleStorage,
			' Bytes'
		)
	);
}

describe('When accessing ExampleNFT storage', () => {
	before('Setup contract', async () => {
		signers = await ethers.getSigners();
		owner = signers[0];
		signer01 = signers[1];
		signer02 = signers[2];

		constructorArguments = [owner.address, name, symbol];

		[contractInstance, action] = await contractHelpers.processContract(
			name,
			constructorArguments
		);
		contractAddress = await contractInstance.getAddress();

		console.log(chalk.blue('\nStorage after contract was deployed: '));
		await analyseStorage();

		// simpleStorage = await getAllSimpleStorage(contractAddress);

		// console.log(chalk.yellow('Storage: '));
		// console.log(chalk.cyan(util.inspect(simpleStorage, false, null)));
	});

	it('Should mint an ExampleNFT into signer01 account', async () => {
		let eventName = 'Transfer';

		let mintTx = await contractInstance.safeMint(
			signer01.address,
			0,
			signer01.address.toString()
		);

		expect(mintTx).to.emit(contractInstance, eventName);

		eventArgs = await contractHelpers.saveEvents(mintTx, eventName);
		tokenId01 = eventArgs[2];

		await mintTx.wait();

		console.log(
			chalk.blue('\nStorage after minting one ExampleNFT to signer01: ')
		);
		await analyseStorage();
	});

	it('Should transfer the ExampleNFT from signer01 to signer02', async () => {
		let transferTx = await contractInstance
			.connect(signer01)
			.safeTransferFrom(signer01.address, signer02.address, tokenId01);

		let eventName = 'Transfer';
		expect(transferTx).to.emit(contractInstance, eventName);

		await transferTx.wait();

		console.log(
			chalk.blue(
				'\nStorage after transferring ExampleNFT from signer01 to signer02: '
			)
		);

		await analyseStorage();
	});

	it('Should burn the ExampleNFT if the contract is connected to signer02', async () => {
		let burnTx = await contractInstance.connect(signer02).burn(tokenId01);

		let eventName = 'Transfer';

		expect(burnTx).to.emit(contractInstance, eventName);

		await burnTx.wait();

		console.log(
			chalk.blue(
				'\nStorage after burning the ExampleNFT from signer02 account: '
			)
		);

		// Set the tokenId01 to null after the burn to avoid crashing the storage analysis function
		tokenId01 = null;

		await analyseStorage();

		console.log(chalk.blue('Contract address: ', contractAddress));
	});
});
