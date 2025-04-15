const { sansPrefix, withPrefix } = require('@onflow/fcl');
const { SHA3 } = require('sha3');
const elliptic = require('elliptic');

const curve = new elliptic.ec('p256');

const hashMessageHex = (msgHex) => {
	const sha = new SHA3(256);
	sha.update(Buffer.from(msgHex, 'hex'));
	return sha.digest();
};

const signWithKey = (privateKey, msgHex) => {
	const key = curve.keyFromPrivate(Buffer.from(privateKey, 'hex'));
	const sig = key.sign(hashMessageHex(msgHex));
	const n = 32;
	const r = sig.r.toArrayLike(Buffer, 'be', n);
	const s = sig.s.toArrayLike(Buffer, 'be', n);
	return Buffer.concat([r, s]).toString('hex');
};

const signer = async (account) => {
	const keyId = 0;
	// const accountAddress = '0xf8d6e0586b0a20c7';
	// const pkey =
	// 	'0x5ba23e67c706041a141c7264a21c23d5062f35d42c4cfce8d6e48150aade7b19';
	const accountAddress = '0x120e725050340cab';
	const pkey =
		'0x18692391d5d0f84a3dd5f4fc05457d4777de5bc49347249a3ce42b48c395a4f2';

	return {
		...account,
		tempId: `${accountAddress}-${keyId}`,
		addr: sansPrefix(accountAddress),
		keyId: Number(keyId),
		signingFunction: async (signable) => {
			const signature = signWithKey(pkey, signable.message);
			return {
				addr: withPrefix(accountAddress),
				keyId: Number(keyId),
				signature,
			};
		},
	};
};

module.exports = signer;
