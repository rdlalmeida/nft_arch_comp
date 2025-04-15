access(all) fun main(acct: Address): UInt64 {
    let user_account: &Account = getAccount(acct);

    return user_account.storage.used;
}