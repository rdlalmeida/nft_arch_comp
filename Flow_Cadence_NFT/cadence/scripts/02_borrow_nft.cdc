import "NonFungibleToken"
import "ExampleNFTContract"

access(all) fun main(collectionAddress: Address): &{NonFungibleToken.NFT} {
    let collectionAccount: &Account = getAccount(collectionAddress)

    let collectionRef: &{NonFungibleToken.Collection} = collectionAccount.capabilities.borrow<&{NonFungibleToken.Collection}>(ExampleNFTContract.CollectionPublicPath) ??
    panic(
        "Account "
        .concat(collectionAddress.toString())
        .concat(" does not have a NonFungibleToken.Collection at ")
        .concat(ExampleNFTContract.CollectionPublicPath.toString())
        .concat(". The account must initialize their account with this collection resource first!")
    )

    // If I have a valid collection reference, grab the array of [UInt64] with the NFT ids in storage and validate that there's at least one of them there
    let collectionIds: [UInt64] = collectionRef.getIDs()

    if (collectionIds.length == 0) {
        panic(
            "The NonFungibleToken.Collection retrieved from account "
            .concat(collectionAddress.toString())
            .concat(" does not have one in storage in path ")
            .concat(ExampleNFTContract.CollectionPublicPath.toString())
        )
    }

    // Borrow and return a reference to the last NFT in the Collection
    let nftRef: &{NonFungibleToken.NFT} = collectionRef.borrowNFT(UInt64(collectionIds[collectionIds.length - 1])) ??
    panic(
        "Unable to borrow a NFT reference for NFT id "
        .concat((collectionIds.length - 1).toString())
        .concat(" from account ")
        .concat(collectionAddress.toString())
    )
    return nftRef
}