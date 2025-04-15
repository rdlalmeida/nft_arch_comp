import "FlowToken"

access(all) fun main(account: Address): UFix64 {
    let mainAccount: &Account = getAccount(account)

    let currentBalance: UFix64 = mainAccount.balance

    return currentBalance
}