import "ExampleNFTContract"

access(all) fun main(things: String): String {
    let response: String = ExampleNFTContract.sayThings(things: things);

    return response;
}