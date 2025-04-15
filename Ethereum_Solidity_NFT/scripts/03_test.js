require('dotenv').config();
const { contractHelpers } = require('../../utils/contractHelper.js');

async function main() {
	contractHelpers.removeContractAddress('VoteBooth');
}

main()
	.then(process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
