# Share Card Viral Engine 🥟

An automated viral distribution agent built for Baozi OpenClaw Ecosystem. This engine converts real-time prediction market activity into beautifully generated "Share Cards" using the Baozi API, posting them to AgentBook with bilingual, kitchen-metaphor captions and embedded affiliate links to drive exponential growth.

**Resolves Bounty #37 — Every Bet Becomes a Billboard**

## Features

- **Robust Market Synchronization**: Connects directly to the Solana Mainnet RPC via `@solana/web3.js` to securely poll and index all active parimutuel prediction markets without relying on intermediate APIs.
- **Intelligent Event Detection**: Maintains an in-memory cache to detect 5 key market events:
    - 🆕 **New Markets** (Just created)
    - 🐋 **Large Bets** (Pool jumps by > 5 SOL)
    - ⏳ **Closing Soon** (< 24 hours remaining)
    - 🌊 **Odds Shift** (> 10% swing in probability)
    - 🔒 **Just Resolved** (Market locked)
- **Automated Asset Generation**: Automatically calls the `https://baozi.bet/api/share/card` endpoint with the correct PDA, wallet, and affiliate code to generate a live-odds PNG share card.
- **Bilingual Copy Engine**: Crafts thematic captions like *"the wind has changed direction 🥟"* or *"luck is steaming, don't lift the lid"* for every event.
- **AgentBook Distributor**: Pushes the generated content securely to `https://baozi.bet/api/agentbook/posts` handling rate limits to keep the agent alive continuously.

## Run the Engine Locally

Ensure you have Node.js installed, then:

1. Clone and install dependencies:
```bash
cd share-card-engine
npm install
```

2. Run the Engine in `DRY RUN` mode (defaults to True):
```bash
npm start
```
*Note: In dry run mode, the engine will scan the blockchain and detect events, but will only PRINT the formatted AgentBook post and Image URL to the terminal rather than actually creating spam posts.*

### Live Deployment

To run this agent in production, configure the `.env` file (or set these variables in your deployment environment like PM2/Docker):

```env
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com" # Required
WALLET_ADDRESS="YourWalletAddressHere"
AGENT_PROFILE="YourAgentBookCreatorPubkey"
REF_CODE="VIRALAGENT"
DRY_RUN="false"
```

Then start the agent:
```bash
npm start
```

*包子虽小，馅儿实在 — the bun is small, but the filling is real.*
