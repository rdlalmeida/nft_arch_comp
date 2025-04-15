import Test
import "NonFungibleToken"
import "ExampleNFTContract"
import BlockchainHelpers
import "FlowFees"

/* 
    VERY IMPORTANT NOTE: Apparently, in order for a test function to execute automatically, the function name needs to start with 'test<SomeOtherNames>'. If not, the testing module ignores the function! Weird behaviour, but I need to take this into account.
*/

access(all) let account01: Test.TestAccount = Test.createAccount()
access(all) let account02: Test.TestAccount = Test.createAccount()
access(all) let account03: Test.TestAccount = Test.createAccount()

// Get the account that it is configured in the "testing" field for the main contract to test
access(all) let deployer: Test.TestAccount = Test.getAccount(0x0000000000000007)

// Paths to transaction files
access(all) let createCollectionTx: String = "../transactions/01_setup_example_collection.cdc"
access(all) let mintExampleNFTTx: String = "../transactions/02_mint_example_nft.cdc"
access(all) let transferExampleNFTTx: String = "../transactions/03_transfer_example_nft.cdc"
access(all) let testNFTFunctionsTx: String = "../transactions/04_test_nft_functions.cdc"

// Paths to script files
access(all) let getNFTCollectionScp: String = "../scripts/01_get_example_nfts_ids.cdc"
access(all) let borrowNFTScp: String = "../scripts/02_borrow_nft.cdc"

// Use these lists/arrays to keep the token ids for each account just to save the step of keep asking for it all the time from the blockchain
access(all) var account01_token_ids: [UInt64] = []
access(all) var account02_token_ids: [UInt64] = []

// Set the types of the events to be captured at a further point
access(all) let mintEventType: Type = Type<ExampleNFTContract.NFTMinted>()
access(all) let depositEventType: Type = Type<NonFungibleToken.Deposited>()
access(all) let withdrawEventType: Type = Type<NonFungibleToken.Withdrawn>()

access(all) let viewsGottenEventType: Type = Type<ExampleNFTContract.ViewsGotten>()
access(all) let viewsResolvedEventType: Type = Type<ExampleNFTContract.ViewsResolved>()
access(all) let emptyCollectionCreatedEventType: Type = Type<ExampleNFTContract.EmptyCollectionCreated>()

// Types for the FlowFee events
access(all) let feesDeductedEventType: Type = Type<FlowFees.FeesDeducted>()
access(all) let tokensDepositedEventType: Type = Type<FlowFees.TokensDeposited>()
access(all) let tokensWithdrawnEventType: Type = Type<FlowFees.TokensWithdrawn>()

// TESTS START HERE
access(all) fun setup() {
    let err: Test.Error? = Test.deployContract(
        name: "ExampleNFTContract",
        path: "../contracts/ExampleNFTContract.cdc",
        arguments: []
    )

    Test.expect(err, Test.beNil())

    let currentFeeBalance: UFix64 = FlowFees.getFeeBalance()

    log("Current Fee Vault balance: ".concat(currentFeeBalance.toString()))

    let currentFeeParams: FlowFees.FeeParameters = FlowFees.getFeeParameters();

    log("Current Surge Factor: ".concat(currentFeeParams.surgeFactor.toString()))
    log("Current Inclusion Effort Cost: ".concat(currentFeeParams.inclusionEffortCost.toString()))
    log("Current Execution Effort Cost: ".concat(currentFeeParams.executionEffortCost.toString()))
}

// Test the creation of an empty collection
access(all) fun testCreateCollection() {
    // Run the Collection creation transaction with account01 and account 02 to create collections in both account storage
    let txResult01: Test.TransactionResult = executeTransaction(
        createCollectionTx,
        [],
        account01
    )

    Test.expect(txResult01, Test.beSucceeded())

    let txResult02: Test.TransactionResult = executeTransaction(
        createCollectionTx,
        [],
        account02
    )

    Test.expect(txResult02, Test.beSucceeded())
}

// Test that each Collection created is still empty
access(all) fun testEmptyCollections() {
    // Run the script that retrieves the items in the collection and verify that both Collections are empty of NFTs
    let scriptResult01: Test.ScriptResult = executeScript(
        getNFTCollectionScp,
        [account01.address]
    )

    // Extract the script results
    let collection01: [UInt64] = (scriptResult01.returnValue as! [UInt64]?)!

    Test.assertEqual(0, collection01.length)

    // Repeat the process to the other collection
    let scriptResult02: Test.ScriptResult = executeScript(
        getNFTCollectionScp,
        [account02.address]
    )

    let collection02: [UInt64] = (scriptResult02.returnValue as! [UInt64]?)!

    Test.assertEqual(0, collection02.length)
}

