/*
    This is another script that runs a cycle over a pre-set of test accounts. So, if these change, the code for this script should only changed

    emulator-account: 0xf8d6e0586b0a20c7
    account01: 0x179b6b1cb6755e31
    account02: 0xf3fcd2c1a78f5eee
    account03: 0xe03daebed8ca0615
    account04: 0x045a1763c93006ca
    account05: 0x120e725050340cab

    "account03": 0xe03daebed8ca0615,
    "account04": 0x045a1763c93006ca,
    "account05": 0x120e725050340cab
*/

access(all) fun main(): {String: UFix64} {
    var results: {String: UFix64} = {}
    let accountsToCheck: {String: Address} = 
    {
        "emulator-account": 0xf8d6e0586b0a20c7,
        "account01": 0x179b6b1cb6755e31,
        "account02": 0xf3fcd2c1a78f5eee
    }

    let account_names: [String] = accountsToCheck.keys

    for account_name in account_names {
        let tempAccount: &Account = getAccount(accountsToCheck[account_name]!)

        results[account_name] = tempAccount.balance
    }

    return results
}