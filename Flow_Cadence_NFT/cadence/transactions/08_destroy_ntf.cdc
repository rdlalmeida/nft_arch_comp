import "ExampleNFTContract"
import "NonFungibleToken"

transaction(tokenId: UInt64) {
    let collectionRef: auth(NonFungibleToken.Withdraw) &ExampleNFTContract.Collection

    prepare(signer: auth(BorrowValue) &Account) {
        self.collectionRef = signer.storage.borrow<auth(NonFungibleToken.Withdraw) &ExampleNFTContract.Collection>(from: ExampleNFTContract.CollectionStoragePath) ?? 
        panic("Unable to load an ExampleNFTContract.Collection from account ".concat(signer.address.toString()))
    }

    execute{
        let tokenToBurn: @{NonFungibleToken.NFT} <- self.collectionRef.withdraw(withdrawID: tokenId)

        destroy tokenToBurn

        log(
            "Destroyed NFT with id "
            .concat(tokenId.toString())
        )
    }
}