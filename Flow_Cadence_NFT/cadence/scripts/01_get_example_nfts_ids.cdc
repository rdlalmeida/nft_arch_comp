import "NonFungibleToken"
import "ExampleNFTContract"

access(all) fun main(targetAddress: Address): [UInt64] {
    let targetAccount: &Account = getAccount(targetAddress)

    let collectionRef: &{NonFungibleToken.Collection} = targetAccount.capabilities.borrow<&{NonFungibleToken.Collection}>(ExampleNFTContract.CollectionPublicPath) ??
    panic(
        "Account "
        .concat(targetAddress.toString())
        .concat(" does not have a NonFungibleToken.Collection at ")
        .concat(ExampleNFTContract.CollectionPublicPath.toString())
        .concat(". The account must initialize their account with this collection first.")
    )

    return collectionRef.getIDs()
}