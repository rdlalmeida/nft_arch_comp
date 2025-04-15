/*
    Use this transaction to fund all emulator test accounts with 1000.0 FLOW from the emulator account. To make this easier, this is just a shortcut to run the transaction that funds an individual account but to the following addresses (check that these do match with the ones configured in the project's flow.json):
    
    account01: 0x179b6b1cb6755e31
    account02: 0xf3fcd2c1a78f5eee
    account03: 0xe03daebed8ca0615
    account04: 0x045a1763c93006ca
    account05: 0x120e725050340cab
*/

import "FlowToken"
import "FungibleToken"

transaction() {
    let vaultReference: auth(FungibleToken.Withdraw) &FlowToken.Vault
    let receiverRef: [&{FungibleToken.Receiver}]
    let from: Address
    let to: [Address]
    let amount: UFix64

    prepare(signer: auth(BorrowValue) &Account) {
        self.from = signer.address

        // Get a reference to the signer's main FLOW vault
        self.vaultReference = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault) ??
        panic("Unable to get a reference to the vault for account ".concat(signer.address.toString()))

        // Lets transfer a bulk amount per account
        self.amount = 1000.0
        self.receiverRef = []
        self.to = [0x179b6b1cb6755e31, 0xf3fcd2c1a78f5eee, 0xe03daebed8ca0615, 0x045a1763c93006ca, 0x120e725050340cab]

        for receiverAddress in self.to {
            // Get the recipient account object
            let recipientAccount: &Account = getAccount(receiverAddress)

            // And get a reference to the Vault token receiver to the to array
            self.receiverRef.append(recipientAccount.capabilities.borrow<&{FungibleToken.Receiver}>(/public/flowTokenReceiver) ?? panic("Unable to retrieve a &{FungibleToken.Receiver} from ".concat(receiverAddress.toString())))
        }
    }

    execute{
        // All good. Run another cycle to deposit the amount in each account
        var index: Int = 0
        for receiverRef in self.receiverRef {
            let tempVault: @{FungibleToken.Vault} <- self.vaultReference.withdraw(amount: self.amount)

            // Deposit the withdrawn amount into the accounts
            receiverRef.deposit(from: <- tempVault)

            log(
                "Transferred "
                .concat(self.amount.toString())
                .concat(" FLOW from account ")
                .concat(self.from.toString())
                .concat(" to ")
                .concat(self.to[index].toString())
            )
            index = index + 1
        }
    }
}