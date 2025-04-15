const { ethers, network } = require('hardhat');
const { expect, assert } = require('chai');
const { contractHelpers } = require('../../utils/contractHelper.js');
const { resetNetwork } = require('../scripts/resetNetwork.js');
require('dotenv').config();

let contractInstance = null;
let contractName = 'ExampleNFT';
let nftName = 'ExampleNFT';
let nftSymbol = 'ENFT';
let action = null;
let constructorArguments = null;
var tokenBalance;
let contractAddress;

let signers;
let owner, signer01, signer02, signer03;
var mintTx, burnTx, eventArgs, tokenId, eventName;
let user_accounts;
var tokenIds = {};
var tokenMetadata = {};

before('Clean the contract details for a fresh run', async () => {
	// Reset this network first
	// resetNetwork.resetContract(contractName);

	signers = await ethers.getSigners();

	owner = signers[0];
	signer01 = signers[1];
	signer02 = signers[2];
	signer03 = signers[3];

	user_accounts = [owner, signer01, signer02, signer03];

	constructorArguments = [owner.address, nftName, nftSymbol];

	if (network.name != 'sepolia') {
		resetNetwork.resetContract(contractName);

		[contractInstance, action] = await contractHelpers.processContract(
			contractName,
			constructorArguments
		);
	} else {
		[contractInstance, action] = await contractHelpers.processContract(
			contractName,
			constructorArguments
		);

		for (i = 0; i < user_accounts.length; i++) {
			try {
				tokenBalance = await contractInstance.balanceOf(
					user_accounts[i].address
				);
			} catch (error) {
				console.error(error);
				process.exit(1);
			}

			assert.equal(
				tokenBalance,
				0,
				'Account '
					.concat(user_accounts[i].address)
					.concat(
						' already has '
							.concat(tokenBalance)
							.concat(' ENFTs in its account')
					)
			);
		}
	}

	contractAddress = await contractInstance.getAddress();

	console.log(
		contractName +
			action +
			network.name +
			' with address ' +
			contractAddress
	);
});

describe(
	'Deploying ExampleNFT contract for network ' +
		network.name +
		' and mint 3 NFTs to 3 different users',
	() => {
		it('Contract owner should match the deployer address', async () => {
			let contract_deployer = owner.address;
			let contract_owner = await contractInstance.owner();

			assert.equal(
				contract_deployer,
				contract_owner,
				'The contract owner and the deployer address do not match!'
			);
		});

		it('Contract should support the IERC721, IERC721Metadata, IERC721Receiver, Ownable and IERC165 Interfaces', async () => {
			assert(
				await contractInstance.supportsInterface(
					process.env.OWNABLE_INTERFACE_ID
				),
				contractName + " does not supports the 'Ownable' interface!"
			);

			assert(
				await contractInstance.supportsInterface(
					process.env.IERC721_INTERFACE_ID
				),
				contractName + " does not supports the 'IERC721' interface"
			);

			assert(
				await contractInstance.supportsInterface(
					process.env.IERC721METADATA_INTERFACE_ID
				),
				contractName +
					" does not supports the 'IERC721Metadata' interface"
			);

			assert(
				await contractInstance.supportsInterface(
					process.env.IERC721RECEIVER_INTERFACE_ID
				),
				contractName +
					" does not supports the 'IERC721Receiver' interface"
			);

			assert(
				await contractInstance.supportsInterface(
					process.env.IERC165_INTERFACE_ID
				),
				contractName + " does not supports the 'IERC165' interface"
			);
		});

		it('Mints an Example NFT to each of the signers accounts', async () => {
			eventName = 'Transfer';
			var currentMetadata;

			for (i = 1; i < user_accounts.length; i++) {
				currentMetadata =
					'Signer0' + i + ' metadata = ' + user_accounts[i].address;

				tokenMetadata[user_accounts[i].address] = currentMetadata;

				mintTx = await contractInstance.safeMint(
					user_accounts[i].address,
					0,
					currentMetadata
				);

				// Test if the proper event was emitted
				expect(mintTx).to.emit(contractInstance, eventName);

				// The eventArgs from the Transfer event should be [address from, address to, uint256 tokenId]
				// Extract the token Id to the proper variable and validate the 'to' address
				eventArgs = await contractHelpers.saveEvents(mintTx, eventName);

				// The event should return 3 elements
				assert.equal(eventArgs.length, 3);

				// Validate the 'to' argument
				assert.equal(eventArgs[1], user_accounts[i].address);

				// If all is OK, extract the tokenId
				tokenIds[eventArgs[1]] = eventArgs[2];

				// Wait for the transaction to finish
				await mintTx.wait();
			}

			// Test if the tokens were properly minted
			for (i = 1; i < user_accounts.length; i++) {
				tokenBalance = await contractInstance.balanceOf(
					user_accounts[i].address
				);

				assert.equal(
					tokenBalance,
					1,
					'Account #' +
						i +
						' (' +
						user_accounts[i].address +
						') has ' +
						tokenBalance +
						' NFTs in its account. Expected only 1..'
				);
			}
		});

		it('tokenIds should match the respective owners addresses', async () => {
			var owner_address;
			for (i = 1; i < user_accounts.length; i++) {
				owner_address = await contractInstance.getTokenOwner(
					tokenIds[user_accounts[i].address]
				);

				assert.equal(
					owner_address,
					user_accounts[i].address,
					'Token #' +
						tokenIds[user_accounts[i].address] +
						' is set for owner ' +
						user_accounts[i].address +
						' but the contract returned this address: ' +
						owner_address
				);
			}
		});

		it('Token metadata should match what was set during mint', async () => {
			var currentMetadata;

			for (i = 1; i < user_accounts.length; i++) {
				currentMetadata = await contractInstance.getTokenMetadata(
					tokenIds[user_accounts[i].address]
				);

				assert.equal(
					currentMetadata,
					tokenMetadata[user_accounts[i].address],
					'Token #' +
						tokenIds[user_accounts[i].address] +
						' metadata is "' +
						currentMetadata +
						'" and it does not match the one in storage: "' +
						tokenMetadata[user_accounts[i].address] +
						'"'
				);
			}
		});

		it('Should prevent a user from burning a token he/she does not own', async () => {
			// Start by connecting the contract instance to account[0], which was the one that minted the tokens and has none in its account, therefore is not authorised for burning.
			// and then try to burn a token that user[0] is not authorised to
			for (i = 1; i < user_accounts.length; i++) {
				await expect(
					contractInstance
						.connect(user_accounts[0])
						.burn(tokenIds[user_accounts[i].address])
				).to.be.revertedWithCustomError(
					contractInstance,
					'ERC721InsufficientApproval'
				);
			}
		});

		it('Token balances should be reverted to zero after burn', async () => {
			// Repeat the process from before, but now connecting the contract to right signer object
			// This time it should be successful

			for (i = 1; i < user_accounts.length; i++) {
				burnTx = await contractInstance
					.connect(user_accounts[i])
					.burn(tokenIds[user_accounts[i].address]);

				// Wait for the burn to finish
				await burnTx.wait();
			}

			// Check if the balances of each signer was set to 0 after the operation
			for (i = 1; i < user_accounts.length; i++) {
				tokenBalance = await contractInstance.balanceOf(
					user_accounts[i].address
				);

				assert.equal(
					tokenBalance,
					0,
					'Account ' +
						user_accounts[i].address +
						' has ' +
						tokenBalance +
						' tokens in its account, but it should be 0!'
				);
			}
		});
	}
);
