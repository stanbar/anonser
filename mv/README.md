# Anonser-BC^MV — Digital-Verifiable Multi-Provider Variant

Minimal PoC implementing the **Anonser-BC^MV** DeskGW protocol flow on an EVM chain.
This is the digital-verifiable path (not the physical-material DRS path).

## Protocol Overview (DeskGW)

```
┌─────────┐     request()      ┌──────────┐
│  Client  │───(escrow+CID)───▶│  DeskGW  │
│(ephemeral│                   │ Contract │
│ address) │◀──────────────────│          │
└────┬─────┘   timeout()       └────┬─────┘
     │         (refund)             │
     │                              │ claim()
     │                         ┌────▼──────┐
     │                         │  Provider │
     │                         │(allowlist)│
     │    ◀── complete() ──────┤           │
     │    (resultCid+proof     └───────────┘
     │     → escrow released)
     ▼
  Retrieve & decrypt result
```

### Algorithms (maps to dissertation)

| Algorithm | Contract function | Description |
|-----------|------------------|-------------|
| `alg:anonser-deploy` | `constructor()` | Pin service descriptor, fee, time windows, provider allowlist |
| `alg:anonser-request` | `request(requestId, payloadCid)` | Client escrows `serviceFee`, stores encrypted payload CID |
| `alg:anonser-claim` | `claim(requestId)` | Allowed provider commits to serve the request |
| `alg:anonser-complete` | `complete(requestId, resultCid, proof)` | Provider posts signed result; escrow released to provider |
| `alg:anonser-timeout` | `timeout(requestId)` | Client reclaims escrow after deadline (claim or completion window) |

## Gap Report: Legacy vs. MV Variant

| Feature | Legacy (`smartcontracts/`) | MV (`mv/`) |
|---------|---------------------------|------------|
| Provider model | Single SP (owner) | Multiple providers via allowlist |
| Payment | Off-chain (Monero/cash) | On-chain escrow (ETH) |
| Payload delivery | Physical package + QR code | Encrypted blob (content-addressed store) |
| Result delivery | Powergate (IPFS+Filecoin) | Content-addressed local store (IPFS-compatible) |
| Proofs | PoD + PoP (SP signs) | Claim commitment + completion proof (ECDSA) |
| Timeout / refund | No on-chain timeout | On-chain timeout refund |
| Encryption | ECDH (secp256k1) + AES-CTR | ECDH (secp256k1) + AES-256-CTR |
| Dispute resolution | Off-chain (courts) | Out of scope (see below) |
| Anonymity | Ephemeral keypair + Monero + Tor | Ephemeral EOA + encrypted blobs |

## Directory Structure

```
mv/
├── contracts/
│   └── DeskGW.sol              # Core smart contract
├── test/
│   ├── DeskGW.test.ts          # 28 contract tests
│   └── payload-store.test.ts   # 6 payload store + crypto tests
├── lib/
│   └── payload-store.ts        # Content-addressed store + ECDH encryption
├── scripts/
│   ├── compile.js              # Offline solcjs compiler
│   └── deploy.ts               # Hardhat deployment script
├── app/                        # Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Home page
│       │   ├── client/page.tsx # Client flow
│       │   ├── provider/page.tsx # Provider flow
│       │   └── api/blob/route.ts # Content-addressed blob API
│       └── lib/
│           ├── contract.ts     # ABI + constants
│           └── crypto.ts       # Browser ECDH + AES helpers
├── hardhat.config.ts
├── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Node.js >= 18
- MetaMask (or any EVM wallet browser extension)

### 1. Install dependencies

```bash
cd mv
npm install
cd app && npm install && cd ..
```

### 2. Compile contracts

```bash
npm run compile
```

Uses the bundled `solcjs` (0.8.26) — no network download needed.

### 3. Run tests

```bash
npm test
# Or without recompiling:
npx hardhat test --no-compile
```

Expected output: **34 passing** tests covering all contract flows and encryption.

### 4. Start local chain + deploy

```bash
# Terminal 1: Start local Hardhat node
npm run node