// Mint and transfer 2 ExampleNFTs to each of the TestAccounts (account01 and account02)
access(all) fun testMintNFT() {
    // Mint and transfer an ExampleNFT to account01 Collection and sign it with the deployer account. This is expected to work
    let txResult01: Test.TransactionResult = executeTransaction(
        mintExampleNFTTx,
        [account01.address],
        deployer
    )

    // Test if the transaction was successful
    Test.expect(txResult01, Test.beSucceeded())

    // Minting an ExampleNFT emits an Event with the tokenId displayed. Test if the event was emitted and capture its argument to a variable for future comparisons

    // Grab the events into different lists according with their type
    var mintEvents: [AnyStruct] = Test.eventsOfType(mintEventType)
    var depositEvents: [AnyStruct] = Test.eventsOfType(depositEventType)

    // In both cases I should have only one element in each list
    Test.assertEqual(1, mintEvents.length)
    Test.assertEqual(1, depositEvents.length)
    
    // The previous validation assured me that I have one single event in the list above (as expected). As such, extract the tokenId from the event arguments first
    // Start by casting the event description received to a proper event of the expected type
    let mintEvent01: ExampleNFTContract.NFTMinted = mintEvents[0] as! ExampleNFTContract.NFTMinted
    let depositedEvent01: NonFungibleToken.Deposited = depositEvents[0] as! NonFungibleToken.Deposited

    // Grab the tokenId that was emitted with the mint event
    let nftId01: UInt64 = mintEvent01.tokenId

    // And remaining data from the deposited event
    let depositId01: UInt64 = depositedEvent01.id
    let depositUuid01: UInt64 = depositedEvent01.uuid
    let depositTo01: Address = depositedEvent01.to!

    // Now run the tokenId retrieval script for account01, test that it has only one value so far and that the value matches the id emitted in the event above
    let scriptResult01: Test.ScriptResult = executeScript(
        getNFTCollectionScp,
        [account01.address]
    )

    account01_token_ids = (scriptResult01.returnValue as! [UInt64]?)!
    
    // Done. I have all I need to validate this
    // Start by testing that the array returned has one single element
    Test.assertEqual(1, account01_token_ids.length)

    // And that that element is the same Id value emitted in the minting Event, and the rest
    Test.assertEqual(nftId01, account01_token_ids[0])

    // And compare the remaining elements obtained from the Deposited event
    Test.assertEqual(depositId01, nftId01)
    Test.assertEqual(depositUuid01, nftId01)
    Test.assertEqual(depositTo01, account01.address)

    // Repeat the process for the other account
    let txResult02: Test.TransactionResult = executeTransaction(
        mintExampleNFTTx,
        [account02.address],
        deployer
    )

    Test.expect(txResult01, Test.beSucceeded())

    // Grab the new event that should have been emited with the minting function
    mintEvents = Test.eventsOfType(mintEventType)
    depositEvents = Test.eventsOfType(depositEventType)

    // I should have two events with this type emited in the blockchain now. Adjust expectations
    Test.assertEqual(2, mintEvents.length)

    // Same here as well
    Test.assertEqual(2, depositEvents.length)

    // Adjust the index of the event to retrieve from the array
    let mintEvent02: ExampleNFTContract.NFTMinted = mintEvents[1] as! ExampleNFTContract.NFTMinted
    let depositedEvent02: NonFungibleToken.Deposited = depositEvents[1] as! NonFungibleToken.Deposited

    let nftId02: UInt64 = mintEvent02.tokenId

    let depositId02: UInt64 = depositedEvent02.id
    let depositUuid02: UInt64 = depositedEvent02.uuid
    let depositTo02: Address = depositedEvent02.to!

    let scriptResult02: Test.ScriptResult = executeScript(
        getNFTCollectionScp,
        [account02.address]
    )

    account02_token_ids = (scriptResult02.returnValue as! [UInt64]?)!
    
    Test.assertEqual(1, account02_token_ids.length)
    Test.assertEqual(nftId02, account02_token_ids[0])

    Test.assertEqual(depositId02, nftId02)
    Test.assertEqual(depositUuid02, nftId02)
    Test.assertEqual(depositTo02, account02.address)
}

access(all) fun testFailMintNFT() {
    // Only the deployer account should be the only able to mint NFTs to another collection. Test this

    // Try to mint a new NFT to account03's storage, but sign the transaction with account01, which is not authorized to mint NFTs
    let txResult01: Test.TransactionResult = executeTransaction(
        mintExampleNFTTx,
        [account03.address],
        account01
    )

    // This one is expected to fail
    Test.expect(txResult01, Test.beFailed())

    // Validate also that account03 didn't got a Collection or anything like that after this function
    let scriptResult: Test.ScriptResult = executeScript(
        getNFTCollectionScp,
        [account03.address]
    )

    Test.expect(scriptResult, Test.beFailed())

    // Another expectation is that trying to mint an NFT to an account without a Collection in storage also should fail. Try it
    // This transaction has the right signer (deployer) but account03 does not have a Collection yet. This should fail as well
    let txResult02: Test.TransactionResult = executeTransaction(
        mintExampleNFTTx,
        [account03.address],
        deployer
    )

    Test.expect(txResult02, Test.beFailed())
}

