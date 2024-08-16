# Anonymous Provision of Services via Blockchain

## Installation

### Install Powergate (IPFS + Lotus)

Follow the installation instructions [here](https://github.com/textileio/powergate#localnet-mode) to set up Powergate, which combines IPFS and Lotus.

### Install Ganache — Ethereum Development Blockchain

1. Follow the instructions [here](https://github.com/trufflesuite/ganache/tree/master#docker) to install Ganache.
2. Start a Docker container with Ganache:
   ```bash
   docker run --detach --publish 8545:8545 trufflesuite/ganache:latest
   ```
3. Import one of the generated accounts into MetaMask.

### Install Monero

1. Download and install the Monero CLI wallet binaries from the official [Monero website](https://www.getmonero.org/downloads/).
2. Use `monero-wallet-cli` to interact with the daemon. Refer to the [user guide](https://www.getmonero.org/resources/user-guides/monero-wallet-cli.html) for details.

Start two nodes on a stagenet that only communicate with each other:
```bash
monerod --stagenet
```

Then start the client's CLI wallet on the same machine:
```bash
monero-wallet-cli --stagenet
```
Mine some blocks:
```bash
start_mining <yourwalletaddress> 1
```

Repeat the above steps for the Service Provider's (SP) CLI wallet:
```bash
monero-wallet-cli --stagenet
```
Mine some blocks as well:
```bash
start_mining <yourwalletaddress> 1
```

After a short time, both wallets should show a balance. Check the balance with the `refresh` command.

- Client's address: `5Azsn5VgEje8ocGTJcyXNcj2rGdNHEbyNQBJJjrYvCxrJjNCDZuQxoT6caF12TSoNr77WwoEGUsfofQxHG2s84htP7K918K`
- SP's address: `5B6PgosHHqXNRgMhGyN25pewMf1VjoCWvGQJRzFYkj3UYZwvTaHfG2gdrSAWxLmgHphhh1Zt1AsvgRj6eBYQb3MW5YSXiUr`

#### Proving to a Third Party You Paid Someone

1. Enable per-transaction proof generation by setting:
   ```bash
   set store-tx-info 1
   ```
2. Send a transaction from the client to SP and generate a proof:
   ```bash
   get_tx_key <key>
   ```
3. Verify the transaction using:
   ```bash
   check_tx_key TXID TXKEY ADDRESS
   ```

### Deploy the Smart Contract

1. Navigate to the smart contracts directory:
   ```bash
   cd smartcontracts
   ```
2. Connect to the Ganache blockchain with Truffle:
   ```bash
   truffle console
   ```
3. Deploy the smart contract:
   ```bash
   migrate --network development
   ```
   This will compile the smart contract and output the ABI to `webapp/src/contracts/AnonSer.json`.

### Start the Web App

1. Navigate to the web app directory:
   ```bash
   cd webapp
   ```
2. Start the npm server:
   ```bash
   npm start
   ```

## Flow

1. **Client:** Opens the web app, which generates a DHKE-compliant key pair and a random `provisionId`.
2. **QR Code:** The app generates a QR code containing the public key and `provisionId`, which the client downloads and prints as a label.
3. **Package:** The QR code is attached to the materials package (`pkg`) and delivered to the service provider, optionally with cash.
4. **SP:** Scans the QR code to retrieve the public key and `provisionId`.
5. **Payment:**
   - If paid in cash, SP can immediately publish a Proof of Delivery on the Ethereum smart contract.
   - If not, SP generates a new integrated address for the client, calculates a payment ID, and publishes the Proof of Delivery along with the dedicated payment address.
6. **Client:** Listens for events on the Ethereum smart contract.
7. **Payment:** If not paid in cash, the client sends payment to the specified address.
8. **Service Provision:** SP processes the payment, provides the service, and uploads the results to the Powergate network.
9. **Result Delivery:** SP publishes the proof of provision to the Ethereum smart contract.
10. **Client:** Retrieves and decrypts the results from IPFS/Lotus using the smart contract information.

## Components

### Client's App Responsibilities:
- Generate a random key pair and `provisionId`.
- Encode the public key and `provisionId`, generate a QR code, and download it as a printable label.
- Listen for smart contract events and fetch/decrypt provision results from IPFS/Lotus.

### SP's App Responsibilities:
- Scan and decode the QR code.
- Publish transactions to the Ethereum smart contract.
- Listen for payments on supported methods.
- Upload provision results to IPFS/Lotus.

### User Responsibilities:
- Use the web app, print the QR code, and attach it to the package.
- Deliver the package to the Service Provider.
- Pay for the service, either in cash or via another supported method.
- Notify authorities in case of a conflict.

### SP Responsibilities:
- Accept the package with the printed QR code label.
- Handle payments and service provision according to the protocol.

## Development

### Client App
- Initialized using `create-react-app`.
- Integrated with `web3js` for blockchain interaction.
- User interface with options to start new provisions or check provision status.

### Server App
- Accept packages and handle payment verification.
- Manage the lifecycle of service provision.