# Terminal 2: Deploy
npm run deploy:local
```

Note the deployed contract address from the output.

### 5. Start the web app

```bash
# Set the contract address
cd app
NEXT_PUBLIC_DESKGW_ADDRESS=0x<address> npm run dev
```

Open http://localhost:3000 in your browser.

### 6. Demo flow

1. **Client page** (`/client`):
   - Connect MetaMask (switch to Hardhat localhost network, chain ID 31337)
   - Import a Hardhat test account (account index 2+ for client)
   - Enter payload text, click "Create Request"
   - **Save the ephemeral key and request ID**

2. **Provider page** (`/provider`):
   - Connect MetaMask with a provider account (index 1 or 2 from deploy)
   - Paste the request ID, click "Look Up"
   - Click "Claim Request"
   - Enter result text and the shared encryption key
   - Click "Upload Result & Complete"

3. **Client page** (`/client`):
   - Paste request ID and ephemeral key in the status section
   - Click "Check Status" → should show "Completed"
   - Click "Decrypt & Download Result" → see the decrypted result

4. **Timeout flow**:
   - Create a request, do NOT claim or complete it
   - Wait for the claim window to expire (1 hour on testnet, or use `evm_increaseTime`)
   - Click "Request Timeout Refund" → escrow returned

## Anonymity Model (Operational Assumptions)

This PoC implements **minimal anonymity mechanics** via ephemeral addresses:

1. **Ephemeral client EOA**: Each request uses a fresh Ethereum address. The client funds this address from a privacy-preserving source (mixer, bridge, CEX withdrawal, etc.).
2. **Encrypted payloads**: Payload and result blobs are AES-256-CTR encrypted with a shared key. Only opaque SHA-256 hashes appear on-chain.
3. **No on-chain identity**: The contract stores no names, emails, or persistent identifiers.

### Out-of-Scope Anonymity Leakage Vectors

The following are **known leakage risks** that this PoC does NOT mitigate:

| Vector | Description | Mitigation (not implemented) |
|--------|-------------|------------------------------|
| **Funding source** | The ephemeral EOA must be funded; the funding tx may be linkable | Use Tornado Cash / railgun / fresh CEX withdrawal |
| **IP address** | RPC calls reveal the client's IP to the Ethereum node | Use Tor or a privacy RPC relay |
| **Timing correlation** | Request creation time + blob upload time may correlate | Add random delays; use a relay |
| **Gas price fingerprinting** | Wallet-specific gas settings may fingerprint the client | Use standard gas oracle settings |
| **Blob store metadata** | The local blob API logs client IP in HTTP access logs | Use IPFS gateway over Tor |
| **Browser fingerprinting** | MetaMask + browser may leak identity signals | Use a dedicated browser profile |
| **Provider collusion** | Multiple providers could share payload data to deanonymize | Out of protocol scope |
| **Key reuse** | Reusing the same ephemeral key across requests breaks unlinkability | Generate fresh keys per request (enforced in UI) |

### Mocked / Simplified Components

| Component | PoC implementation | Production replacement |
|-----------|-------------------|----------------------|
| Key exchange | Symmetric key (client generates, shares OOB) | Full ECDH with secp256k1 public keys on-chain |
| Blob store | Local filesystem (`/api/blob`) | IPFS + Filecoin (Powergate or web3.storage) |
| Provider discovery | Static allowlist in contract constructor | On-chain registry / DAO governance |
| Dispute resolution | None (escrow + timeout only) | Kleros / Aragon Court / on-chain arbitration |
| Completion proof | ECDSA signature over `(requestId \|\| resultCid)` | Could include zkSNARK proof of correct computation |
| Service description | `keccak256("DNA paternity test")` hash | Structured service catalog with pricing tiers |

## Testing Summary

```
DeskGW (28 tests)
  Deployment         ✓ service params, allowlist, events, revert on bad input
  Request            ✓ open with escrow, reject wrong amount, reject duplicate
  Claim              ✓ allowed provider claims, reject unauthorized, reject expired
  Complete           ✓ payout on valid proof, reject wrong signer/expired/zero CID
  Timeout            ✓ refund after claim/completion window, reject premature/wrong caller
  Provider mgmt      ✓ add/remove by owner, reject non-owner
  Integration        ✓ full happy path end-to-end

PayloadStore + Crypto (6 tests)
  Store              ✓ put/get by content hash
  ECDH + AES         ✓ encrypt/decrypt round-trip, wrong-key rejection, full E2E with store
```

## Stack

- **Smart contracts**: Solidity 0.8.26 (compiled via bundled solcjs)
- **Testing**: Hardhat 2 + ethers v6 + Chai + hardhat-network-helpers
- **Frontend**: Next.js 14 (App Router) + ethers v6
- **Blob store**: Content-addressed local filesystem (SHA-256 as CID)
- **Encryption**: ECDH (secp256k1) + AES-256-CTR

> **Note**: The project was designed for Foundry but uses Hardhat due to
> environment constraints (no external network access for compiler downloads).
> The contract and test structure are compatible with both frameworks.
