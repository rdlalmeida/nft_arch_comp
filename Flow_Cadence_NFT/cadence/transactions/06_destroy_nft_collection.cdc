import "ExampleNFTContract"
import "NonFungibleToken"
import "FlowFees"

transaction() {
    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, LoadValue, UnpublishCapability) &Account) {
        if (signer.storage.borrow<&{NonFungibleToken.Collection}>(from: ExampleNFTContract.CollectionStoragePath) == nil) {
            log(
                "Account "
                .concat(signer.address.toString())
                .concat(" does not has a NonFungibleToken.Collection in storage!")
            )

            return
        }

        // Load the collection from storage
        let collection: @ExampleNFTContract.Collection? <- signer.storage.load<@ExampleNFTContract.Collection>(from: ExampleNFTContract.CollectionStoragePath)

        if (collection == nil) {
            log(
                "By some weird reason, the Collection retrieved from account "
                .concat(signer.address.toString())
                .concat(" is nil!")
            )
        }

        destroy collection

        // Unlink the capability as well
        let collectionCap: Capability? = signer.capabilities.unpublish(ExampleNFTContract.CollectionPublicPath)

        log(
            "NonFungibleToken.Collection deleted and unpublished from account "
            .concat(signer.address.toString())
        )
    }

    execute{
    }
}