# nft_arch_comp

Repository for the source code used for the calculation presented in the NFT architecture comparison paper

## NOTE:

Both projects run directly in Ethereum's and Flow's local emulators. In the Ethereum example, we've used the Hardhat framework for development and testing purposes, which includes an instantiation of a local testnet (hardhat node). Repeating the tests in Ethereum/Solidity is slightly more complex since:

-   You have to install Hardhat
-   You have to install npm's dotenv package.
-   You have to configure a .env file with the private keys of test accounts generated from Hardhat's local emulator instance.

The Flow/Cadence testing is simpler because Flow's local emulator is generally more deterministic. Still:

-   You have to install flow-cli
-   You have to create a .pkey file with the private keys for each test account used

Use the scripts included in each project folder to simplify some of the steps above.
Any issues, please contact ricardo.almeida@unicam.it for clarifications.
