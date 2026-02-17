# 🥟 Baozi Discord Market Bot

A Discord bot with slash commands and rich embeds that brings [Baozi](https://baozi.bet) prediction market data into Discord servers. Browse markets, see odds, track portfolios — all without leaving Discord.

**Read-only.** No wallet management, no transaction signing. Pure discovery and engagement.

## Features

| Command | Description |
|---------|-------------|
| `/markets [category]` | Browse active markets (optional keyword filter: crypto, sports, etc.) |
| `/odds <marketId>` | Detailed odds embed with progress bars and expected payouts |
| `/portfolio <wallet>` | View betting positions for any Solana wallet |
| `/hot` | Highest volume markets ranked by pool size |
| `/closing` | Markets closing within 24 hours |
| `/race <marketId>` | Race (multi-outcome) market with all outcome odds |
| `/setup #channel HH:MM` | Configure daily automated market roundup |

## Rich Embeds

```
┌─────────────────────────────────────┐
│ 📊 Will BTC hit $120K by March?     │
│                                     │
│ Yes  ████████████░░░  63.2%         │
│ No   ████████░░░░░░░  36.8%         │
│                                     │
│ Pool: 15.2 SOL                      │
│ Closes: Feb 28, 2026 00:00 UTC      │
│ 🧪 Lab | 🟢 Active                  │
└─────────────────────────────────────┘
```

## Setup

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → name it (e.g., "Baozi Markets")
3. Go to **Bot** tab → Click **Reset Token** → Copy the token
4. Go to **OAuth2** → Copy the **Application ID**
5. Under **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
6. Copy the generated URL and open it to invite the bot to your server

### 2. Configure Environment

```bash
cd discord-bot
cp .env.example .env
```

Edit `.env`:
```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

> **Note:** Use a dedicated Solana RPC provider (Helius, QuickNode, etc.). Public RPC will be rate-limited.

### 3. Install & Register Commands

```bash
npm install
npm run register    # Register slash commands with Discord
```

### 4. Run the Bot

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

## Daily Roundup

Use `/setup #channel 09:00` to configure automatic daily posts:
- **Top 5 markets** by pool size
- **Markets closing soon** (within 24h)
- **Recently resolved** markets with results
- **Race market** highlights

Time is in **UTC**. Requires **Manage Server** permission.

## Architecture

```
discord-bot/
├── src/
│   ├── index.ts              # Main entry — Discord client + event routing
│   ├── register-commands.ts  # Slash command registration script
│   ├── mcp/
│   │   └── client.ts         # MCP client wrapper → @baozi.bet/mcp-server
│   ├── commands/
│   │   ├── markets.ts        # /markets [category]
│   │   ├── odds.ts           # /odds <marketId>
│   │   ├── portfolio.ts      # /portfolio <wallet>
│   │   ├── hot.ts            # /hot
│   │   ├── closing.ts        # /closing
│   │   ├── race.ts           # /race <marketId>
│   │   └── setup.ts          # /setup #channel HH:MM
│   ├── embeds/
│   │   ├── helpers.ts        # Progress bars, formatters, colors
│   │   ├── market.ts         # Boolean market embeds
│   │   ├── race.ts           # Race market embeds
│   │   └── portfolio.ts      # Portfolio embeds
│   └── roundup/
│       └── scheduler.ts      # Cron-based daily roundup
├── data/                     # Guild configs (auto-created)
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Data Source

All data comes from the **Baozi MCP server** (`@baozi.bet/mcp-server`) which reads directly from **Solana mainnet**. The bot spawns the MCP server as a child process and calls its tools via the MCP protocol:

- `list_markets` — Browse active boolean markets
- `get_market` — Get market details by public key
- `get_quote` — Calculate expected payouts
- `list_race_markets` — Multi-outcome markets
- `get_race_market` — Race market with all outcomes
- `get_positions` — Wallet positions

No authentication needed for reads. All data is real mainnet data.

## Deployment (24/7)

### Using PM2

```bash
npm run build
npm install -g pm2
pm2 start dist/index.js --name baozi-bot
pm2 save
pm2 startup    # Auto-restart on reboot
```

### Using Docker

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
COPY .env ./
CMD ["node", "dist/index.js"]
```

```bash
npm run build
docker build -t baozi-bot .
docker run -d --name baozi-bot --restart always baozi-bot
```

## License

MIT
