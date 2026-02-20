# Market Factory — Autonomous Market Creation (Bounty #3)

Auto-creates prediction markets on Baozi from trending news and curated event detection. **Parimutuel Rules v7.0 compliant.**

## Architecture

```
RSS Feeds / CoinGecko / Curated Events
        │
        ▼
  News Detector (pattern matching + AI)
        │
        ▼
  Duplicate Checker (vs live Baozi markets)
        │
        ▼
  Pari-Mutuel v6.3 Timing Validator   ← rejects non-compliant markets
        │
        ▼
  MCP Client (npx @baozi.bet/mcp-server)
    ├── validate_market_question
    └── build_create_lab_market_transaction
        │
        ▼
  Local signing → Solana submit (with exponential-backoff retry)
        │
        ▼
  SQLite Tracker (markets.db)
```

## Parimutuel Rules v7.0

Full rules: https://baozi.bet/agents/parimutuel-rules

### What's BANNED
- **ALL price prediction markets** (crypto, stocks, commodities, NFTs)
- **ALL measurement-period markets** (no "during this week/month" markets)
- Any market where the outcome can be observed while betting is open

### What's ALLOWED
- **Event-based (Type A) markets ONLY** — outcome must be unknowable until the event
- Betting must close **24h+ before** the event
- Must use an **approved resolution source**

### The One-Line Test
> "Can a bettor observe or calculate the likely outcome while betting is still open?" → If YES, market is **BLOCKED**.

### Good Examples
- "Will OpenAI announce GPT-5 by 2026-04-01?" ✅
- "Will Congress pass the AI Safety Act this session?" ✅
- "Who will win the BAFTA for Best Film?" ✅
- "Will @elonmusk tweet about Dogecoin by March 15?" ✅

### Bad Examples (BANNED)
- "Will BTC be above $100k on March 15?" ❌ (price = observable)
- "Will SOL reach $300 by Q2?" ❌ (price prediction)
- "What will weekly trading volume average?" ❌ (measurement-period)

### Enforcement

Validation is enforced in three layers:
1. **`checkV7Compliance()`** — regex-based filter for banned market types
2. **`classifyAndValidateTiming()`** — validates Type A 24h buffer rule
3. **MCP `validate_market_question`** — server-side validation before chain submission

The **golden rule** is enforced: _"Bettors must NEVER have information advantage while betting is open."_

## MCP Integration

Uses `@baozi.bet/mcp-server` (v4.0.11, 69 tools) via stdio JSON-RPC:

```
npx @baozi.bet/mcp-server
```

Key tools used:
- `validate_market_question` — server-side question validation
- `build_create_lab_market_transaction` — builds unsigned tx for Lab market creation
- `get_parimutuel_rules` — fetches current rule set
- `get_timing_rules` — fetches timing constraints

## Error Handling

### On-chain transaction failures

The `sendWithRetry()` function implements exponential-backoff retry:

| Attempt | Delay | Total elapsed |
|---------|-------|---------------|
| 1       | 0s    | 0s            |
| 2       | 2s    | 2s            |
| 3       | 4s    | 6s            |

**Retried** (transient): RPC timeouts, network errors, rate limits
**NOT retried** (deterministic): `custom program error`, `InstructionError`, `insufficient funds`

### MCP failures

- `build_create_lab_market_transaction` error → market skipped with error logged
- MCP server crash → auto-restart on next cycle (lazy init)
- Question validation failure → market rejected before chain submission

## RPC Configuration

| Provider | URL | Notes |
|----------|-----|-------|
| **Solana public** (default) | `https://api.mainnet-beta.solana.com` | Free, rate-limited (100 req/10s) |
| **Helius** (recommended) | `https://mainnet.helius-rpc.com/?api-key=KEY` | Free tier: 100k credits/day |
| **QuickNode** | Custom URL | Free tier available |

Set via `SOLANA_RPC_URL` in `.env`. Public RPC works for low-volume operation (5 markets/day max), but a dedicated RPC is recommended for production.

**Tested with:** Solana public RPC (`api.mainnet-beta.solana.com`) — sufficient for the conservative 5 markets/day limit with 5s delay between creations.

## Running

```bash
cd skills/market-factory
cp .env.example .env   # fill in PRIVATE_KEY and OPENAI_API_KEY
npm install
npm run build
npm start
```

### SystemD service (for autonomous operation)

```ini
[Unit]
Description=Baozi Market Factory
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/skills/market-factory
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=30
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Environment Variables

```env
BAOZI_API_URL=https://baozi.bet/api          # Baozi REST API
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com  # Solana RPC (or Helius/QuickNode)
WALLET_ADDRESS=FyzVsqsBnUoDVchFU4y5tS7ptvi5onfuFcm9iSC1ChMz
PRIVATE_KEY=                                  # Base58-encoded Solana private key
OPENAI_API_KEY=                               # For AI-powered market generation
DB_PATH=./data/markets.db                     # SQLite tracker
```

## Schedule

| Interval | Task |
|----------|------|
| 30 min   | Scan RSS feeds + crypto prices for new proposals |
| 1 hour   | Check existing markets for resolution |
| 6 hours  | Generate curated markets + print summary |
| 24 hours | Reset daily counter + full summary |

## Program

- **Baozi Program:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`
- **MCP Server:** `npx @baozi.bet/mcp-server` (v4.0.11)
- **Market Layer:** Lab (permissionless creation, no whitelist required)
