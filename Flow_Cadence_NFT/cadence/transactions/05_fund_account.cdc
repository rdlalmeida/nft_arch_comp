import "FlowToken"
import "FungibleToken"

transaction(recipient: Address, amount: UFix64) {
    let tempVault: @{FungibleToken.Vault}
    let receiverRef: &{FungibleToken.Receiver}
    let from: Address
    let to: Address
    let amount: UFix64

    prepare(signer: auth(BorrowValue) &Account) {
        let vaultReference: auth(FungibleToken.Withdraw) &FlowToken.Vault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault) ??
        panic("Unable to get a reference to the vault for account ".concat(signer.address.toString()))

        self.tempVault <- vaultReference.withdraw(amount: amount)

        let recipientAccount: &Account = getAccount(recipient)
        
        self.receiverRef = recipientAccount.capabilities.borrow<&{FungibleToken.Receiver}>(/public/flowTokenReceiver) ?? 
        panic("Unable to retrieve a &{FungibleToken.Receiver} from ".concat(recipientAccount.address.toString()))

        self.from = signer.address
        self.to = recipient
        self.amount = amount
    }

    execute{

        self.receiverRef.deposit(from: <- self.tempVault)

        log(
            "Transferred "
            .concat(self.amount.toString())
            .concat(" FLOW from account ")
            .concat(self.from.toString())
            .concat(" to ")
            .concat(self.to.toString())
        )
    }
}