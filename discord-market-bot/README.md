# 🥟 Baozi Discord Market Bot

A Discord bot with slash commands and rich embeds that brings [Baozi prediction market](https://baozi.bet) data into Discord servers. Browse markets, see odds, track portfolios — all without leaving Discord.

**Read-only.** No wallet management, no transaction signing. Pure discovery and engagement with links to baozi.bet for actual betting.

## Features

| Command | Description |
|---------|-------------|
| `/markets [category]` | List active markets (optional: Official, Lab) |
| `/odds <market>` | Detailed odds embed for a specific market |
| `/portfolio <wallet>` | View positions for a Solana wallet |
| `/hot` | Highest volume markets (ranked by pool size) |
| `/closing` | Markets closing within 24 hours |
| `/race [market]` | Race market with all outcome odds |
| `/setup #channel HH:MM` | Configure daily roundup (Admin only) |

## Rich Embeds

### Boolean Market (`/odds`)
```
┌─────────────────────────────────────┐
│ 📊 Will BTC hit $120K by March?    │
│                                     │
│ Yes ████████████░░░ 63.2%          │
│ No  ████████░░░░░░░ 36.8%          │
│                                     │
│ Pool: 15.2 SOL                      │
│ Closes: Feb 28, 2026 00:00 UTC     │
│ Layer: Lab | Status: Active         │
│                                     │
│ [View on Baozi](https://baozi.bet) │
└─────────────────────────────────────┘
```

### Race Market (`/race`)
```
┌─────────────────────────────────────┐
│ 🏇 Who wins the Grammy AOTY?       │
│                                     │
│ Artist A ██████████░░ 42.1%        │
│ Artist B ████████░░░░ 31.5%        │
│ Artist C ████░░░░░░░░ 15.2%        │
│ Artist D ██░░░░░░░░░░ 11.2%        │
│                                     │
│ Pool: 8.4 SOL | 4 outcomes         │
│ Closes: Jan 31, 2026               │
└─────────────────────────────────────┘
```

## Architecture

```
discord-market-bot/
├── src/
│   ├── index.ts              # Bot entry point, event handlers
│   ├── deploy-commands.ts    # One-time command registration script
│   ├── scheduler.ts          # Daily roundup cron scheduler
│   ├── commands/
│   │   ├── index.ts          # Command registry
│   │   ├── markets.ts        # /markets — browse active markets
│   │   ├── odds.ts           # /odds — detailed market embed
│   │   ├── portfolio.ts      # /portfolio — wallet positions
│   │   ├── hot.ts            # /hot — highest volume markets
│   │   ├── closing.ts        # /closing — markets closing soon
│   │   ├── race.ts           # /race — multi-outcome markets
│   │   └── setup.ts          # /setup — configure daily roundup
│   ├── baozi/
│   │   ├── config.ts         # Program ID, discriminators, constants
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── markets.ts        # Boolean market decoder + fetcher
│   │   ├── race-markets.ts   # Race market decoder + fetcher
│   │   ├── positions.ts      # Position decoder + portfolio
│   │   └── index.ts          # Re-exports
│   └── embeds/
│       └── market-embed.ts   # Rich embed builders
├── Dockerfile                # Container deployment
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Data Layer

The bot reads directly from the Baozi on-chain program (`FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`) on Solana mainnet using `@solana/web3.js`. It decodes Market, RaceMarket, and UserPosition accounts using the V4.7.6 struct layouts — the same approach used by the [Baozi MCP server](https://github.com/bolivian-peru/baozi-mcp).

**No authentication needed for reads.** All market data is public on-chain.

### Daily Roundup

Server admins can configure a daily automated post using `/setup #channel 09:00`. The bot will post:
- 🔥 Top 5 markets by volume
- 🆕 Newest markets
- ✅ Recently resolved markets (with results)

Configs are persisted in `data/guild-configs.json`.

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → name it "Baozi Markets"
3. Go to **Bot** tab → click **Add Bot**
4. Copy the **Token** → save as `DISCORD_TOKEN`
5. Go to **General Information** → copy **Application ID** → save as `DISCORD_CLIENT_ID`
6. Enable these under Bot → **Privileged Gateway Intents**: (none needed — bot only uses slash commands)

### 2. Invite Bot to Server

Generate an invite URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot%20applications.commands
```

Permissions needed: `Send Messages` (2048)

### 3. Install & Run

```bash
# Clone and install
cd discord-market-bot
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DISCORD_TOKEN and DISCORD_CLIENT_ID

# Deploy slash commands (one-time)
npm run deploy-commands

# Start the bot
npm run dev      # Development (with hot reload)
npm run build    # Production build
npm start        # Production run
```

### 4. Deploy 24/7

#### Docker
```bash
docker build -t baozi-discord-bot .
docker run -d \
  --name baozi-bot \
  -e DISCORD_TOKEN=your_token \
  -e DISCORD_CLIENT_ID=your_client_id \
  -e HELIUS_RPC_URL=your_rpc_url \
  -v baozi-bot-data:/app/data \
  --restart unless-stopped \
  baozi-discord-bot
```

#### PM2
```bash
npm run build
pm2 start dist/index.js --name baozi-bot
pm2 save
```

#### Railway / Render / Fly.io
Set environment variables in the platform dashboard and deploy from GitHub.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | ✅ | Discord bot token |
| `DISCORD_CLIENT_ID` | ✅ | Discord application ID |
| `DISCORD_GUILD_ID` | ❌ | Test guild for instant command deploy |
| `HELIUS_RPC_URL` | ❌ | Helius RPC endpoint (recommended) |
| `SOLANA_RPC_URL` | ❌ | Alternative Solana RPC endpoint |

> **Note:** The public Solana RPC (`api.mainnet-beta.solana.com`) has rate limits. For production use, get a free API key from [Helius](https://helius.dev) or [QuickNode](https://quicknode.com).

## Technical Details

- **Runtime:** Node.js 18+
- **Framework:** discord.js v14
- **Data source:** Solana mainnet RPC (Baozi program V4.7.6)
- **Pricing model:** Pari-mutuel — `P(outcome) = pool_for_outcome / total_pool`
- **Program ID:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`
- **Scheduling:** node-cron for daily roundups
- **Persistence:** JSON file for guild configs

## License

MIT
