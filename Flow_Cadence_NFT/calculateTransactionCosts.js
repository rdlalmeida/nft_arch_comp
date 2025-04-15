/**
 *  This script is going to be used to automate the fee calculation process in FLow/Cadence. This is because, unlike Solidity, Cadence has not developed a 'gas reporter' tool as the one
 *  from Solidity. As such, fee calculation, both in gas and/or fiat currency amounts, is not trivial, but not the super complicated at the same time. It requires a few steps that fall
 *  outside of what can be done in a Cadence contract, script or transaction, hence this Javascript script because, fundamentally, I need to capture Events that return the parameters that
 *  I need to use to calculate the fees properly and to do that I need to use the Flow Command Line (fcl)
 */

const fcl = require('@onflow/fcl');
const { config } = require('@onflow/fcl');

const fs = require('node:fs');
const flowJSON = require('./flow.json');

const signer = require('./createSigner.js');

// FCL configuration
// fcl.config()
// 	.put('accessNode.api', 'http://localhost:8888')
// 	.put('flow.network', 'emulator');
// fcl.config().put('accessNode.api', 'https://rest-testnet.onflow.org').put('flow.network', 'testnet');

// fcl.config().put('discovery.wallet', 'http://localhost:8701/fcl/authn');

// fcl.config().load({ flowJSON });

// config({
// 	'flow.network': 'testnet',
// 	'accessNode.api': 'https://rest-testnet.onflow.org',
// }).load({ flowJSON });

config({
	'flow.network': 'emulator',
	'accessNode.api': 'http://localhost:8888',
	'discovery.wallet': 'http://localhost:8701/fcl/authn',
	'discovery.wallet.method': 'HTTP/POST',
}).load({ flowJSON });

function readCadenceFile(path) {
	let data;

	try {
		data = fs.readFileSync(path, 'utf-8');
	} catch (err) {
		console.error(err);
		process.exit(1);
	}

	return data;
}

// ---------------------------------- Set transactions here ----------------------------------------------
// NOTE: Node.js is OK with relative paths, as long as they are defined relative to the main project path: ~/github_projects/flow_projects/11_ExampleNFT
let setup_example_collection_path =
	'cadence/transactions/01_setup_example_collection.cdc';

let setup_example_collection = readCadenceFile(setup_example_collection_path);

let mint_example_nft_path = 'cadence/transactions/02_mint_example_nft.cdc';
let mint_example_nft = readCadenceFile(mint_example_nft_path);

let transfer_example_nft_path =
	'cadence/transactions/03_transfer_example_nft.cdc';
let transfer_example_nft = readCadenceFile(transfer_example_nft_path);

// ---------------------------------- Set scripts here ----------------------------------------------
let say_something_path = 'cadence/scripts/00_say_something.cdc';
let say_something = readCadenceFile(say_something_path);

let say_things_path = 'cadence/scripts/00_say_things.cdc';
let say_things = readCadenceFile(say_things_path);

let simple_script_path = 'cadence/scripts/00_simple_script.cdc';
let simple_script = readCadenceFile(simple_script_path);

let get_example_nft_ids_path = 'cadence/scripts/01_get_example_nfts_ids.cdc';
let get_example_nft_ids = readCadenceFile(get_example_nft_ids_path);

let borrow_nft_path = 'cadence/scripts/02_borrow_nft.cdc';
let borrow_nft = readCadenceFile(borrow_nft_path);

const myAuthorizationFunction = async (account) => {
	const ADDRESS = '0x120e725050340cab'; // account05
	const KEY_ID = 1;
	const sign = (msg) => {
		return {
			...account,
			tempId: `${ADDRESS}-${KEY_ID}`,
			addr: ADDRESS,
			keyId: Number(KEY_ID),
			signingFunction: async (signable) => {
				return {
					addr: ADDRESS,
					keyId: Number(KEY_ID),
					signature: sign(signable.message),
				};
			},
		};
	};
};

async function calculateCollectionCreation() {
	// var transactionId = await fcl.mutate({
	// 	cadence: setup_example_collection,
	// 	proposer: signer,
	// 	payer: signer,
	// 	authorization: [signer],
	// 	limit: 100,
	// });

	var currentUser = await fcl.currentUser.snapshot();

	currentUser.addr = '0x120e725050340cab';

	console.log('The current user: ', currentUser);

	return;

	const response = await fcl.send([
		fcl.transaction`transaction() { prepare(acct: &Account) {} execute { log("Hello, Flow!") } }`,
		fcl.proposer(myAuthorizationFunction),
		fcl.payer(myAuthorizationFunction),
		fcl.authorizations([myAuthorizationFunction]),
	]);

	console.log('Transaction response = ' + response);
}

calculateCollectionCreation();

// Use this simple test function to clear out communication and configuration issues with FCL
// Each script gets progressively more complex, so if all 3 scripts prefixed with '00' work, things are going on the right direction
async function testQuery() {
	console.log('Running things...');

	var scriptReply;

	// scriptReply = await fcl.query({
	// 	cadence: simple_script,
	// 	args: (arg, t) => [
	// 		arg('1', t.Int),
	// 		arg('14', t.Int),
	// 		arg('0xba1132bc08f82fe2', t.Address),
	// 	],
	// });
	// console.log('Result = ' + scriptReply);

	scriptReply = await fcl.query({
		cadence: say_something,
	});

	console.log('Say Something: ' + scriptReply);

	console.log('Testing the other one...');

	scriptReply = await fcl.query({
		cadence: say_things,
		args: (arg, t) => [arg('Random message from Ricardo!', t.String)],
	});

	console.log('Say Things: ' + scriptReply);
}

// testQuery();
