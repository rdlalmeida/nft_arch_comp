require('dotenv').config();
const hre = require('hardhat');
const { network } = require('hardhat');
const { contractHelpers } = require('../../utils/contractHelper.js');

async function main() {
	/**
	 * NOTE: At some point, the front-end or something else needs to take care of this step, i.e., getting the owner of the contract
	 * For now, it's either account[0] from a local provider (Hardhat or Ganache) or my faithful Metamask Sepolia account
	 */
	let contractName = 'VoteBooth';
	let owner;

	if (network.name == 'sepolia') {
		owner = process.env.METAMASK_SEPOLIA_ACCOUNT;
	} else {
		let accounts = await ethers.getSigners();
		owner = accounts[0].address;
	}

	let location = 'Campinho';
	let name = 'WorldsBestDog';
	let symbol = 'WBD';
	let ballot = 'Which of these dogs is the best?\n1. Eddie\n2. Argus';

	let constructorArgs = [owner, name, symbol, location, ballot];

	let contractInstance, action;

	[contractInstance, action] = await contractHelpers.processContract(
		contractName,
		constructorArgs
	);

	let contractAddress = await contractInstance.getAddress();

	console.log(
		'Contract ',
		contractName,
		' was ',
		action,
		network.name,
		"' network, in address ",
		contractAddress
	);

	let response = await contractInstance.saySomething();

	console.log('Contract response: ', response);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