// Test the transfer of tokens between two users - account01 and account02
access(all) fun testTransferNFT() {
    // Transfer the token in account 01 to account 02
    let txResult01: Test.TransactionResult = executeTransaction(
        transferExampleNFTTx,
        [account02.address, account01_token_ids[0]],
        account01
    )

    Test.expect(txResult01, Test.beSucceeded())

    // Grab the event emited and test that everything went all OK
    var withdrawEvents: [AnyStruct] = Test.eventsOfType(withdrawEventType)
    var depositEvents: [AnyStruct] = Test.eventsOfType(depositEventType)

    // I should have one withdraw event but 3 deposit ones due to the last 2 calls
    Test.assertEqual(1, withdrawEvents.length)
    Test.assertEqual(3, depositEvents.length)

    // Extract the events and validate them
    let withdrawEvent01: NonFungibleToken.Withdrawn = withdrawEvents[0] as! NonFungibleToken.Withdrawn
    let depositEvent03: NonFungibleToken.Deposited = depositEvents[2] as! NonFungibleToken.Deposited

    // Get the parameters of each event
    let withdraw01Type: String = withdrawEvent01.type
    let withdraw01Id: UInt64 = withdrawEvent01.id
    let withdraw01Uuid: UInt64 = withdrawEvent01.uuid
    let withdraw01From: Address = withdrawEvent01.from!

    let deposit03Type: String = depositEvent03.type
    let deposit03Id: UInt64 = depositEvent03.id
    let deposit03Uuid: UInt64 = depositEvent03.uuid
    let deposit03To: Address = depositEvent03.to!

    Test.assertEqual(withdraw01Type, deposit03Type)
    Test.assertEqual(withdraw01Id, deposit03Id)
    Test.assertEqual(withdraw01Uuid, deposit03Uuid)
    Test.assertEqual(withdraw01From, account01.address)
    Test.assertEqual(deposit03To, account02.address)

    // Get both collections and validate that the IDs and quantities are OK
    let scriptResult01: Test.ScriptResult = executeScript(
        getNFTCollectionScp,
        [account01.address]
    )

    let account01_collection: [UInt64] = (scriptResult01.returnValue as! [UInt64]?)!

    let scriptResult02: Test.ScriptResult = executeScript(
        getNFTCollectionScp,
        [account02.address]
    )

    let account02_collection: [UInt64] = (scriptResult02.returnValue as! [UInt64]?)!

    // Account 01 should be empty while account02 should have 2 NFTs in it and the IDs must match the ones in the account01_token_ids and account02_token_ids lists from before
    Test.assertEqual(0, account01_collection.length)
    Test.assertEqual(2, account02_collection.length)

    // Check if the ids in account02 collection match the ones saved before
    Test.assert(account02_collection.contains(account01_token_ids[0]), message: 
        "Missing NFT with id "
        .concat(account01_token_ids[0].toString())
        .concat(" from account 02 (0x")
        .concat(account02.address.toString())
        .concat(") collection in storage")
    )

    Test.assert(account02_collection.contains(account02_token_ids[0]), message: 
        "Missing NFT with id "
        .concat(account02_token_ids[0].toString())
        .concat(" from account 02 (0x")
        .concat(account02.address.toString())
        .concat(") collection in storage")
    )

    // Move the second NFT back to account01 to continue with the rest of the tests
    let txResult02: Test.TransactionResult = executeTransaction(
        transferExampleNFTTx,
        [account01.address, account01_token_ids[0]],
        account02
    )

    Test.expect(txResult02, Test.beSucceeded())
}

/*
    Test that account01 nor the deployer cannot "pull" the transfered token from account02 storage.

    ERRATA: Turns out that Flow is quite protected against this and, so far, I'm not even able to write a transaction that does this.
    The main security feature is restricting storage access to a user that signs the transaction. The assumption is that no one is going to sign a transaction that does something undesirable and there's no way to "hid" instructions in either a transaction or the contract itself.
    So, in simpler terms, to get someone else's account access, I need them to digitally sign a transaction that does this - but not a user himself/herself. I can write the most malicious transaction ever (one that simply destroys all NFTs in a user's account), but I need the user to use his/her private encryption keys to sign that transaction for it to execute. So, I essentially need to "trick" someone to sign something that is fundamentally against their own interests. But from the blockchain point of view, there's no trick or loophole that allows unauthorized access to someone's storage.
    I cannot test this even because Cadence refuses to even compile a transaction that tries to retrieve a Collection reference without being authorized to it.
*/

