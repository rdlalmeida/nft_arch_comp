require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();
require('hardhat-gas-reporter');
require('solidity-coverage');
require('hardhat-contract-sizer');

// NOTE: The '@nomicfoundation/hardhat-toolbox' already provides 'hardhat-etherscan' and importing both creates all sorts of problems...
// require('@nomiclabs/hardhat-etherscan');

const { resetNetwork } = require('./scripts/resetNetwork.js');

const {
	ALCHEMY_API_ENDPOINT,
	SEPOLIA_ACCOUNT00_PRIV,
	SEPOLIA_ACCOUNT01_PRIV,
	SEPOLIA_ACCOUNT02_PRIV,
	SEPOLIA_ACCOUNT03_PRIV,
	ETHERSCAN_API_KEY,
	COINMARKET_API_KEY,
} = process.env;

task(
	'reset-contract',
	"Cleans all artifacts, recompiles and re-deploys the contract identified with 'contract_name'"
)
	.addParam('contract', 'The name of the contract to be re-deployed')
	.setAction(async (taskArgs) => {
		resetNetwork.resetContract(taskArgs.contract);
	});

/** @type import('hardhat/config').HardhatUserConfig */
config = {
	solidity: '0.8.24',
	networks: {
		local: {
			url: 'http://127.0.0.1:8545',
			chainId: 31337,
		},
		sepolia: {
			url: ALCHEMY_API_ENDPOINT,
			accounts: [
				`0x${SEPOLIA_ACCOUNT00_PRIV}`,
				`0x${SEPOLIA_ACCOUNT01_PRIV}`,
				`0x${SEPOLIA_ACCOUNT02_PRIV}`,
				`0x${SEPOLIA_ACCOUNT03_PRIV}`,
			],
			chainId: 11155111,
		},
		ganache: {
			url: 'http://127.0.0.1:7545',
			chainId: 1337,
		},
	},
	etherscan: {
		apiKey: {
			sepolia: ETHERSCAN_API_KEY,
		},
	},
	gasReporter: {
		enabled: true,
		noColors: false,
		currency: 'EUR',
		L1: 'polygon',
		coinmarketcap: COINMARKET_API_KEY,
		token: 'ETH',
		reportFormat: 'markdown',
		showMethodSig: true,
		suppressTerminalOutput: true,
	},
};

module.exports = config;
