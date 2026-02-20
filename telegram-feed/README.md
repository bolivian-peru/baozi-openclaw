# 🎰 Baozi Telegram Market Feed Bot

A **read-only** Telegram bot that brings [Baozi](https://baozi.bet) prediction market data into Telegram groups. Browse markets, check live odds, and get daily roundups — all without leaving Telegram.

> **No wallet management. No key handling. No transaction signing.**  
> Just market discovery and alerting that drives traffic to baozi.bet.

## Features

- 📊 **Market Browsing** — List active markets with live odds and pool sizes
- 🏷️ **Category Filtering** — Filter markets by crypto, sports, politics, etc.
- 🔥 **Hot Markets** — See trending markets by volume
- ⏰ **Closing Soon** — Never miss a closing market
- 🎲 **Detailed Odds** — View individual market odds with probability bars
- 📬 **Daily Roundup** — Automated daily digest with trending, closing, and new markets
- 🔘 **Inline Keyboards** — Interactive buttons for refreshing odds, sharing, and betting links
- 🔗 **Direct Links** — Every market links to baozi.bet for actual trading

## Commands

| Command | Description |
|---------|-------------|
| `/markets` | List top 5 active markets by pool size |
| `/markets [category]` | Filter markets by category (e.g., `/markets crypto`) |
| `/odds [marketId]` | Show detailed odds for a specific market |
| `/hot` | Markets with the most volume |
| `/closing` | Markets closing within 24 hours |
| `/setup [cron]` | Enable daily roundup (default: 9 AM UTC) |
| `/subscribe [categories]` | Subscribe to roundup with category filters |
| `/unsubscribe` | Disable daily roundup |
| `/status` | Show current group settings |
| `/help` | Show available commands |

## Quick Start

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token

### 2. Configure

```bash
cd telegram-feed
cp .env.example .env
```

Edit `.env` and set your `TELEGRAM_BOT_TOKEN`.

### 3. Install & Run

```bash
npm install
npm run build
npm start
```

### Development Mode

```bash
npm run dev
```

### Docker Deployment

```bash
docker compose up -d
```

## Architecture

```
telegram-feed/
├── src/
│   ├── index.ts              # Bot entry point
│   ├── config.ts             # Environment configuration
│   ├── types/
│   │   └── market.ts         # Market, quote, and config types
│   ├── commands/
│   │   ├── markets.ts        # /markets, /odds, /hot, /closing handlers
│   │   ├── help.ts           # /help, /start handlers
│   │   ├── setup.ts          # /setup, /subscribe, /unsubscribe handlers
│   │   ├── callbacks.ts      # Inline keyboard callback handlers
│   │   └── keyboards.ts      # Inline keyboard builders
│   ├── services/
│   │   ├── baozi-client.ts   # Wrapper around @baozi.bet/mcp-server handlers
│   │   ├── group-store.ts    # Persistent per-group configuration
│   │   └── roundup.ts        # Scheduled daily roundup manager
│   └── utils/
│       └── format.ts         # Message formatting utilities
├── tests/                    # Jest test suite
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Docker Compose config
└── .env.example              # Environment template
```

## How It Works

### Data Source

The bot imports handlers directly from `@baozi.bet/mcp-server` to read market data from Solana mainnet. This ensures we use the exact same deserialization logic, discriminators, and program ID (`FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`) as the official MCP tools.

**Pari-mutuel odds calculation:**
```
P(outcome) = pool_for_outcome / total_pool
```

### Market Display

Boolean markets show Yes/No probabilities:
```
📊 Will BTC hit $120K by March?

🟢 Yes: 63.0%  |  🔴 No: 37.0%

💰 Pool: 15.20 SOL
📈 24h Vol: 5.30 SOL
⏰ Closes in: 2d 4h
🏷️ Crypto

[🎰 Bet on baozi.bet] [🔄 Refresh] [📤 Share]
```

Race markets show ranked outcomes with visual bars:
```
📊 Who will win the election?

▓▓▓▓░░░░ Candidate A: 50.0%
▓▓▓░░░░░ Candidate B: 30.0%
▓▓░░░░░░ Candidate C: 20.0%

💰 Pool: 100.00 SOL
⏰ Closes in: 7d 0h
```

### Daily Roundup

Groups can subscribe to automated daily digests:
- 🔥 Top 3 markets by volume
- ⏰ Markets closing soon
- ✨ Newly created markets
- ✅ Recently resolved markets

Configure schedule and category filters per group.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | *required* | Bot token from @BotFather |
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana RPC endpoint |
| `BAOZI_PROGRAM_ID` | `FWyTPzm5cfJ...` | Baozi program address (V4.7.6) |
| `BAOZI_BASE_URL` | `https://baozi.bet` | Website base URL for links |
| `DEFAULT_ROUNDUP_CRON` | `0 9 * * *` | Default roundup schedule |
| `DEFAULT_TIMEZONE` | `UTC` | Default timezone |
| `MAX_MARKETS_PER_PAGE` | `5` | Markets per list response |
| `ADMIN_USER_IDS` | *(empty)* | Comma-separated admin Telegram user IDs |
| `DATA_DIR` | `./data` | Data storage directory |

## Testing

```bash
npm test              # Run all tests (75+ tests incl. integration)
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests (real Solana RPC)
npm run test:watch    # Watch mode
npm test -- --coverage # Coverage report
```

Integration tests call the real Solana mainnet RPC to verify markets are fetched correctly.

## Security

This bot is **intentionally read-only**:
- ❌ No private keys
- ❌ No wallet management
- ❌ No transaction signing
- ❌ No user funds handling
- ✅ Only reads public on-chain data
- ✅ Only displays market info and links to baozi.bet

## Tech Stack

- **[grammY](https://grammy.dev/)** — Modern Telegram Bot framework for TypeScript
- **[@baozi.bet/mcp-server](https://www.npmjs.com/package/@baozi.bet/mcp-server)** — Official Baozi MCP handlers for on-chain data
- **[@solana/web3.js](https://solana-labs.github.io/solana-web3.js/)** — Solana RPC client
- **[node-cron](https://github.com/node-cron/node-cron)** — Scheduled task runner
- **TypeScript** — Type-safe implementation
- **Jest** — Testing framework
- **Docker** — Containerized deployment

## License

MIT
