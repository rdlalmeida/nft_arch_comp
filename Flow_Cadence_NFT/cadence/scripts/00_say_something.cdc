import "ExampleNFTContract"

access(all) fun main(): String {
    let response: String = ExampleNFTContract.saySomething();

    let resp_msg: String = "Got the following response from contract: ".concat(response);

    log(resp_msg);

    return resp_msg;
}