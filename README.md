# Anonymous provision of services via blockchain

## Installation

### Install Powergate (IPFS + Lotus)

Follow the installation `https://github.com/textileio/powergate#localnet-mode`

### Install Ganache — Ethereum development blockchain

https://github.com/trufflesuite/ganache/tree/master#docker

1. Start a docker container with ganache `docker run --detach --publish 8545:8545 trufflesuite/ganache:latest`

### Install Monero
From https://monero.stackexchange.com/a/9869/14294

1. Download and install Monero CLI wallet binaries: https://www.getmonero.org/downloads/  
2. Use `monero-wallet-cli` to interact with daemon https://www.getmonero.org/resources/user-guides/monero-wallet-cli.html

Start 2 nodes of a stagenet which only like talking to each other:
```
monerod --stagenet --no-igd --hide-my-port --data-dir node1 --p2p-bind-ip 127.0.0.1 --p2p-bind-port 48080 --rpc-bind-port 48081 --zmq-rpc-bind-port 48082 --add-exclusive-node 127.0.0.1:38080
monerod --stagenet --no-igd --hide-my-port --data-dir node2 --p2p-bind-ip 127.0.0.1 --rpc-bind-ip 0.0.0.0 --confirm-external-bind --add-exclusive-node 127.0.0.1:48080
```

Then start client's cli wallet on the same machine:

```bash
monero-wallet-cli --stagenet
```
And mine some blocks `start_mining <yourwalletaddress> 1`


Then start SP's cli wallet on the same machine:

```bash
monero-wallet-cli --stagenet
```

And mine some blocks `start_mining <yourwalletaddress> 1`

After some time, both wallets should have some balance. Check balance with `refresh` command.

Client's address is 5Azsn5VgEje8ocGTJcyXNcj2rGdNHEbyNQBJJjrYvCxrJjNCDZuQxoT6caF12TSoNr77WwoEGUsfofQxHG2s84htP7K918K
SP's address is 5B6PgosHHqXNRgMhGyN25pewMf1VjoCWvGQJRzFYkj3UYZwvTaHfG2gdrSAWxLmgHphhh1Zt1AsvgRj6eBYQb3MW5YSXiUr

#### Proving to a third party you paid someone

https://www.getmonero.org/resources/user-guides/monero-wallet-cli.html#proving-to-a-third-party-you-paid-someone

1. Enable per-transaction proof generation by setting `set store-tx-info 1`

2. Send transaction from client to SP: 
`get_tx_key <key>`

`check_tx_key TXID TXKEY ADDRESS`



### Deploy smart contract

1. Go to smartcontracts directory `cd smartcontracts`.
2. Connect truffle console connecting to ganache blockchain `truffle console`.
3. Deploy the smartcontract `migrate --project development`, such command compile the smart contract and output the ABI to `webapp/src/contracts/AnonSer.json`.

### Start a webapp

1. Go to webapp directory `cd webapp`.
2. Start an npm server `npm start`.

# Flow

1. Client opens the web app. The app generate keypair in DHKE complaint way and a random provisionId.
2. The app allows for downloading QR code which includes his public key (0x030996a0abeab1c02aa9d9fc0062a68410278328c332eaa9980f6033869c3e4c51) and random provisionId (0xa89338dba7ba5aa46c4dfadd209bfd82a99564444767041ce7f35af7189100f4) (provisionId is generated client side because it allows for one way communication). 
3. The QR code is printed and attached to materials forming package pkg.
4. Pkg is delivered to service provider along with optional cash. 
5. SP scan the QR code, and decode public key, provisionId (0x030996a0abeab1c02aa9d9fc0062a68410278328c332eaa9980f6033869c3e4c51, 0xa89338dba7ba5aa46c4dfadd209bfd82a99564444767041ce7f35af7189100f4)

6.1. If Client has paid in cash then SP can publish Proof of Delivery on Ethereum smart contract immediately indicating that the service has been paid.
6.2. If Client has not paid in cash then SP generates new integrated address for the client and publish Proof of Delivery with the decidated address for this particular provision.
6.2.1 SP calculates the payment ID which is first 8 bytes of SHA256 hash of provisionId  (0xa89338dba7ba5aa46c4dfadd209bfd82a99564444767041ce7f35af7189100f4) and publish it on Ethereum smart contract.
6.2.2 Calculate the payment ID with `echo -n "a89338dba7ba5aa46c4dfadd209bfd82a99564444767041ce7f35af7189100f4" | shasum -a 256 | cut -f 1 -d " " | head -c 16` which gives us `b5117c8076f969b6`.
6.2.3 SP creates integrated address using the payment ID `integrated_address b5117c8076f969b6` which encodes to an address `5Lo4hcgmu73NRgMhGyN25pewMf1VjoCWvGQJRzFYkj3UYZwvTaHfG2gdrSAWxLmgHphhh1Zt1AsvgRj6eBYQb3MW7outEsEws1aMdBwaAS`.

7. The client app, listens for Ethereum smart contract.
8. Once SP has published Proof of Delivery and Client had not paid with cash, Client can pay for the provision using the dedicated address provided in the smart contract.
8.1. 
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