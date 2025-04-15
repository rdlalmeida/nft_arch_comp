/*
    Another all emulator accounts script:

    account01: 0x179b6b1cb6755e31
    account02: 0xf3fcd2c1a78f5eee
    account03: 0xe03daebed8ca0615
    account04: 0x045a1763c93006ca
    account05: 0x120e725050340cab

    "account03": 0xe03daebed8ca0615,
    "account04": 0x045a1763c93006ca,
    "account05": 0x120e725050340cab
*/

import "NonFungibleToken"
import "ExampleNFTContract"

access(all) fun main(): {String: [UInt64]} {
    var results: {String: [UInt64]} = {}

    let accountsToCheck: {String: Address} = 
    {
        "account01": 0x179b6b1cb6755e31,
        "account02": 0xf3fcd2c1a78f5eee
    }

    let account_names: [String] = accountsToCheck.keys

    for account_name in account_names {
        let userAccount: &Account = getAccount(accountsToCheck[account_name]!)

        let collectionRef: &{NonFungibleToken.Collection} = userAccount.capabilities.borrow<&{NonFungibleToken.Collection}>(ExampleNFTContract.CollectionPublicPath) ?? panic("Unable to retrieve a valid &{NonFungibleToken.Collection} from account ".concat(accountsToCheck[account_name]!.toString()))

        results[account_name] = collectionRef.getIDs();
    }

    return results
}