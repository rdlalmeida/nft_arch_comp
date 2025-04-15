/**
 * The usual test module for these things.
 * NOTE: Unlike other test modules like this one, this one tries to prevent re-deploying the
 * smart contract in question again and again, as seems to be the norm in these cases.
 * To achieve that, I use my awesome contractHelpers module to abstract all this logic and, prevent
 * most of those pointless re-deployments.
 */

const { ethers, network } = require('hardhat');
const { expect, assert } = require('chai');
const { contractHelpers } = require('../../utils/contractHelper.js');
const { resetNetwork } = require('../scripts/resetNetwork.js');
require('dotenv').config();

let contractInstance = null;
let contractName = 'VoteBooth';
let contractAddress;
let action = null;
let constructorArguments = null;
let base_ballot = 'Choice?';
let choices = ['Option1', 'Option2', 'Option3'];

let signers;
let owner, signer01, signer02, signer03;
let voterAccounts;
let mintTx, eventArgs, voteId;
let eventName;

let { ELECTION_NAME, ELECTION_SYMBOL, ELECTION_LOCATION, ELECTION_BALLOT } =
	process.env;

// This bit should clean the contract as much as possible before trying a fresh run
before('Clean the contract details for a fresh run', async () => {
	// If the account is 'sepolia', I need to burn every VoteNFT token before doing the rest
	let sepolia_accounts;
	let voteId;
	// Set up the main parameters and objects
	signers = await ethers.getSigners();

	owner = signers[0];
	signer01 = signers[1];
	signer02 = signers[2];
	signer03 = signers[3];

	sepolia_accounts = [owner, signer01, signer02, signer03];

	voterAccounts = [
		{ address: signer01.address, id: -1, signer: signer01 },
		{ address: signer02.address, id: -1, signer: signer02 },
		{ address: signer03.address, id: -1, signer: signer03 },
	];

	// Prepare to deploy the contract into the owner account (signers[0])
	constructorArguments = [
		owner.address,
		ELECTION_NAME,
		ELECTION_SYMBOL,
		ELECTION_LOCATION,
		ELECTION_BALLOT,
	];

	if (network.name != 'sepolia') {
		// The assumption is that every network with a name different than 'sepolia' is a
		// local one and therefore I can upload a new contract without problems (ETH is free)
		// In this case, simply reset the whole contract instance. I have a script for that too
		resetNetwork.resetContract(contractName);

		// Use my set of handy function to avoid over-deployments. This thing takes care of everything, which apparently was the role of the "new"
		// Ignition Hardhat module, but it turns out that it does not work that well so I had to write my own
		[contractInstance, action] = await contractHelpers.processContract(
			contractName,
			constructorArguments
		);
	} else {
		// Need the contract instance
		[contractInstance, action] = await contractHelpers.processContract(
			contractName,
			constructorArguments
		);

		for (i = 0; i < sepolia_accounts.length; i++) {
			try {
				// First, check if the address has any NFT associated to it
				voteId = await contractInstance.getVoteId(
					sepolia_accounts[i].address
				);
			} catch (error) {
				if (error.data.message.includes('ERC721NonexistentToken')) {
					voteId = 0;
				} else {
					console.error(error);
					process.exit(1);
				}
			}

			if (voteId != 0) {
				// There's a VoteNFT already in that addresses's account, I need to burn it
				let tx;
				try {
					tx = await contractInstance
						.connect(sepolia_accounts[i])
						.burn(voteId);

					await tx.wait();

					console.log(
						'Burned a VoteNFT with id ',
						voteId,
						' from address ',
						sepolia_accounts[i].address
					);
				} catch (error) {
					console.error(error);
					process.exit(1);
				}
			}
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
	'Deploying VotingBooth for network ' +
		network.name +
		' and mint 3 VoteNFTs to 3 users ',
	() => {
		it('Contract should have a location, ballot, name and symbol set up by the contract constructor', async () => {
			// NOTE: The name, symbol and ballot are private properties and, as such, I need to use the getter function to retrieve them.
			// The location is a public parameter, so I can get this one directly, in principle
			let election_name = await contractInstance.name();
			let election_symbol = await contractInstance.symbol();
			let election_location = await contractInstance.location();
			let election_ballot = await contractInstance.getBallot();

			assert.equal(
				ELECTION_NAME,
				election_name,
				'The contract was deployed with the wrong name!'
			);

			assert.equal(
				election_symbol,
				ELECTION_SYMBOL,
				'The contract was deployed with the wrong symbol!'
			);

			assert.equal(
				election_location,
				ELECTION_LOCATION,
				'The contract was deployed with the wrong location!'
			);

			assert.equal(
				election_ballot,
				ELECTION_BALLOT,
				'The contract was deployed with the wrong ballot!'
			);
		});

		it('Should mint 3 tokens for each of the signers defined', async () => {
			eventName = 'VoteMinted';

			for (i = 0; i < voterAccounts.length; i++) {
				// Try to get the voteId with these addresses at this point. This should revert with the custom error
				await expect(
					contractInstance.getVoteId(voterAccounts[i].address)
				).to.be.revertedWithCustomError(
					contractInstance,
					'ERC721NonexistentToken'
				);

				// Mint the token into the address in question

				mintTx = await contractInstance.mintVoteNFT(
					voterAccounts[i].address
				);

				// Check if the right event was emitted
				expect(mintTx).to.emit(contractInstance, 'VoteMinted');

				eventArgs = await contractHelpers.saveEvents(mintTx, eventName);

				// Extract the minted token id from the emitted event
				voterAccounts[i].id = Number(eventArgs[0]);
			}

			// Validate that all accounts have a VoteNFT associated to it with an id != 0
			for (i = 0; i < voterAccounts.length; i++) {
				voteId = await contractInstance.getVoteId(
					voterAccounts[i].address
				);

				// Check that the voteId obtained matches the one set up in the internal object
				assert.equal(
					voteId,
					voterAccounts[i].id,
					'Mismatch between voteId found for address ' +
						voterAccounts[i].address
				);
			}

			// Verify that each voterAccount as a valid voteId set. This assumes that all 3 accounts have a valid VoteNFT in its account
			// The verification uses a different function to retrieve the owner address from the contract internal mappings
			// and check if these match with the ones defined internally in the voterAccounts object
			let currentAddress;

			for (i = 0; i < voterAccounts.length; i++) {
				currentAddress = await contractInstance.getVoteOwner(
					voterAccounts[i].id
				);

				assert.equal(
					currentAddress,
					voterAccounts[i].address,
					'VoteNFT with id ',
					voterAccounts[i].id,
					' was minted to the wrong address!'
				);
			}
		});

		it('Should prevent additional VoteNFT from being minted to the same addresses', async () => {
			for (i = 0; i < voterAccounts.length; i++) {
				// Additional mints should fail with this error
				await expect(
					contractInstance.mintVoteNFT(voterAccounts[i].address)
				).to.be.revertedWith(
					'User already has a VoteNFT in the account!'
				);
			}

			// Check that the balances were not changed
			let currentBalance;
			for (i = 0; i < voterAccounts.length; i++) {
				currentBalance = Number(
					await contractInstance.balanceOf(voterAccounts[i].address)
				);

				assert.equal(
					currentBalance,
					1,
					'Account ' +
						voterAccounts[i].address +
						' has an invalid account balance: ' +
						currentBalance
				);
			}
		});

		it('Check if the vote contents are set to default', async () => {
			let currentChoice;
			for (i = 0; i < voterAccounts.length; i++) {
				currentChoice = await contractInstance
					.connect(voterAccounts[i].signer)
					.getVote(voterAccounts[i].id);

				assert.equal(
					currentChoice,
					base_ballot,
					'VoteNFT #' +
						voterAccounts[i].id +
						', from user ' +
						voterAccounts[i].address +
						' has a non-default choice set: ' +
						currentChoice
				);
			}
		});

		it('Enables the users to vote', async () => {
			for (i = 0; i < voterAccounts.length; i++) {
				// Vote and check if the right event was emitted
				await expect(
					contractInstance
						.connect(voterAccounts[i].signer)
						.vote(voterAccounts[i].id, choices[i])
				)
					.to.emit(contractInstance, 'VoteSubmitted')
					.withArgs(voterAccounts[i].id);
			}

			// Check if the choices were set properly

			for (i = 0; i < voterAccounts.length; i++) {
				currentChoice = await contractInstance
					.connect(voterAccounts[i].signer)
					.getVote(voterAccounts[i].id);

				assert.equal(
					currentChoice,
					choices[i],
					'VoteNFT #',
					voterAccounts[i].id,
					' from user ',
					voterAccounts[i].address,
					' does not has the correct choice: ',
					currentChoice
				);
			}
		});

		it('Prevents another user from changing the VoteNFT data it does not own', async () => {
			// Connect to voter account #1 and try to change VoteNFT from voter account #3
			await expect(
				contractInstance
					.connect(voterAccounts[0].signer)
					.vote(voterAccounts[2].id, 'OptionX')
			).to.be.revertedWith('User not authorized to vote!');

			// Validate that the VoteNFT data was not changed
			currentChoice = await contractInstance
				.connect(voterAccounts[2].signer)
				.getVote(voterAccounts[2].id);

			assert.equal(
				currentChoice,
				choices[2],
				'VoteNFT #' +
					voterAccounts[2].id +
					' from voter address ' +
					voterAccounts[2].address +
					" was changed! This shouldn't happen!"
			);
		});

		it('Allow a user to modify his or her vote', async () => {
			let new_choices = ['OptionA', 'OptionB', 'OptionC'];

			for (i = 0; i < voterAccounts.length; i++) {
				// Change the vote and watch out for the event
				mintTx = await contractInstance
					.connect(voterAccounts[i].signer)
					.vote(voterAccounts[i].id, new_choices[i]);

				expect(mintTx)
					.to.emit(contractInstance, 'VoteModified')
					.withArgs(voterAccounts[i].id);

				// Wait for the transaction to resolve before continuing
				await mintTx.wait();
			}

			// Make sure the votes were really changed for good
			for (i = 0; i < voterAccounts.length; i++) {
				currentChoice = await contractInstance
					.connect(voterAccounts[i].signer)
					.getVote(voterAccounts[i].id);

				assert.equal(
					new_choices[i],
					currentChoice,
					'VoteNFT #' +
						voterAccounts[i].id +
						' from user ' +
						voterAccounts[i].address +
						' was not changed properly!'
				);
			}
		});

		it('Prevents another user from burning a VoteNFT it does not own', async () => {
			// As before, connect with voter account #1 and try to burn VoteNFT from voter account #3
			await expect(
				contractInstance
					.connect(voterAccounts[0].signer)
					.burn(voterAccounts[2].id)
			).to.be.revertedWith('Only the token owner can burn it!');
		});

		it('Allows the users to burn their own VoteNFTs', async () => {
			// Burn all the VoteNFTs to finish this test suite
			for (i = 0; i < voterAccounts.length; i++) {
				await expect(
					contractInstance
						.connect(voterAccounts[i].signer)
						.burn(voterAccounts[i].id)
				)
					.to.emit(contractInstance, 'VoteBurned')
					.withArgs(voterAccounts[i].id);

				// Validate that the balance for the account is 0
				currentBalance = await contractInstance.balanceOf(
					voterAccounts[i].address
				);

				assert.equal(
					Number(currentBalance),
					0,
					'Voter account ' +
						voterAccounts[i].address +
						' still has a token in it!'
				);

				// Get all the parameters that I can and validate that they are null, zero, etc.
				await expect(
					contractInstance
						.connect(voterAccounts[i].signer)
						.getVote(voterAccounts[i].id)
				).to.be.revertedWithCustomError(
					contractInstance,
					'ERC721NonexistentToken'
				);

				await expect(
					contractInstance.getVoteOwner(voterAccounts[i].id)
				).to.be.revertedWithCustomError(
					contractInstance,
					'ERC721NonexistentToken'
				);

				await expect(
					contractInstance.getVoteId(voterAccounts[i].address)
				).to.be.revertedWithCustomError(
					contractInstance,
					'ERC721NonexistentToken'
				);

				// assert.equal(
				// 	Number(currentId),
				// 	0,
				// 	'Address ' +
				// 		voterAccounts[i].address +
				// 		' still has id ' +
				// 		currentId +
				// 		' associated to it! Fix this!'
				// );
			}
		});
	}
);
