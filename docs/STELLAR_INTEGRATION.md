# Stellar Integration Guide

A comprehensive guide for contributors on how StellarSplit integrates with the Stellar network and Freighter wallet.

---

## Table of Contents

1. [Introduction to Stellar](#introduction-to-stellar)
2. [Freighter Wallet](#freighter-wallet)
3. [Connecting to Freighter](#connecting-to-freighter)
4. [Building and Signing Transactions](#building-and-signing-transactions)
5. [Verifying Payments on Horizon](#verifying-payments-on-horizon)
6. [Testnet vs Mainnet](#testnet-vs-mainnet)
7. [Funding Your Testnet Wallet](#funding-your-testnet-wallet)

---

## Introduction to Stellar

### What is Stellar?

Stellar is a decentralized, open-source blockchain network designed for fast, low-cost cross-border payments and asset issuance. It enables:

- **Fast transactions**: 3-5 second settlement time
- **Low fees**: Average transaction cost is fractions of a cent
- **Multi-currency support**: Native XLM and custom assets (like USDC)
- **Built-in decentralized exchange**: Path payments for currency conversion

### XLM (Lumens)

XLM is the native cryptocurrency of the Stellar network:

- **Symbol/Ticker**: XLM
- **Purpose**: Pay transaction fees, maintain minimum account balance (1 XLM)
- **Divisibility**: 7 decimal places (1 XLM = 10,000,000 stroops)

### USDC on Stellar

USDC is a stablecoin pegged to the US Dollar, issued on Stellar by Circle:

- **Asset Code**: USDC
- **Issuer**: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
- **Benefits**: Price stability, fast settlement, low fees

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Account** | A Stellar address starting with 'G' (e.g., `GABCD...`) |
| **Trustline** | Authorization to hold a specific asset (required for USDC) |
| **Sequence Number** | Unique number for each transaction to prevent replays |
| **Memo** | Optional note attached to transactions |

---

## Freighter Wallet

### What is Freighter?

Freighter is a browser extension wallet for Stellar that allows users to:

- Store and manage Stellar accounts securely
- Sign transactions without exposing private keys
- Switch between testnet and mainnet networks
- View account balances and transaction history

### Installation

1. **Chrome/Brave/Edge**:
   ```
   https://chromewebstore.google.com/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk
   ```

2. **Firefox**:
   ```
   https://addons.mozilla.org/en-US/firefox/addon/freighter/
   ```

3. **Verify Installation**: Look for the Freighter icon in your browser toolbar after installation

### Setting Up for Development

1. **Create a New Account**:
   - Click the Freighter icon
   - Select "Create a new wallet"
   - Save your recovery phrase securely

2. **Switch to Testnet**:
   - Open Freighter settings
   - Change network from "Mainnet" to "Testnet"
   - This allows testing without real funds

3. **Fund Your Testnet Account**:
   - Use [Friendbot](#funding-your-testnet-wallet) to get free test XLM

---

## Connecting to Freighter

### The `@stellar/freighter-api` Package

StellarSplit uses the official Freighter API package:

```bash
npm install @stellar/freighter-api
```

### Core Functions

#### 1. Detect Freighter Installation

```typescript
import { isFreighterInstalled } from '../config/walletConfig'

const installed = await isFreighterInstalled()
if (!installed) {
  console.log('Please install Freighter wallet')
}
```

**Implementation Details**:
- Uses `postMessage` handshake to detect the extension
- Retries up to 4 times with increasing timeouts
- Checks for `window.freighter` or `window.freighterApi`

#### 2. Request Wallet Access

```typescript
import { connectWallet } from '../config/walletConfig'

try {
  const publicKey = await connectWallet()
  console.log('Connected:', publicKey) // GABCD...
} catch (error) {
  console.error('Connection failed:', error)
}
```

**What Happens**:
1. Freighter popup appears asking user permission
2. User approves connection
3. Returns the public key (Stellar address)
4. App can now request transaction signing

#### 3. Check Connection Status

```typescript
import { getWalletPublicKey } from '../config/walletConfig'

try {
  const publicKey = await getWalletPublicKey()
  console.log('Already connected:', publicKey)
} catch (error) {
  console.log('Not connected')
}
```

#### 4. Get Network Information

```typescript
import { getFreighterNetworkPassphrase } from '../config/walletConfig'

const passphrase = await getFreighterNetworkPassphrase()
// Returns: "Test SDF Network ; September 2015" (testnet)
// Or: "Public Global Stellar Network ; September 2015" (mainnet)
```

### React Hook: `useWallet`

StellarSplit provides a React hook for wallet state management:

```typescript
import { useWallet } from '../hooks/use-wallet'

function MyComponent() {
  const {
    publicKey,              // Connected wallet address
    isConnected,            // Boolean connection status
    isConnecting,           // Loading state
    hasFreighter,           // Extension installed?
    error,                  // Error message
    walletNetworkPassphrase,// Current network
    isOnAllowedNetwork,     // Valid network?
    connect,                // Connect function
    disconnect,             // Disconnect function
    signTransaction,        // Sign transaction function
  } = useWallet()

  return (
    <button onClick={connect}>
      {isConnected ? publicKey : 'Connect Wallet'}
    </button>
  )
}
```

### Wallet Button Component

The app includes a pre-built wallet button:

```typescript
import { WalletButton } from '../components/wallet-button'

function Header() {
  return <WalletButton />
}
```

Features:
- Shows "Install Freighter" if not installed
- Shows "Connecting..." during connection
- Displays shortened address when connected
- Shows "Wrong Network" if on unsupported network

---

## Building and Signing Transactions

### Transaction Flow Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backend   │────▶│  Build Tx   │────▶│   Freighter │────▶│   Submit    │
│  (Server)   │     │   (XDR)     │     │   (Sign)    │     │  (Horizon)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Step 1: Build Transaction (Backend)

The backend builds unsigned transactions using the Stellar SDK:

```typescript
import { Horizon, Asset, TransactionBuilder, Operation, Networks } from '@stellar/stellar-sdk'

// Initialize Horizon server
const server = new Horizon.Server('https://horizon-testnet.stellar.org')

// Load source account (to get current sequence number)
const account = await server.loadAccount(sourcePublicKey)

// Build transaction
const transaction = new TransactionBuilder(account, {
  fee: '100',                    // Base fee in stroops
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.payment({
      destination: destinationPublicKey,
      asset: Asset.native(),     // XLM
      amount: '10.5',            // Amount in XLM
    })
  )
  .setTimeout(180)               // 3 minutes
  .build()

// Convert to XDR (External Data Representation)
const transactionXDR = transaction.toXDR()
```

### Step 2: Sign Transaction (Frontend)

The frontend requests Freighter to sign the transaction:

```typescript
import { signWithFreighter } from '../config/walletConfig'

// transactionXDR comes from backend
const signedXDR = await signWithFreighter(transactionXDR, networkPassphrase)
```

**What Happens**:
1. Freighter popup opens showing transaction details
2. User reviews amount, destination, and fee
3. User enters password (if required)
4. Freighter signs with private key (never exposed to app)
5. Returns signed transaction XDR

### Step 3: Submit Transaction (Backend)

Submit the signed transaction to the Stellar network:

```typescript
import { Horizon } from '@stellar/stellar-sdk'

const server = new Horizon.Server('https://horizon-testnet.stellar.org')

// Decode signed XDR
const transaction = Horizon.TransactionBuilder.fromXDR(signedXDR, Networks.TESTNET)

// Submit to network
const result = await server.submitTransaction(transaction)
console.log('Transaction hash:', result.hash)
```

### Path Payments (Multi-Currency)

StellarSplit supports automatic currency conversion via path payments:

```typescript
// Example: Pay 10 USDC using XLM (automatic conversion)
const transaction = new TransactionBuilder(account, {
  fee: '100',
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.pathPaymentStrictReceive({
      sendAsset: Asset.native(),                    // Send XLM
      sendMax: '50',                                // Max XLM to send
      destination: destinationPublicKey,
      destAsset: new Asset('USDC', usdcIssuer),    // Receive USDC
      destAmount: '10',                             // Exactly 10 USDC
      path: [],                                     // Auto-find path
    })
  )
  .setTimeout(180)
  .build()
```

**Key Points**:
- `sendMax`: Maximum amount willing to spend (slippage protection)
- `destAmount`: Exact amount recipient receives
- Stellar automatically finds the best conversion path

### Payment URIs

StellarSplit supports Stellar Payment Protocol URIs for deep linking:

```typescript
import { buildStellarPaymentURI } from '../utils/stellar/paymentUri'

const uri = buildStellarPaymentURI({
  destination: 'GABCD...',
  amount: 10.5,
  assetCode: 'USDC',
  assetIssuer: 'GA5ZSE...',
  memo: 'Split payment #123',
  memoType: 'text',
})

// Result: web+stellar:pay?destination=GABCD...&amount=10.5&asset_code=USDC...
```

---

## Verifying Payments on Horizon

### What is Horizon?

Horizon is Stellar's API server that provides:

- Transaction submission
- Account information
- Transaction history
- Payment path finding

**Endpoints**:
- Testnet: `https://horizon-testnet.stellar.org`
- Mainnet: `https://horizon.stellar.org`

### Verification Process

When a user submits a payment, the backend verifies it:

```typescript
import { Horizon } from '@stellar/stellar-sdk'

async function verifyTransaction(txHash: string) {
  const server = new Horizon.Server('https://horizon-testnet.stellar.org')
  
  // 1. Fetch transaction
  const transaction = await server
    .transactions()
    .transaction(txHash)
    .call()
  
  // 2. Check if successful
  if (!transaction.successful) {
    throw new Error('Transaction failed')
  }
  
  // 3. Get operations (payment details)
  const operations = await server
    .operations()
    .forTransaction(txHash)
    .call()
  
  // 4. Find payment operation
  const payment = operations.records.find(op => 
    op.type === 'payment' || op.type.includes('path_payment')
  )
  
  return {
    valid: true,
    amount: payment.amount,
    asset: payment.asset_type === 'native' ? 'XLM' : payment.asset_code,
    sender: transaction.source_account,
    receiver: payment.to,
    timestamp: transaction.created_at,
  }
}
```

### StellarService in StellarSplit

The app includes a `StellarService` for verification:

```typescript
// backend/src/stellar/stellar.service.ts
@Injectable()
export class StellarService {
  async verifyTransaction(txHash: string) {
    // Fetches transaction from Horizon
    // Validates success status
    // Extracts payment operation details
    // Returns structured payment info
  }
  
  async isAccountActive(accountId: string): Promise<boolean> {
    // Checks if account exists on network
  }
  
  async getAccountDetails(accountId: string) {
    // Returns account balances, sequence, etc.
  }
}
```

### Payment Verification Flow

```
User submits payment ──▶ Backend receives txHash
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Call Horizon API   │
                    │  Get transaction    │
                    └─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Check exists    Check success    Get operations
              │               │               │
              └───────────────┴───────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Validate against   │
                    │  expected amount    │
                    └─────────────────────┘
                              │
                              ▼
                    Update participant status
```

---

## Testnet vs Mainnet

### Network Differences

| Feature | Testnet | Mainnet |
|---------|---------|---------|
| **Purpose** | Development & testing | Production use |
| **Value** | Test XLM has no value | Real XLM has monetary value |
| **Funding** | Free via Friendbot | Must purchase |
| **Stability** | May be reset occasionally | Permanent |
| **URL** | horizon-testnet.stellar.org | horizon.stellar.org |
| **Passphrase** | "Test SDF Network ; September 2015" | "Public Global Stellar Network ; September 2015" |

### Switching Networks

#### In Freighter Wallet

1. Click the Freighter icon
2. Click the settings gear
3. Select "Network"
4. Choose "Testnet" or "Mainnet"

#### In Application Code

```typescript
// Configuration
const NETWORKS = {
  TESTNET: {
    url: 'https://horizon-testnet.stellar.org',
    passphrase: 'Test SDF Network ; September 2015',
  },
  MAINNET: {
    url: 'https://horizon.stellar.org',
    passphrase: 'Public Global Stellar Network ; September 2015',
  },
}

// Use environment variable
const network = process.env.STELLAR_NETWORK === 'mainnet' 
  ? NETWORKS.MAINNET 
  : NETWORKS.TESTNET
```

#### Environment Variables

```bash
# .env file
STELLAR_NETWORK=testnet  # or 'mainnet' for production
```

### Best Practices

1. **Never use mainnet for development**: Always test on testnet first
2. **Validate network**: Check user's wallet network matches app expectation
3. **Clear separation**: Use different database/environment for testnet vs mainnet
4. **User warnings**: Clearly indicate which network is active in UI

---

## Funding Your Testnet Wallet

### What is Friendbot?

Friendbot is a service that funds testnet accounts with free XLM for development.

### Using Friendbot

#### Method 1: Web Interface

1. Get your testnet public key from Freighter (starts with 'G')
2. Visit: `https://laboratory.stellar.org/#account-creator?network=test`
3. Enter your public key
4. Click "Create account"

#### Method 2: API Call

```bash
curl -X POST https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY
```

Example:
```bash
curl -X POST https://friendbot.stellar.org?addr=GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM
```

#### Method 3: JavaScript/TypeScript

```typescript
async function fundTestnetAccount(publicKey: string) {
  const response = await fetch(
    `https://friendbot.stellar.org?addr=${publicKey}`
  )
  
  if (response.ok) {
    const result = await response.json()
    console.log('Account funded!', result)
    return result
  } else {
    throw new Error('Funding failed')
  }
}
```

### What You Get

- **10,000 XLM** (standard Friendbot funding)
- Activated account (minimum balance requirement met)
- Ability to create trustlines and send payments

### Checking Your Balance

After funding, check your balance:

1. **In Freighter**: Open the extension to see balance
2. **Via Horizon API**:
   ```bash
   curl https://horizon-testnet.stellar.org/accounts/YOUR_PUBLIC_KEY
   ```
3. **In StellarSplit**: Connect wallet to see balance in app

### Setting Up USDC on Testnet

To receive USDC, you need a trustline:

1. Get testnet USDC issuer address
2. In Freighter: Click "Add asset"
3. Enter USDC code and issuer
4. Sign the trustline transaction

---

## Quick Reference

### Common Operations

```typescript
// Check if Freighter is installed
import { isFreighterInstalled } from '@stellar/freighter-api'
const installed = await isFreighterInstalled()

// Connect wallet
import { requestAccess } from '@stellar/freighter-api'
const { address } = await requestAccess()

// Sign transaction
import { signTransaction } from '@stellar/freighter-api'
const { signedTxXdr } = await signTransaction(xdr, { networkPassphrase })

// Get network
import { getNetworkDetails } from '@stellar/freighter-api'
const { networkPassphrase } = await getNetworkDetails()
```

### Network Passphrases

```typescript
const Networks = {
  TESTNET: 'Test SDF Network ; September 2015',
  PUBLIC: 'Public Global Stellar Network ; September 2015',
  FUTURENET: 'Test SDF Future Network ; October 2022',
}
```

### Important URLs

| Resource | URL |
|----------|-----|
| Freighter Extension | https://freighter.app |
| Testnet Horizon | https://horizon-testnet.stellar.org |
| Mainnet Horizon | https://horizon.stellar.org |
| Friendbot | https://friendbot.stellar.org |
| Laboratory | https://laboratory.stellar.org |

### File Locations in StellarSplit

```
frontend/
├── src/
│   ├── config/
│   │   └── walletConfig.ts      # Freighter connection logic
│   ├── hooks/
│   │   └── use-wallet.tsx       # React wallet hook
│   ├── utils/stellar/
│   │   ├── paymentUri.ts        # Payment URI builder
│   │   └── wallet.ts            # Wallet utilities
│   └── components/
│       └── wallet-button.tsx    # Wallet UI component

backend/
├── src/
│   ├── stellar/
│   │   ├── stellar.service.ts   # Transaction verification
│   │   └── stellar.module.ts    # Stellar module
│   └── multi-currency/
│       └── path-payment.service.ts  # Path payment logic
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Freighter not installed" | Install extension from Chrome Web Store |
| "Freighter not connected" | Click wallet button and approve connection |
| "Wrong network" | Switch Freighter to testnet in settings |
| "Account not found" | Fund account with Friendbot |
| Transaction fails | Check account has sufficient XLM for fees |
| "Insufficient balance" | Ensure minimum 1 XLM + transaction fees |

### Getting Help

- [Stellar Documentation](https://developers.stellar.org/)
- [Freighter Documentation](https://docs.freighter.app/)
- [Stellar Discord](https://discord.gg/stellar)
- [Stellar Stack Exchange](https://stellar.stackexchange.com/)

---

## Next Steps

1. **Install Freighter** and create a testnet account
2. **Fund your account** using Friendbot
3. **Explore the code** in `frontend/src/config/walletConfig.ts`
4. **Try the wallet connection** in the StellarSplit app
5. **Review** `backend/src/stellar/stellar.service.ts` for verification logic

Happy coding on Stellar! 🚀
