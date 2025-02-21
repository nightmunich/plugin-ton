# @elizaos/plugin-ton

A plugin for handling TON (Telegram Open Network) blockchain operations, providing wallet management and transfer capabilities.

## Overview

This plugin provides functionality to:

- Manage TON wallets and key derivation
- Execute secure token transfers
- Query wallet balances and portfolio information
- Format and cache transaction data
- Interface with TON blockchain via RPC endpoints

### Screenshot

![alt text](./screenshot/transfer.png "Transfer TON")

### Quick Start

```bash
# you should read the debug.sh first!

# if not provide the apikey, the response may very slow
export OPENAI_API_KEY=""

# if not provide the testnet apikey, the transfer action may not stable
# from https://t.me/toncenter to get your testnet apikey
export TON_RPC_API_KEY=""

# nvm use 23 && npm install -g pnpm
bash ./packages/plugin-ton/scripts/debug.sh
```

## Installation

```bash
npm install @elizaos/plugin-ton
```

## Configuration

The plugin requires the following environment variables:

```env
TON_PRIVATE_KEY=your_mnemonic_phrase  # Required - wallet mnemonic words
TON_RPC_URL=your_rpc_endpoint  # Optional - defaults to mainnet RPC
TON_RPC_API_KEY=
```

## Usage

Import and register the plugin in your Eliza configuration:

```typescript
import { tonPlugin } from "@elizaos/plugin-ton";

export default {
    plugins: [tonPlugin],
    // ... other configuration
};
```

## Features

### WalletProvider

The `WalletProvider` manages wallet operations and portfolio tracking:

```typescript
import { WalletProvider } from "@elizaos/plugin-ton";

// Initialize the provider
const provider = await initWalletProvider(runtime);

// Get wallet balance
const balance = await provider.getWalletBalance();

// Get formatted portfolio
const portfolio = await provider.getFormattedPortfolio(runtime);
```

### TransferAction

The `TransferAction` handles token transfers:

```typescript
import { TransferAction } from "@elizaos/plugin-ton";

// Initialize transfer action
const action = new TransferAction(walletProvider);

// Execute transfer
const hash = await action.transfer({
    recipient: "EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4",
    amount: "1.5",
});
```

## TonConnect Actions

The TonConnect Actions are responsible for handling interactions with the TON blockchain through the TON Connect protocol. These actions manage wallet connections, wallets switching, and token transfers. Below are the primary TonConnect actions available in this plugin.

### 1. Initialize Wallet Connection (INIT_TON_CONNECT)

The INIT_TON_CONNECT action allows users to initialize a connection with their TON wallet through the TON Connect protocol.
Description:

This action initiates the connection to a TON wallet using the TON Connect protocol. It allows users to establish a secure connection with their wallets and interact with the blockchain.

```typescript
import { TonConnectWalletProvider } from '@elizaos/plugin-ton';

const walletProvider = new TonConnectWalletProvider(runtime, state, callback, message);

// If the wallet is already connected, it will restore the session.
const default_connector = await walletProvider.setConnector(); // Using TonKeeper Wallet by default

// If universal link and bridge url are provided
const connector = await walletProvider.connect(universalLink: , bridgeUrl: );

```

## Parameters:

- `manifestUrl`: The URL of the TON Connect manifest, required to establish the connection (`TON_CONNECT_MANIFEST_URL`).

## 2. Disconnect from Wallet (DISCONNECT_TON_CONNECT)

The DISCONNECT_TON_CONNECT action is used to disconnect the currently active TON wallet connection.

### Description:

This action disconnects the wallet from the TON Connect protocol. It ensures the session is properly terminated, clears the session data from the cache, and notifies the user.

### Example:

```typescript
import { TonConnectWalletProvider } from '@elizaos/plugin-ton';

const walletProvider = new TonConnectWalletProvider(runtime, state, callback, message);
await walletProvider.disconnect(); // Disconnects the current wallet
```

### Parameters:

None. The action automatically works with the currently connected wallet.

## 3. Transfer Tokens (TRANSFER_TON)

The TRANSFER_TON action enables users to transfer tokens from one TON wallet to another.
### Description:

