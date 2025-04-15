require('dotenv').config();

const { network } = require('hardhat');

const { contractHelpers } = require('../../utils/contractHelper.js');

async function main() {
	// Get the contract from the vault
	if (network.name != 'sepolia') {
		throw 'This script only runs in Sepolia!';
	}

	let initialOwner = process.env.SEPOLIA_ACCOUNT01;
	let contractName = 'AnotherNFT';

	let constructorArguments = [initialOwner, contractName, 'AFNT'];

	let [contractInstance, reply] = await contractHelpers.processContract(
		contractName,
		constructorArguments
	);

	let message = await contractInstance.saySomething('Ricardo');

	console.log('saySomething() = ', message);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
