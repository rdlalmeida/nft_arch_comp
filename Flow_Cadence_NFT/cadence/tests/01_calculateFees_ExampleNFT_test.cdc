import Test
import "ExampleNFTContract"
import "NonFungibleToken"
import BlockchainHelpers
import "FlowFees"

// Get the main deployer account, which is defined in the 'testing' field from the contract specification in this project's flow.json

access(all) let deployer: Test.TestAccount = Test.getAccount(0x0000000000000007);

// Create another two accounts needed to do mints and transfers
access(all) let account01: Test.TestAccount = Test.createAccount();
access(all) let account02: Test.TestAccount = Test.createAccount();

// Define the transactions to execute later
access(all) let createCollectionTx: String = "../transactions/01_setup_example_collection.cdc";
access(all) let mintExampleNFTTx : String = "../transactions/02_mint_example_nft.cdc";
access(all) let transferExampleNFTTx: String = "../transactions/03_transfer_example_nft.cdc";
access(all) let testNFTFunctionTx: String = "--/transactions/04_test_nft_functions.cdc";

// The same for scripts
access(all) let getNFTCollectionSc: String = "../scripts/01_get_example_nfts_ids.cdc";
access(all) let borrowNFTSc: String = "../scripts/02_borrow_nft.cdc";

// Set the events types to be able to capture them later
access(all) let mintEventType: Type = Type<ExampleNFTContract.NFTMinted>()
access(all) let emptyCollectionCreatedEventType: Type = Type<ExampleNFTContract.EmptyCollectionCreated>();
access(all) let depositEventType: Type = Type<NonFungibleToken.Deposited>()
access(all) let withdrawEventType: Type = Type<NonFungibleToken.Withdrawn>()

// Event types for the FlowFees events
access(all) let feesDeductedEventType: Type = Type<FlowFees.FeesDeducted>()
access(all) let tokensDepositedEventType: Type = Type<FlowFees.TokensDeposited>()
access(all) let tokensWithdrawnEventType: Type = Type<FlowFees.TokensWithdrawn>()


// Simple function that is not run during the normal test run (because it is not prefixed by 'test' in its name) that runs FlowFee.computeFees function to, hopefully, 
// return the amount paid in fees for the transaction considered.
access(all) fun calculateFees(inclusionEffort: UFix64, executionEffort: UFix64): UFix64 {
    return FlowFees.computeFees(inclusionEffort: inclusionEffort, executionEffort: executionEffort);
}

// Another simple function just to print out the fee parameters
access(all) fun printFeeParameters() {
    let feeParameters: FlowFees.FeeParameters = FlowFees.getFeeParameters()

    log("Current Fee Parameters: ")
    log(feeParameters)
}

// And another one to abstract the capture the FeesDeducted event alone
// NOTE: This function returns a dictionary with an index and an three element dictionary as value. 
// This element contains the arguments emitted by the FlowFees.FeesDeducted, namely, the amount, inclusionEffort and executionEffort. The index is for the case in which multiple events are captured instead
access(all) fun captureFeesDeducted(): {UInt64: {String: UFix64}} {
    let feesDeductedEvents: [AnyStruct] = Test.eventsOfType(feesDeductedEventType)
    log("Captured ".concat(feesDeductedEvents.length.toString()).concat(" FlowFees.FeesDeducted events"))

    var eventResult: {UInt64: {String: UFix64}} = {}
    var index: UInt64 = 0

    for feeEvent in feesDeductedEvents {
        let newFeeEvent: FlowFees.FeesDeducted = feeEvent as! FlowFees.FeesDeducted

        log("FlowFee event #".concat(index.toString()).concat(": "));
        log(newFeeEvent)

        // Add the event elements to the result array
        eventResult[index] = {
            "amount": newFeeEvent.amount,
            "inclusionEffort": newFeeEvent.inclusionEffort,
            "executionEffort": newFeeEvent.executionEffort
        }
        // Adjust the index before moving to the next event
        index = index + 1
    }

    // Return the result
    return eventResult
}

// Setup function to deploy the main contract and any other initial configurations
// NOTE: I've prefixed this function with NOT to prevent the automated test suit from running it
access(all) fun setup() {
    // Begin by retrieving and printing the current fee parameters
    let beforeFeeParameters: FlowFees.FeeParameters = FlowFees.getFeeParameters();

    log("Fee parameters before contract deploy: ");
    log(beforeFeeParameters);

    let err: Test.Error? = Test.deployContract(
        name: "ExampleNFTContract",
        path: "../contracts/ExampleNFTContract.cdc",
        arguments: []
    )

    // Capture and analyse any FeeDeducted Events emitted
    let feesDeductedEvents: [AnyStruct] = Test.eventsOfType(feesDeductedEventType);
    log("Captured ".concat(feesDeductedEvents.length.toString()).concat(" events!"));

    // Cast and printout every event captured from the type considered.
    var index: Int = 0;
    for feeEvent in feesDeductedEvents {
        let newFeeEvent: FlowFees.FeesDeducted = feeEvent as! FlowFees.FeesDeducted

        log("FlowFee Event #".concat(index.toString()).concat(":"));
        log(newFeeEvent);

        index = index + 1
    }
    // Turns out that deploying the contract does not emit any FeesDeducted events... I'll leave the code here anyways


    // Check if the parameters have changed after deploying the main contract
    let afterFeeParameters: FlowFees.FeeParameters = FlowFees.getFeeParameters();

    log("Fee parameters after contract deploy: ");
    log(afterFeeParameters);

    Test.expect(err, Test.beNil())
}

// Test the creation of an empty collection
access(all) fun testCreateCollection() {
    let txResult: Test.TransactionResult = executeTransaction(
        createCollectionTx,
        [],
        account01
    )

    Test.expect(txResult, Test.beSucceeded())

    let eventResults: {UInt64: {String: UFix64}} = captureFeesDeducted()

    log("Fees Deducted Events results: ")
    log(eventResults)
}

// I'm defining another deploy function, outside of the setup one, to make sure that test files do not emit FlowFees events during contract deployments, 
// though contract deployments do require the payment of fees
// NOTE: Apparently, the name of the function is irrelevant... turns out that deploying contracts in Test mode does not costs any fees, it seems
access(all) fun NOTtestContractDeploy() {
    // Deploy the ExampleNFTContract
    let err: Test.Error? = Test.deployContract(
        name: "ExampleNFTContract",
        path: "../contracts/ExampleNFTContract.cdc",
        arguments: []
    )

    let feesDeductedEvents: [AnyStruct] = Test.eventsOfType(feesDeductedEventType);
    log("Captured ".concat(feesDeductedEvents.length.toString()).concat(" events!"));

    var index: Int = 0;

    for feeEvent in feesDeductedEvents {
        let newFeeEvent: FlowFees.FeesDeducted = feeEvent as! FlowFees.FeesDeducted

        log("FlowFee Event #".concat(index.toString()).concat(":"));
        log(newFeeEvent)
    }

    Test.expect(err, Test.beNil())
}