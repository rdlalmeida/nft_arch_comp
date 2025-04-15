import "ExampleNFTContract"
import "NonFungibleToken"

access(all) fun main(collectionAddress: Address): [UInt64] {
    let userAccount: &Account = getAccount(collectionAddress)

    let collectionRef: &{NonFungibleToken.Collection} = userAccount.capabilities.borrow<&{NonFungibleToken.Collection}>(ExampleNFTContract.CollectionPublicPath) ??
    panic("Unable to retrieve a valid &{NonFungibleToken.Collection} from account ".concat(collectionAddress.toString()))

    return collectionRef.getIDs()
}