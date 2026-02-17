# Baozi Claim Alert Agent

## Description
A specialized agent that monitors Baozi prediction markets on Solana for claimable winnings, significant odds shifts, and market resolutions. It uses raw Solana RPC calls to decode program data without requiring an IDL.

## Capabilities
- **Position Monitoring**: Fetches all user positions for a given wallet address.
- **Claim Detection**: Identifies resolved markets where the user has winning positions or refund entitlements.
- **Odds Tracking**: Monitors market probability changes and alerts on significant shifts.
- **Market Resolution**: Detects when markets resolve and alerts users.
- **Closing Alerts**: Warns users when markets are about to close betting.

## Configuration
The agent is configured via environment variables:
- `WALLET_ADDRESSES`: Comma-separated list of Solana wallet addresses to monitor.
- `POLL_INTERVAL_MINUTES`: Frequency of checks (default: 15).
- `WINNINGS_THRESHOLD`: Minimum SOL amount to trigger a claim alert.
- `ODDS_SHIFT_THRESHOLD`: Percentage change in odds to trigger an alert.
- `SOLANA_RPC_URL`: RPC endpoint for Solana Mainnet.

## Technical Details
- **Protocol**: Baozi Prediction Markets (V4.7.6)
- **Method**: Raw `getProgramAccounts` with `memcmp` filters and manual buffer decoding.
- **Dependencies**: `@solana/web3.js`, `bs58` (No Anchor required).

## Usage
Run the agent as a standalone service or integrate the `BaoziClient` class into other applications.

```typescript
import { BaoziClient } from './baozi';

const client = new BaoziClient('https://api.mainnet-beta.solana.com');
const claimable = await client.getClaimable('wallet_address');
console.log('Claimable winnings:', claimable);
```
