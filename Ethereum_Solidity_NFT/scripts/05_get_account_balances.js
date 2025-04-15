require('dotenv').config();
const { network } = require('hardhat');
const { contractHelpers } = require('../../utils/contractHelper.js');
// const { utils } = require('ethers');

async function main() {
	// Get all configured account, irregardless of the network
	let accounts = await ethers.getSigners();

	let owner = accounts[0];

	let contractName = 'ExampleNFT';
	let constructorArgs = [owner, 'ExampleNFT', 'ENFT'];

	let contractInstance, action;

	[contractInstance, action] = await contractHelpers.processContract(
		contractName,
		constructorArgs
	);

	var balance = 0;

	for (i = 0; i < accounts.length; i++) {
		balance = await contractInstance.getAccountBalance(accounts[i].address);

		balance = ethers.formatEther(balance);

		console.log(
			'Account #',
			i,
			' = ',
			accounts[i].address,
			', balance = ',
			balance,
			' ETH'
		);
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
