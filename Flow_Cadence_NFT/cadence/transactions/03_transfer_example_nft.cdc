import "NonFungibleToken"
import "ExampleNFTContract"
import "FlowFees"

transaction(destinationAddress: Address, withdrawID: UInt64) {
    let withdrawRef: auth(NonFungibleToken.Withdraw) &{NonFungibleToken.Collection}

    let receiverRef: &{NonFungibleToken.Receiver}
    
    prepare(signer: auth(BorrowValue) &Account) {
        let currentFeeBalance: UFix64 = FlowFees.getFeeBalance();
        log(
            "03-TransferNFT: Current Fee Balance = "
            .concat(currentFeeBalance.toString())
        )


        self.withdrawRef = signer.storage.borrow<auth(NonFungibleToken.Withdraw) &{NonFungibleToken.Collection}>(from: ExampleNFTContract.CollectionStoragePath) ??
            panic(
                "The signer does not store a ExampleNFTContract.Collection object at the path "
                .concat(ExampleNFTContract.CollectionStoragePath.toString())
                .concat(". The signer must initialize their account with this collection first!")
            )

        let recipient: &Account = getAccount(destinationAddress)

        let receiverCap: Capability<&{NonFungibleToken.Receiver}> = 
            recipient.capabilities.get<&{NonFungibleToken.Receiver}>(ExampleNFTContract.CollectionPublicPath)

        self.receiverRef = receiverCap.borrow() ??
            panic(
                "The account "
                .concat(destinationAddress.toString())
                .concat(" does not have a NonFungibleToken.Receiver at ")
                .concat(ExampleNFTContract.CollectionPublicPath.toString())
                .concat(". The account must initialize their account with this collection first!")
            )
    }

    execute {
        let nft: @{NonFungibleToken.NFT} <- self.withdrawRef.withdraw(withdrawID: withdrawID)
        self.receiverRef.deposit(token: <- nft)

        let finalFeeBalance: UFix64 = FlowFees.getFeeBalance()
        log(
            "03-TransferNFT = "
            .concat(finalFeeBalance.toString())
        )
    }
}