# eliza-plugin-baozi

> Bring Baozi prediction markets to every ElizaOS agent.

An [ElizaOS](https://elizaos.github.io/eliza/) plugin that gives any agent the ability to interact with [Baozi](https://baozi.bet) prediction markets on Solana — list markets, get quotes, place bets, track positions, and create new markets.

**Plugin bounty submission for [Baozi bounty #44](https://github.com/bolivian-peru/baozi-openclaw/issues/44).**

## Install

```bash
npm install eliza-plugin-baozi
# or
bun add eliza-plugin-baozi
```

**Prerequisites:**
- Node.js 18+ or Bun
- `npx @baozi.bet/mcp-server` must be accessible (installed globally or via npx)
- Access to Solana mainnet RPC (public endpoint works)

## Usage

```typescript
import { createAgent } from "@elizaos/core";
import { baoziPlugin } from "eliza-plugin-baozi";

const agent = await createAgent({
  plugins: [baoziPlugin],
  // ... other ElizaOS config
});

await agent.start();
```

**Environment variables:**
```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com  # or Helius/QuickNode
SOLANA_WALLET_ADDRESS=YourWalletPublicKey            # optional, for position tracking
BAOZI_AFFILIATE_CODE=YOURCODE                        # optional, earn commissions
```

## Actions

### `LIST_BAOZI_MARKETS`
Fetch active prediction markets.

**Triggers:** "show me prediction markets", "what can I bet on?", "browse baozi markets"

**Example:**
```
User: Show me active prediction markets on Baozi
Agent: Baozi Prediction Markets (Lab / Active)

Market #98: Will BTC exceed $100K by March 31?
YES odds: 38% | NO odds: 62% | Volume: 12.4 SOL
...
```

---

### `GET_BAOZI_QUOTE`
Preview expected payout, implied odds, and price impact before betting.

**Triggers:** "get quote for market X", "what are the odds?", "simulate my bet"

**Example:**
```
User: Get me a quote for betting 5 SOL YES on market ABC123XYZ...
Agent: Baozi Quote — Market: ABC123XY...

Expected payout: 8.5 SOL (5 SOL → 8.5 SOL)
Implied odds: 59% YES
Price impact: 0.3%
```

---

### `PLACE_BAOZI_BET`
Build an unsigned Solana transaction for a bet. The agent builds it; your wallet signs it.

**Triggers:** "bet 5 SOL yes on market X", "place a wager", "predict X will win"

**Example:**
```
User: Bet 2 SOL YES on market ABC123... from wallet MyWallet456...
Agent: Bet Transaction Built ✅
Side: Yes | Amount: 2 SOL
[base64 transaction — sign with your Solana wallet]
```

---

### `GET_BAOZI_POSITIONS`
Check a wallet's open bets, P&L, and claimable winnings.

**Triggers:** "show my positions", "check my portfolio", "my open bets"

**Example:**
```
User: Show positions for wallet GpXHXs5K...
Agent: Baozi Portfolio — GpXHXs5K...

2 open positions
Market #42 YES: 3 SOL staked → potential 5.1 SOL payout
Market #51 NO: 1 SOL staked → potential 2.8 SOL payout
```

---

### `CREATE_BAOZI_MARKET`
Build an unsigned transaction to create a new Lab prediction market.

**Triggers:** "create market: Will X happen?", "make a new prediction", "start a market"

**Timing rules (v6.3):** `closing_time` must be ≥12 hours before `event_time`. Type A only.

**Example:**
```
User: Create market: 'Will ETH reach $5K?' closing 2026-03-31T23:59:00Z event 2026-04-01T00:00:00Z wallet GpXHXs5K...
Agent: Market Transaction Built ✅
Question: Will ETH reach $5K?
Category: crypto | Buffer: 12.0h ✓
[base64 transaction — sign with your Solana wallet]
```

---

### `CLAIM_BAOZI_WINNINGS`
Build an unsigned transaction to claim winnings from resolved markets.

**Triggers:** "claim my winnings", "collect rewards", "cash out baozi"

**Example:**
```
User: Claim my winnings for wallet GpXHXs5K...
Agent: Claim Transaction Built 🎉
Claimable: 5.2 SOL from Market #42
[base64 transaction — sign with your Solana wallet]
```

## Providers

The plugin also injects two context providers that give your agent background knowledge:

- **`marketDataProvider`** — Injects the top active Lab markets into agent state (cached 5 min). Your agent will "know" about current markets without explicitly asking.
- **`portfolioProvider`** — Injects your wallet's positions if `SOLANA_WALLET_ADDRESS` is set (cached 2 min).

## Technical Architecture

```
┌─────────────────────────────────────────┐
│              ElizaOS Agent              │
│  ┌─────────────────────────────────┐   │
│  │      eliza-plugin-baozi         │   │
│  │                                 │   │
│  │  Actions:          Providers:   │   │
│  │  ├─ listMarkets    ├─ markets   │   │
│  │  ├─ getQuote       └─ portfolio │   │
│  │  ├─ placeBet                    │   │
│  │  ├─ getPositions                │   │
│  │  ├─ createMarket                │   │
│  │  └─ claimWinnings               │   │
│  │           │                     │   │
│  │    BaoziMCPClient (singleton)   │   │
│  └───────────┼─────────────────────┘   │
└─────────────┼─────────────────────────-┘
              │ stdio JSON-RPC
              ▼
  @baozi.bet/mcp-server (child process)
              │
              ▼
   Solana Mainnet / Baozi Program
   FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ
```

The plugin manages a single `@baozi.bet/mcp-server` child process (lazy-initialized on first use) and communicates via JSON-RPC over stdio. This follows the MCP spec and uses the official Baozi toolset without requiring any API keys.

**Security model:**
- No private keys ever handled by the plugin
- All transactions are unsigned — signing is the user's responsibility
- Affiliate codes are optional and only used for earning commissions

## Demo

Run the demo to see the plugin in action with live mainnet data:

```bash
# Clone the repo
git clone https://github.com/TheAuroraAI/eliza-plugin-baozi
cd eliza-plugin-baozi

# Install deps
npm install  # or: bun install

# Run demo (connects to Baozi mainnet)
bun run example/agent.ts
```

**Expected output:**
```
=== Baozi ElizaOS Plugin Demo ===
Connecting to Baozi MCP server...
Connected!

1. Listing active Lab markets...
[live market data from mainnet]

2. Getting market creation fees...
[fee structure]

3. Getting timing rules...
[v6.3 rules]

4. Validating sample market question...
[validation result for "Will Solana exceed $200 by April 15?"]
```

## Bounty Context

This plugin was built for [Baozi Bounty #44](https://github.com/bolivian-peru/baozi-openclaw/issues/44): **Framework Plugin — Bring Baozi to ElizaOS, LangChain & Solana Agent Kit**.

The goal: give the thousands of ElizaOS agents already running in the wild instant access to Solana prediction markets. One plugin = every Web3 AI agent can bet on Baozi with zero friction.

Wallet: `6eUdVwsPArTxwVqEARYGCh4S2qwW2zCs7jSEDRpxydnv`

## License

MIT
