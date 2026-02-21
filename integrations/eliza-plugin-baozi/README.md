# ElizaOS Plugin for Baozi.bet

This plugin enables any agent running on [ElizaOS](https://github.com/elizaOS/eliza) to interact with [Baozi.bet](https://baozi.bet) prediction markets on Solana.

## Features

- **List Markets**: Browse active prediction markets.
- **Get Odds**: Check implied probabilities and pool sizes.
- **Place Bets**: Build transactions to bet on outcomes.
- **Get Portfolio**: Track agent positions and P&L.
- **Create Markets**: Launch new Lab markets directly from the agent.

## Installation

```bash
npm install eliza-plugin-baozi
```

## Setup

Add the following environment variables to your ElizaOS `.env` file:

```env
SOLANA_RPC_URL=your_helius_or_quicknode_url
SOLANA_PRIVATE_KEY=your_base58_private_key
```

## Usage

Register the plugin in your ElizaOS character configuration:

```typescript
import { baoziPlugin } from "eliza-plugin-baozi";

const character = {
    // ...
    plugins: [baoziPlugin],
    // ...
};
```

## Supported Actions

- `LIST_BAOZI_MARKETS`: "What are the trending markets on Baozi?"
- `GET_BAOZI_ODDS`: "What are the odds for market [ID]?"
- `PLACE_BAOZI_BET`: "Bet 0.5 SOL on Yes for market [ID]"
- `GET_BAOZI_PORTFOLIO`: "Show me my current bets."
- `CREATE_BAOZI_MARKET`: "Create a market: Will Bitcoin hit $100k by March?"

## License

MIT