// Let's move on and test the remaining functions from the contract, including the ones inherited from the NFT resource
access(all) fun testNFTFunctions() {
    let txResult01: Test.TransactionResult = executeTransaction(
        testNFTFunctionsTx,
        [],
        account01
    )

    Test.expect(txResult01, Test.beSucceeded())

    var viewsGottenEvents: [AnyStruct] = Test.eventsOfType(viewsGottenEventType)
    var viewsResolvedEvents: [AnyStruct] = Test.eventsOfType(viewsResolvedEventType)
    var emptyCollectionCreatedEvents: [AnyStruct] = Test.eventsOfType(emptyCollectionCreatedEventType)

    let viewGottenEvent01: ExampleNFTContract.ViewsGotten = viewsGottenEvents[0] as! ExampleNFTContract.ViewsGotten
    let viewResolvedEvent01: ExampleNFTContract.ViewsResolved = viewsResolvedEvents[0] as! ExampleNFTContract.ViewsResolved
    let emptyCollectionCreatedEvent01: ExampleNFTContract.EmptyCollectionCreated = emptyCollectionCreatedEvents[0] as! ExampleNFTContract.EmptyCollectionCreated

    // getViews event
    let nftId01: UInt64 = viewGottenEvent01.nftId
    let nftType01: Type = viewGottenEvent01.nftType
    let result01: String = viewGottenEvent01.result

    // viewsResolved event
    let nftId02: UInt64 = viewResolvedEvent01.nftId
    let nftType02: Type = viewResolvedEvent01.nftType
    let result02: String = viewResolvedEvent01.result

    // createEmptyCollection event
    let nftId03: UInt64 = emptyCollectionCreatedEvent01.nftId
    let nftType03: Type = emptyCollectionCreatedEvent01.nftType
    let size: Int = emptyCollectionCreatedEvent01.size

    // Test the expected values
    Test.assertEqual(nftId01, nftId02)
    Test.assertEqual(nftId01, nftId03)
    Test.assertEqual(nftId01, account01_token_ids[0])
    
    Test.assertEqual(nftType01, nftType02)
    Test.assertEqual(nftType01, nftType03)
    
    Test.assertEqual(result01, "[]")
    Test.assertEqual(result02, "nil")
    Test.assertEqual(size, 0)
}

// Test a few simple contract functions as well
access(all) fun testGetContractViews() {
    let contractView: [Type] = ExampleNFTContract.getContractViews(resourceType: nil)

    // I expect nothing from this function, but an empty list. Test that it is indeed empty
    Test.assertEqual(contractView.length, 0)
}

access(all) fun testResolveContractView() {
    let resolvedContractView: AnyStruct? = ExampleNFTContract.resolveContractView(resourceType: nil, viewType: Type<@AnyResource>())

    Test.assertEqual(resolvedContractView, nil)
}

// Use this test to test both the Collection creation function as well as the remaining Collection functions that need to be tested as well
access(all) fun testCreateEmptyCollection() {
    let collection: @{NonFungibleToken.Collection} <- ExampleNFTContract.createEmptyCollection(nftType: Type<@AnyResource>())

    // Test if this collection can create another one... It seems redundant but the standard demands it so
    let anotherCollection: @{NonFungibleToken.Collection} <- collection.createEmptyCollection()

    let supportedNFTTypes: {Type: Bool} = collection.getSupportedNFTTypes()
    let anotherSupportedNFTTypes: {Type: Bool} = anotherCollection.getSupportedNFTTypes()

    let rightType: Type = Type<@ExampleNFTContract.ExampleNFT>()
    let wrongType: Type = Type<@AnyResource>()

    Test.assert(supportedNFTTypes[rightType]!)
    Test.assertEqual(supportedNFTTypes[wrongType], nil)

    Test.assert(anotherSupportedNFTTypes[rightType]!)
    Test.assertEqual(anotherSupportedNFTTypes[wrongType], nil)

    Test.assert(collection.isSupportedNFTType(type: rightType))
    Test.assertEqual(collection.isSupportedNFTType(type: wrongType), false)

    Test.assert(anotherCollection.isSupportedNFTType(type: rightType))
    Test.assertEqual(anotherCollection.isSupportedNFTType(type: wrongType), false)

    // Test that both collections were created empty
    Test.assertEqual(collection.getLength(), 0)
    Test.assertEqual(anotherCollection.getLength(), 0)

    // All good. Destroy the collection resources before exiting
    destroy collection
    destroy anotherCollection

    // Check the balance of the Fee Vault at the end of this test script to see if anything has changed
    let currentFeeBalance: UFix64 = FlowFees.getFeeBalance()
    log("Final Fee balance: ".concat(currentFeeBalance.toString()))
}