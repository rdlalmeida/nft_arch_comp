import "NonFungibleToken"
import "ExampleNFTContract"
import "FlowFees"

/*
    Use this transaction to retrieve a Collection reference, borrow the last NFT in it, run the NFT functions and then use the Test file to capture and validate the events.
    Again, I need to do all this shenanigans because, as of October 2024, Cadence Testing still has a lot of issues getting result values from script executions, so the best approach is to do all the tests with a transactions (more secure to execute than scripts in the Testing context) and then capture the events to validate the executions
*/

transaction() {
    let collectionRef: &{NonFungibleToken.Collection}
    let collectionIds: [UInt64]
    let nftRef: &{NonFungibleToken.NFT}

    // Note: I'm trying to run this as if this was a script, i.e., I need tp try to run this with a 'normal' &Account without any entitlements
    prepare(signer: &Account) {
        let currentFeeBalance: UFix64 = FlowFees.getFeeBalance()
        log(
            "04-TestNFTFunctions: Current balance = "
            .concat(currentFeeBalance.toString())
        )

        self.collectionRef = signer.capabilities.borrow<&{NonFungibleToken.Collection}>(ExampleNFTContract.CollectionPublicPath) ??
            panic(
                "Account "
                .concat(signer.address.toString())
                .concat(" does not have a NonFungibleToken.Collection at ")
                .concat(ExampleNFTContract.CollectionPublicPath.toString())
                .concat(". The account must initialize their account with this collection resource first!")
            )
        
        self.collectionIds = self.collectionRef.getIDs()

        if (self.collectionIds.length == 0) {
            panic(
                "The NonFungibleToken.Collection retrieved from account "
                .concat(signer.address.toString())
                .concat(" does not have one in storage in path ")
                .concat(ExampleNFTContract.CollectionPublicPath.toString())
            )
        }

        self.nftRef = self.collectionRef.borrowNFT(UInt64(self.collectionIds[self.collectionIds.length - 1])) ??
            panic(
                "Unable to borrow a NFT reference for NFT id "
                .concat((self.collectionIds[self.collectionIds.length - 1]).toString())
                .concat(" from account ")
                .concat(ExampleNFTContract.CollectionPublicPath.toString())
            )
    }

    execute {
        // Test the getViews and resolveViews functions. Just call these to trigger the events to be emitted
        let gottenViews: [Type] = self.nftRef.getViews()

        if (gottenViews != []) {
            panic(
                "Unexpected Views retrieved: Expected a '[]', got something else..."
            )
        }

        let viewsResolved: AnyStruct? = self.nftRef.resolveView(Type<@AnyResource>())

        if (viewsResolved != nil) {
            panic(
                "Unexpected Views resolved: Expected a 'nil', got something else..."
            )
        }

        let emptyCollection: @{NonFungibleToken.Collection} <- self.nftRef.createEmptyCollection()

        // Test if this collection was created empty
        if (emptyCollection.getLength() != 0) {
            panic(
                "The collection created was not empty! Current collection size: "
                .concat(emptyCollection.getLength().toString())
            )
        }

        // All tests done. Destroy the collection to finish this
        destroy emptyCollection

        let finalFeeBalance: UFix64 = FlowFees.getFeeBalance()
        log(
            "04-TestNFTFunctions: Current Fee Balance = "
            .concat(finalFeeBalance.toString())
        )
    }
}