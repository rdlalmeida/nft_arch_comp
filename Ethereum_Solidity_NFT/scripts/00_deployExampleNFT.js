require('dotenv').config();
const { network } = require('hardhat');
const { contractHelpers } = require('../../utils/contractHelper.js');

async function main() {
	let contractName = 'ExampleNFT';
	let owner;

	if (network.name == 'sepolia') {
		owner = process.env.METAMASK_SEPOLIA_ACCOUNT;
	} else {
		let accounts = await ethers.getSigners();
		owner = accounts[0].address;
	}

	let constructorArgs = [owner, 'ExampleNFT', 'ENFT'];

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
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
