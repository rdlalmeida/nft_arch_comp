import "ExampleNFTContract"
import "NonFungibleToken"

access(all) fun main(a: Int, b: Int, addr: Address): Int {
    log(addr);
    return a + b
}