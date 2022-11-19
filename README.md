# Anonymous provision of services via blockchain

## Installation

### Install Powergate (IPFS + Lotus)

Follow the installation `https://github.com/textileio/powergate#localnet-mode`

### Install Monero testnet

1. Download and install Monero CLI wallet binaries: https://www.getmonero.org/downloads/  
2. Compile and install Monero (libs are needed for xmrblocks) following https://github.com/moneroexamples/monero-compilation
3. Compile and install xmrblocs—Monero block exploler—following https://github.com/moneroexamples/onion-monero-blockchain-explorer
4. Use `monero-wallet-cli` to interact with daemon https://www.getmonero.org/resources/user-guides/monero-wallet-cli.html

### Install Ganache — Ethereum development blockchain

https://github.com/trufflesuite/ganache/tree/master#docker

1. start a docker container with ganache `docker run --detach --publish 8545:8545 trufflesuite/ganache:latest`

### Deploy smart contract

1. Go to smartcontracts directory `cd smartcontracts`.
2. Connect truffle console connecting to ganache blockchain `truffle console`.
3. Deploy the smartcontracts `migrate --project development`.
 
# Flow

1. Client opens the web app. The app generate keypair in DHKE complaint way and a random provisionId.
2. The app allows for downloading QR code which includes his public key and random provisionId (provisionId is generated client side because it allows for one way communication). 
3. The QR code is printed and attached to materials forming package pkg.
4. Pkg is delivered to service provider along with optional cash. 
5. SP scan the QR code, and decode public key, provisionId
6. SP publish Proof of Delivery on Ethereum smart contract. 
7. The client app, listens for Ethereum smart contract.
8. Once the Proof of Delivery is published he can pay for the provision by including the provisionId in a memo field.
9. SP listens for all supported payment methods.
10. Once the payment is published, SP starts the provision of a service.
11. Then the result is created and SP publish it to it's local Powergate network, or public https://estuary.tech or https://web3.storage for test purposes use Powergate network. Receive dealID and CID in return.
12. Publish proof of provision to ethereum smart contract.
13. Client app observe the smart contract and listen for transactions published to it. 
14. Client app gets notified about new event made for his publicKey.
15. Client app fetches the content CID and dealID and fetch the results from public gateway https://dweb.link/
16. The content is then decrypted and user can download it.

# Components

Client's app is responsible for:
- Generating random keypair and random provisionId https://www.npmjs.com/package/randombytes
- Encoding publicKey and provisionId Generating QR code and downloading it as a printable label. https://www.npmjs.com/package/react-qr-code
- Listening on Service Provider's smart contract events.
- Fetching and decrypting the provision result from IPFS/Lotus network.

SP's app is responsible for:
- Scanning and decoding the QR code
- Publishing transactions to Ethereum's smart contract
- Listening for payments on supported payment methods
- Publishing provision result to IPFS/Lotus networks.

User is responsible for:
- Using the WebApp.
- Printing QR code and sticking it on package.
- Delivering package to Service Provider. In person, via trusted person, or via deviery agent.
- Paying for the package, in cash or any other supported payment method.
- Notifying the justice in case of a conflict.

SP is responsible for:
- Accepting the package with printed QR code label.
- Sending 

Client App
- init create-react-app
- add web3js https://web3js.readthedocs.io/en/v1.8.0/getting-started.html#adding-web3
- connect to local-network where the smart contract is deployed.
- user opens the app, there is a button with "Start new provision" and "Check provision status".
- ... TODO

Server App
- Accept package
- Checkbox if paid synchroniously, a priori, with cash.
- ...TODO