This action facilitates the transfer of TON tokens between wallets. It requires a valid recipient address and the amount of tokens to be transferred. The action also handles validation and processing of the transaction.
### Example:

```typescript
import { TransferAction } from '@elizaos/plugin-ton';

const action = new TransferAction(walletProvider);
const hash = await action.transfer({
    recipient: "EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4",
    amount: "1.5",
});
```

### Parameters:

- `recipient`: The recipient wallet address.
- `amount`: The amount of TON tokens to transfer.

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
```

## Dependencies

- `@ton/ton`: Core TON blockchain functionality
- `@ton/crypto`: Cryptographic operations
- `bignumber.js`: Precise number handling
- `node-cache`: Caching functionality
- Other standard dependencies listed in package.json

## API Reference

### Providers

- `walletProvider`: Manages TON wallet operations
- `nativeWalletProvider`: Handles native TON token operations

### Types

```typescript
interface TransferContent {
    recipient: string;
    amount: string | number;
}

interface WalletPortfolio {
    totalUsd: string;
    totalNativeToken: string;
}

interface Prices {
    nativeToken: { usd: string };
}
```

### Configuration Constants

```typescript
const PROVIDER_CONFIG = {
    MAINNET_RPC: "https://toncenter.com/api/v2/jsonRPC",
    STONFI_TON_USD_POOL: "EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4",
    CHAIN_NAME_IN_DEXSCREENER: "ton",
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    TON_DECIMAL: BigInt(1000000000),
};
```

## Common Issues/Troubleshooting

### Issue: Balance Fetching Failure

- **Cause**: Incorrect RPC endpoint or network connectivity issues
- **Solution**: Verify `TON_RPC_URL` and network connection

### Issue: Transfer Fails

- **Cause**: Insufficient balance or invalid recipient address
- **Solution**: Ensure sufficient funds and valid recipient address format

## Security Best Practices

- Store private keys securely using environment variables
- Validate all input addresses and amounts
- Use proper error handling for blockchain operations
- Keep dependencies updated for security patches

## Future Enhancements

1. **Wallet Management**

    - Multi-wallet support
    - Hardware wallet integration
    - Advanced key management
    - Batch transaction processing
    - Custom wallet contracts
    - Recovery mechanisms

2. **Smart Contract Integration**

    - Contract deployment tools
    - FunC contract templates
    - Testing framework
    - Upgrade management
    - Gas optimization
    - Security analysis

3. **Token Operations**

    - Jetton creation tools
    - NFT support enhancement
    - Token metadata handling
    - Collection management
    - Batch transfers
    - Token standards

4. **DeFi Features**

    - DEX integration
    - Liquidity management
    - Yield farming tools
    - Price feed integration
    - Swap optimization
    - Portfolio tracking

5. **Developer Tools**

    - Enhanced debugging
    - CLI improvements
    - Documentation generator
    - Integration templates
    - Performance monitoring
    - Testing utilities

6. **Network Features**
    - Workchain support
    - Sharding optimization
    - RPC management
    - Network monitoring
    - Archive node integration
    - Custom endpoints

We welcome community feedback and contributions to help prioritize these enhancements.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Credits

This plugin integrates with and builds upon several key technologies:

- [TON Blockchain](https://ton.org/): The Open Network blockchain platform
- [@ton/ton](https://www.npmjs.com/package/@ton/ton): Core TON blockchain functionality
- [@ton/crypto](https://www.npmjs.com/package/@ton/crypto): Cryptographic operations
- [bignumber.js](https://github.com/MikeMcl/bignumber.js/): Precise number handling
- [node-cache](https://github.com/node-cache/node-cache): Caching functionality

Special thanks to:

- The TON Foundation for developing and maintaining the TON blockchain
- The TON Developer community
- The TON SDK maintainers
- The Eliza community for their contributions and feedback

For more information about TON blockchain capabilities:

- [TON Documentation](https://docs.ton.org/)
- [TON Developer Portal](https://ton.org/dev)
- [TON Whitepaper](https://ton.org/whitepaper.pdf)
- [TON API Reference](https://ton.org/docs/#/api)

## License

This plugin is part of the Eliza project. See the main project repository for license information.
