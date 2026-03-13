# StellarSplit Smart Contract Developer Guide

This guide explains how the Soroban escrow contract works, how to deploy it, and how to interact with it from the backend.

## Architecture Overview

The `SplitEscrow` contract manages the lifecycle of shared bill payments. It acts as a trusted third party that holds funds until all participants have contributed their shares.

### Escrow Lifecycle

1.  **Creation**: A creator initiates a split with a description, total amount, and participant list.
2.  **Collection**: Participants deposit tokens into the contract.
3.  **Completion/Release**: Once fully funded, the contract automatically (or manually) releases funds to the creator.
4.  **Cancellation**: The creator can cancel a pending split, allowing participants to claim refunds.

---

## Local Setup

### Prerequisites
- **Rust**: `rustup default nightly`
- **Soroban CLI**: `cargo install --locked soroban-cli`
- **Stellar CLI**: `cargo install --locked stellar-cli`

### Network Configuration
```bash
# Add testnet
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate/Add identity
stellar keys generate dev --network testnet
```

---

## Building and Testing

### Build
```bash
cargo build --target wasm32-unknown-unknown --release
```

### Run Tests
```bash
cargo test
```

---

## Deployment

```bash
# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/split_escrow.wasm \
  --source dev \
  --network testnet
```

---

## Contract Interface

### Methods

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `initialize` | `admin: Address`, `token: Address` | `void` | Sets the admin and token address. |
| `create_split` | `creator: Address`, `description: String`, `total_amount: i128`, ... | `u64` | Creates a new split record. |
| `deposit` | `split_id: u64`, `participant: Address`, `amount: i128` | `void` | Deposits funds for a participant. |
| `release_funds`| `split_id: u64` | `Result<(), Error>` | Releases fully collected funds. |
| `release_partial`| `split_id: u64` | `Result<i128, Error>` | Releases available funds. |
| `cancel_split` | `split_id: u64` | `void` | Cancels split (Creator only). |
| `get_split` | `split_id: u64` | `Split` | Returns split details. |

### Events (Topics)

- `init`: Emitted on contract initialization.
- `created`: Emitted when a new split is created.
- `deposit`: Emitted on every participant deposit.
- `released`: Emitted when funds are released.
- `completed`: Emitted when split becomes fully funded.
- `cancel`: Emitted when split is cancelled.

### Error Codes

- `1`: `AlreadyInitialized`
- `2`: `NotInitialized`
- `3`: `EscrowNotFound`
- `6`: `InvalidAmount`
- `8`: `Unauthorized`
- `9`: `ParticipantNotFound`

---

## Backend Integration

The backend interacts with the contract using the `stellar-sdk`. Ensure you track the `split_id` returned during creation and listen for the `deposit` event to update local database states.
