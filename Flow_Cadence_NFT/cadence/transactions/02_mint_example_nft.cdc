import "NonFungibleToken"
import "ExampleNFTContract"
import "FlowFees"

transaction(recipient: Address) {
    let minter: &ExampleNFTContract.NFTMinter
    let recipientCollectionRef: &{NonFungibleToken.Receiver}
    let recipientAddress: Address

    prepare(signer: auth(BorrowValue) &Account) {
        self.minter = signer.storage.borrow<&ExampleNFTContract.NFTMinter>(from: ExampleNFTContract.MinterStoragePath) ??
        panic(
            "The signer does not store a ExampleNFTContract.NFTMinter object at the path "
            .concat(ExampleNFTContract.CollectionStoragePath.toString())
            .concat("The signer must initialize their account with this collection first!")
        )

        self.recipientCollectionRef = getAccount(recipient).capabilities.borrow<&{NonFungibleToken.Collection}>(ExampleNFTContract.CollectionPublicPath) ??
        panic(
            "Account "
            .concat(recipient.toString())
            .concat(" does not have a NonFungibleToken.Collection Receiver at ")
            .concat(ExampleNFTContract.CollectionPublicPath.toString())
            .concat(". The account must initialize their account with this collection first!")
        )

        self.recipientAddress = recipient
    }

    execute {
        let mintedNFT: @{NonFungibleToken.NFT} <- self.minter.createNFT()

        let tokenId: UInt64 = mintedNFT.id

        self.recipientCollectionRef.deposit(token: <- mintedNFT)

        log(
            "Successfully minted an ExampleNFT with id "
            .concat(tokenId.toString())
            .concat(" into the &{NonFungibleToken.Collection} at ")
            .concat(ExampleNFTContract.CollectionPublicPath.toString())
            .concat(" for account ")
            .concat(self.recipientAddress.toString())
        )
    }
}