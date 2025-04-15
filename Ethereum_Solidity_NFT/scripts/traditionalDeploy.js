require('dotenv').config();
const hre = require('hardhat');
const ethers = hre.ethers;

const { contractHelpers } = require('../../utils/contractHelper.js');
const { resetNetwork } = require('./resetNetwork.js');
/**
 * @description This is important, nay, VITAL, to be able to deploy a fucking smart contract (it shouldn't be this hard...)
 * Hardhat ignition is out for now because it has a few bugs related to passing arguments to the contructor, so I have to do it
 * "like in the old days", i.e., get a ContractFactory for the contract and let the module do the rest.
 * But...
 * Apparentely only the 'ethers' that I get from requiring the base hardhat package allows for that. After a few hellish days wracking
 * my brain, trying to understand where the fuck the 'getContractFactory' function went, both in the 'ethers' and 'hardhat-ethers' packages,
 * I finally found out that only the 'ethers' from the hardhat package does the trick, i.e., has the function that I need. If only I could
 * consult some documentation for this shit...
 * Confusing? Welcome to the wonderful world of Java-fucking-script!
 */
// const { ethers, run, network } = require("hardhat");

async function _main() {
	try {
		let accounts = await ethers.getSigners();
		initialOwner = accounts[0].address;

		const contractFactory = await ethers.getContractFactory('ExampleNFT');

		let constructorArgs = [initialOwner, 'ExampleNFT', 'ANFT'];

		const contractInstance = await contractFactory.deploy(
			...constructorArgs
		);
		await contractInstance.waitForDeployment();
		let contractAddress = await contractInstance.getAddress();

		console.log('Contract deployed to address ', contractAddress);

		// let contractFunction1 = await contractInstance.getFunction("getMessage");
		// let contractFunction2 = await contractInstance.getFunction("getNumber");

		// let message = await contractFunction1();
		// let number = await contractFunction2();

		// console.log("Constructor message: ", message);
		// console.log("Constructor number: ", Number(number));
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}

async function main() {
	resetNetwork.resetContract('ExampleNFT');
	/**
	 * NOTE: I need to provide an ABSOLUTE path to the contract for this shit to work!! Why? First, fucking javascript doesn't do relative paths, unlike every
	 * other decent programming language out there. So there's that to start.
	 * Second, they did a puny and pathetic attempt at solving this issue by providing the path.resolve function that was supposed to convert a relative path
	 * (../contracts/ExampleNFT.sol) into its absolute equivalent (home/ricardoalmeida/github_projects/solidity_projects/22_ExampleNFTExample/contracts/ExampleNFT.sol).
	 * But because Javascript is absolutely shit, and node.js is equally or even worse than that one, it turns out that the resolve function has a bug and by some
	 * retarded reason, it decides to omit a folder here and there from the absolute path output! In the example used, in this case, the resolve function "forgets" the
	 * '22_ExampleNFTExample' folder. Why? Who the fuck knows... All I know is that this is completely useless and moronic.
	 * So, what's the solution?
	 * Like a caveman, I have to provide the ABSOLUTE path as initial argument or this whole shit does not work...
	 * EDIT: Forget it... It turns out that it is the contract name that this thing is needs to work. But this rant still stands. Javascript is the worst language in the
	 * whole freakin world!
	 */
	let contractName = 'ExampleNFT';

	let initialOwner, initialOwnerAddress, newOwner, newOwnerAddress;
	let accounts;

	if (network.name == 'sepolia') {
		initialOwnerAddress = process.env.SEPOLIA_ACCOUNT01;

		initialOwner = await ethers.provider.getSigner();

		newOwnerAddress = process.env.SEPOLIA_ACCOUNT02;

		accounts = await ethers.getSigners();

		newOwner = accounts[1];
	} else {
		accounts = await ethers.getSigners();

		initialOwnerAddress = accounts[0].address;
		initialOwner = accounts[0];

		newOwnerAddress = accounts[1].address;
		newOwner = accounts[1];
	}

	let constructorArguments = [initialOwnerAddress, contractName, 'ENFT'];

	let contractInstance;
	try {
		[contractInstance, action] = await contractHelpers.processContract(
			contractName,
			constructorArguments
		);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}

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

	let message = await contractInstance.saySomething();

	console.log('Ownable: ', message);

	process.exit(0);

	let tokenOwner;

	let id = 0;

	try {
		tokenOwner = await contractInstance.getTokenOwner(id);

		console.log('Token owner got at try #1 = ', tokenOwner);
	} catch (error) {
		try {
			await contractInstance.safeMint(
				newOwnerAddress,
				0,
				'My first Sepolia token!',
				{
					from: initialOwnerAddress,
				}
			);
			console.log('NFT minted!');

			tokenOwner = await contractInstance.getTokenOwner(id);

			console.log('Token owner got at try #2 = ', tokenOwner);
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	}

	let uri;

	try {
		uri = await contractInstance.getTokenMetadata(id);

		console.log('Another NFT #0 URI: ', uri);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}

	try {
		/**
		 * VERY SUPER IMPORTANT!!!!
		 *
		 * Down bellow is how one freakin signs a transaction with a different signer than the original (deployer)
		 * One would thing something like this should be simple, like providing an argument to something, or simply
		 * provide a '{ from: <signer_address>}' like before, but NO!
		 * Now (and who knows for how long...), a transaction that needs signing is one that changes the state of the
		 * blockchain. I've done a few of those before, but since these always use address[0] as the default signer, and
		 * all the stuff so far only requires the owner to sign things, I was unaware of this issue.
		 * But to send a different signature, FIRST, the contract instance needs to be connected to another user
		 * IMPORTANT: This new user IS NOT ITS ADDRESS, but the Signer object returned by either 'await ethers.provider.getSigner()',
		 * which returns the currently configured signer, which is usually account[0], or we can get all the Signer objects in
		 * the current provider, i.e., all the accounts in the network (for local networks that is. Testnets are a different animal)
		 * with 'await ethers.getSigners()' (Notice how this one does not need the 'provider', just to keep thing simple... God dammit...)
		 * and then select one of the elements of the array (AGAIN, the Signer object and NOT the address) and provide it as argument
		 * for the contractInstance.connect(<NewSigner>) instruction. From that point on, every function call from that contract
		 * instance is signed with NewSigner S
		 */
		await contractInstance.connect(newOwner).burn(id);

		console.log('Token burned!');
	} catch (error) {
		console.error('Unable to burn NFT#: ', error);
	}

	console.log('Done!');
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
