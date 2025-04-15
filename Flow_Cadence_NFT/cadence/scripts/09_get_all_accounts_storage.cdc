/* 
    Same as before: this scripts assumes a flow emulator running with the following accounts configured and funded:

    emulator-account: 0xf8d6e0586b0a20c7
    account01: 0x179b6b1cb6755e31
    account02: 0xf3fcd2c1a78f5eee
    account03: 0xe03daebed8ca0615
    account04: 0x045a1763c93006ca
    account05: 0x120e725050340cab

    Adjust this script as needed

    "account03": 0xe03daebed8ca0615,
    "account04": 0x045a1763c93006ca,
    "account05": 0x120e725050340cab
*/

access(all) fun main(): {String: UInt64} {
    var results: {String: UInt64} = {}

    let accountsToCheck : {String: Address} =
    {
        "emulator-account": 0xf8d6e0586b0a20c7,
        "account01": 0x179b6b1cb6755e31,
        "account02": 0xf3fcd2c1a78f5eee
    }

    let account_names: [String] = accountsToCheck.keys

    for account_name in account_names {
        let tempAccount: &Account = getAccount(accountsToCheck[account_name]!)

        results[account_name] = tempAccount.storage.used
    }

    return results
}