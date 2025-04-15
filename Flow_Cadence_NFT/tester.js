const fcl = require('@onflow/fcl');

fcl.config().put('accessNode.api', 'http://localhost:8888');
// fcl.config().put('accessNode.api', 'https://rest-testnet.onflow.org');
fcl.config().put('discovery.wallet', 'http://localhost:8701/fcl/authn');

async function testQuery() {
	console.log('Running things...');

	const result = await fcl.query({
		cadence: `
            access(all) fun main(a: Int, b: Int, addr: Address): Int {
                log(addr);
                return a + b
            }
        `,
		args: (arg, t) => [
			arg('7', t.Int),
			arg('6', t.Int),
			arg('0xba1132bc08f82fe2', t.Address),
		],
	});

	console.log(result);
}

testQuery();
