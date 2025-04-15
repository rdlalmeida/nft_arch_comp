import "ExampleNFTContract"
import "NonFungibleToken"
import "FlowFees"

transaction() {
    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue, LoadValue, UnpublishCapability) &Account) {
        // Start by cleaning up the storage and capability records
        let randomResource: @AnyResource? <- signer.storage.load<@ExampleNFTContract.Collection>(from: ExampleNFTContract.CollectionStoragePath)

        if (randomResource == nil) {
            log(
                "Account "
                .concat(signer.address.toString())
                .concat(" already has a resource of type ")
                .concat(randomResource.getType().identifier)
                .concat(" in storage at ")
                .concat(ExampleNFTContract.CollectionStoragePath.toString())
            )
        }

        // Destroy it
        destroy randomResource

        // Repeat the process for the capabilities as well
        let oldCap: Capability? = signer.capabilities.unpublish(ExampleNFTContract.CollectionPublicPath)

        if (oldCap == nil) {
            log(
                "Account "
                .concat(signer.address.toString())
                .concat(" had a publish Capability at ")
                .concat(ExampleNFTContract.CollectionPublicPath.toString())
            )
        }

        // Refresh the elements
        let newCollection: @{NonFungibleToken.Collection} <- ExampleNFTContract.createEmptyCollection(nftType: Type<@ExampleNFTContract.ExampleNFT>())

        signer.storage.save<@{NonFungibleToken.Collection}>(<- newCollection, to: ExampleNFTContract.CollectionStoragePath)

        let newCap: Capability<&{NonFungibleToken.Collection}> = signer.capabilities.storage.issue<&{NonFungibleToken.Collection}>(ExampleNFTContract.CollectionStoragePath)

        signer.capabilities.publish(newCap ,at: ExampleNFTContract.CollectionPublicPath)
    }

    execute {}
}