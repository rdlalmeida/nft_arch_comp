/*
    Simple transaction to remove the NFT Minter from the ExampleNFTContract
*/
transaction() {
    prepare(signer: auth(Storage) &Account) {
        let nftMinter: @AnyResource? <- signer.storage.load<@AnyResource>(from: /storage/exampleMinter)

        destroy nftMinter
    }

    execute {

    }
}