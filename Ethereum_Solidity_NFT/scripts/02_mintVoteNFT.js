require('dotenv').config();
const { network } = require('hardhat');
const { contractHelpers } = require('../../utils/contractHelper.js');

async function main() {
	// 1. DEPLOY CONTRACT (I'm afraid this step has to happen every time)
	console.log('\n1. DEPLOY CONTRACT\n');
	let contractName = 'VoteBooth';
	let owner;

	// I can get all I need address wise from this array
	let signers = await ethers.getSigners();

	// These signers are the Signer objects returned with the getSigner(s) method(s), individualized for easier access
	let signer01, signer02, signer03;

	try {
		owner = await ethers.provider.getSigner();

		signer01 = signers[1];
		signer02 = signers[2];
		signer03 = signers[3];
	} catch (error) {
		console.error(error);
		process.exit(1);
	}

	let constructorArgs = [
		owner.address,
		process.env.ELECTION_NAME,
		process.env.ELECTION_SYMBOL,
		process.env.ELECTION_LOCATION,
		process.env.ELECTION_BALLOT,
	];

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
		' network, in address ',
		contractAddress
	);

	// 2. MINT 3 VOTE NFTs TO ADDRESSES 1, 2 AND 3 FROM PROVIDER
	console.log(
		'\n2. MINT 3 VOTE NFTs TO ADDRESSES 1, 2 AND 3 FROM PROVIDER\n'
	);

	// Organize the voter accounts into objects in an array to simplify processing them through loops.
	let voterAccounts = [
		{ address: signer01.address, id: -1, signer: signer01 },
		{ address: signer02.address, id: -1, signer: signer02 },
		{ address: signer03.address, id: -1, signer: signer03 },
	];

	let mintTx, eventArgs, voteId;
	let eventName = 'VoteMinted';

	// Mint the token and set the id in the corresponding voter object
	for (i = 0; i < voterAccounts.length; i++) {
		// Check if the current address already has a vote Id already minted into his/her account
		voteId = Number(
			await contractInstance.getVoteId(voterAccounts[i].address)
		);

		// The voteId counter starts at '1'. If I get a tokenId = 0, it means that the mapping does not have that entry yet
		if (voteId != 0) {
			// The voter already has a vote token in his/her account. Recover it
			voterAccounts[i].id = voteId;

			console.log(
				"Voter '",
				voterAccounts[i].address,
				"' already has token #",
				voterAccounts[i].id,
				' from contract @',
				contractAddress,
				' in the account.'
			);
		} else {
			// Otherwise, mint the token instead
			mintTx = await contractInstance.mintVoteNFT(
				voterAccounts[i].address
			);

			eventArgs = await contractHelpers.saveEvents(mintTx, eventName);

			// The saveEvents function returns an JSON object with all the arguments captured by listening to the Event.
			// These args are indexed by the order in which they are returned by the event.
			// In this case, the 'VoteMinted' event emits a single uint256, hence why I'm recovering it with index 0
			// The Number casting is only because, by default, the contracts return BigNumbers.
			voterAccounts[i].id = Number(eventArgs[0]);

			console.log(
				"Voter '",
				voterAccounts[i].address,
				"' received token #",
				voterAccounts[i].id,
				' minted from contract @',
				contractAddress
			);
		}
	}

	let ballot = await contractInstance.getBallot();

	console.log(
		'Vote Booth in ',
		process.env.ELECTION_LOCATION,
		' has minted ',
		voterAccounts.length,
		' Vote NFTs for election: '
	);
	console.log(
		process.env.ELECTION_NAME,
		' (',
		process.env.ELECTION_SYMBOL,
		'): '
	);
	console.log(ballot);

	// 3. VERIFY IF THE TOKEN WAS TRANSFERRED CORRECTLY
	console.log('\n3. VERIFY IF THE TOKEN WAS TRANSFERRED CORRECTLY\n');
	let currentAddress;

	for (i = 0; i < voterAccounts.length; i++) {
		currentAddress = await contractInstance.getVoteOwner(
			voterAccounts[i].id
		);

		if (currentAddress == voterAccounts[i].address) {
			console.log(
				'Vote NFT #',
				voterAccounts[i].id,
				' has the correct owner!'
			);
		} else {
			console.error(
				'ERROR: Vote NFT #',
				voterAccounts[i].id,
				' has onwer ',
				currentAddress,
				' but it was issued by address ',
				voterAccounts[i].address
			);
		}
	}

	// 4. DISPLAY THE CURRENT VOTE DATA IN EACH NFT
	console.log('\n4. DISPLAY THE CURRENT VOTE DATA IN EACH NFT\n');

	let currentVote;

	for (i = 0; i < voterAccounts.length; i++) {
		currentVote = await contractInstance.getVote(voterAccounts[i].id);

		console.log('Vote NFT#', voterAccounts[i].id, ': ', currentVote);
	}

	// 5. ALL ACCOUNTS VOTE
	console.log('\nALL ACCOUNTS VOTE\n');

	// The votes to cast, in an arry just to make it simpler to operate.
	let options = ['Eddie', 'Eddie', 'Argus'];
	let voteTx;

	for (i = 0; i < voterAccounts.length; i++) {
		// First I need to connect the contract to each of the voter's accounts
		// await contractInstance.connect(voterAccounts[i].signer);

		try {
			voteTx = await contractInstance
				.connect(voterAccounts[i].signer)
				.vote(voterAccounts[i].id, options[i]);

			// This one forces the transaction (vote) to finish before moving forward, so that the choices have time to be reflected in the NFT metadata.
			await voteTx.wait();

			console.log(
				'Voter ',
				voterAccounts[i].address,
				' voted successfully for ',
				options[i]
			);
		} catch (error) {
			console.error(
				'ERROR: Voter ',
				voterAccounts[i].address,
				' was not able to vote: '
			);
			console.error(error);
		}
	}

	// 6. CHECK THAT THE VOTES WERE CORRECTLY CAST
	console.log('\n6. CHECK THAT THE VOTES WERE CORRECTLY CAST\n');

	for (i = 0; i < voterAccounts.length; i++) {
		currentVote = await contractInstance.getVote(voterAccounts[i].id);
		console.log('Vote NFT #', voterAccounts[i].id, ': ', currentVote);
	}

	// 7. CHANGE VOTE FROM VOTER #2
	console.log('\n7. CHANGE VOTE FROM VOTER #2\n');

	// Change the vote to a bastardization of Argus, on purpose, to be able to see the difference
	let newOption = 'Argo';
	let voterAccountIndex = 1;
	try {
		voteTx = await contractInstance
			.connect(voterAccounts[voterAccountIndex].signer)
			.vote(voterAccounts[voterAccountIndex].id, newOption);

		// Wait for the transaction to finish before moving to the next one
		await voteTx.wait();

		console.log(
			'Voter ',
			voterAccounts[voterAccountIndex].address,
			' changed the vote successfully to ',
			newOption
		);
	} catch (error) {
		console.error(
			'ERROR: Voter ',
			voterAccounts[voterAccountIndex].address,
			' was not able to change the vote.'
		);
	}

	// 8. VERIFY THE CHANGE WAS SUCCESSFUL
	console.log('\n8. VERIFY THE CHANGE WAS SUCCESSFUL\n');

	for (i = 0; i < voterAccounts.length; i++) {
		currentVote = await contractInstance.getVote(voterAccounts[i].id);

		console.log(
			'Voter #',
			i,
			" with address '",
			voterAccounts[i].address,
			"' has current vote: ",
			currentVote
		);
	}

	// 9. TRY TO CHANGE VOTE NFT #1 WITHOUT BEING THE OWNER (VOTER #3)
	console.log(
		"\n9. TRY TO CHANGE VOTE NFT #1 TO '",
		newOption,
		"' WITHOUT BEING THE OWNER (VOTER #3)\n"
	);

	try {
		// Try to change Vote NFT #1 but signing this with voter #3. Should blow up
		await contractInstance
			.connect(voterAccounts[2].signer)
			.vote(voterAccounts[0].id, newOption);
	} catch (error) {
		// Print out the error but don't exit
		console.error('ERROR: Unable to change the vote for NFT:');
		console.error(error.message);
	}

	// 10. VERIFY THAT VOTE NFT #1 WAS NOT CHANGED WITH THE PREVIOUS OPERATION
	console.log(
		'\n10. VERIFY THAT VOTE NFT #1 WAS NOT CHANGED WITH THE PREVIOUS OPERATION\n'
	);

	for (i = 0; i < voterAccounts.length; i++) {
		currentVote = await contractInstance.getVote(voterAccounts[i].id);

		console.log(
			'Voter #',
			i,
			" with address '",
			voterAccounts[i].address,
			"' has current vote: ",
			currentVote
		);
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
