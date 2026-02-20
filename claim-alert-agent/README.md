# Baozi Claim & Alert Agent

**Portfolio notification agent for [Baozi](https://baozi.bet) prediction markets on Solana.**

Monitors your wallets and sends alerts when action is needed — claim winnings, react to odds shifts, catch markets before they close.

## Why This Exists

Users bet and forget. Winnings sit unclaimed, markets close unnoticed, odds shift without anyone watching. This agent runs in the background and pings you when something needs attention.

## Alert Types

| Alert | Trigger | Example |
|-------|---------|---------|
| 🏁 Market Resolved | A market you bet on resolved | "Market 'BTC above 120K' resolved YES. You bet YES. Claim 2.5 SOL" |
| 💰 Unclaimed Winnings | SOL ready to claim | "You have 3.7 SOL unclaimed across 2 markets" |
| ⏰ Closing Soon | Market closes within N hours | "Market 'Grammy AOTY' closes in 6 hours. Your position: 0.5 SOL on Artist A (42%)" |
| 📈 Odds Shift | Probability moved ≥ N percentage points | "Odds on 'Fed rate cut' shifted from 45% to 62% Yes. You hold 1 SOL on No" |
| 🆕 New Market | New market matches your keywords | "New market matching your interests: 'BTC above 200K by 2027'" |

## Quick Start

### 1. Install

```bash
cd claim-alert-agent
npm install
npm run build
```

### 2. Configure

```bash
# Generate a sample config
npx claim-alert init

# Or copy the example
cp examples/config.example.json config.json
```

Edit `config.json` with your wallet address and notification channel:

```json
{
  "wallets": ["YOUR_SOLANA_WALLET_ADDRESS"],
  "alerts": {
    "claimable": true,
    "closingSoon": true,
    "closingSoonHours": 6,
    "oddsShift": true,
    "oddsShiftThreshold": 15,
    "newMarkets": true,
    "interestKeywords": ["BTC", "ETH", "SOL"]
  },
  "channels": [
    {
      "type": "webhook",
      "url": "https://your-webhook-url/alerts"
    }
  ],
  "pollIntervalMinutes": 15
}
```

### 3. Run

```bash
# Start monitoring
npm start

# Or with dev mode (auto-reload)
npm run dev

# Single check (dry run)
npx claim-alert check
```

## Notification Channels

The agent supports three notification channels. Configure one or more in the `channels` array.

### Webhook (Generic)

Sends JSON POST requests to any URL. Works with Discord webhooks, Slack incoming webhooks, Zapier, IFTTT, n8n, or any custom endpoint.

```json
{
  "type": "webhook",
  "url": "https://your-endpoint.com/alerts",
  "headers": {
    "Authorization": "Bearer your-token"
  }
}
```

**Webhook payload:**

```json
{
  "type": "unclaimed_winnings",
  "message": "You have 3.50 SOL unclaimed across 2 markets. Claim at baozi.bet/my-bets",
  "timestamp": "2024-01-15T12:00:00Z",
  "wallet": "YOUR_WALLET",
  "data": { /* full alert object */ }
}
```

### Telegram

Sends formatted messages via Telegram Bot API.

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get your chat ID via [@userinfobot](https://t.me/userinfobot)
3. Configure:

```json
{
  "type": "telegram",
  "botToken": "123456:ABC-DEF...",
  "chatId": "your-chat-id"
}
```

### Email

Sends styled HTML emails via SMTP. Supports digest mode for multiple alerts.

```json
{
  "type": "email",
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-email@gmail.com",
      "pass": "your-app-password"
    }
  },
  "from": "Baozi Alerts <your-email@gmail.com>",
  "to": "you@example.com"
}
```

## Configuration Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `wallets` | `string[]` | `[]` | Solana wallet addresses to monitor |
| `alerts.claimable` | `boolean` | `true` | Alert on claimable winnings |
| `alerts.closingSoon` | `boolean` | `true` | Alert when markets close soon |
| `alerts.closingSoonHours` | `number` | `6` | Hours before close to trigger |
| `alerts.oddsShift` | `boolean` | `true` | Alert on odds shifts |
| `alerts.oddsShiftThreshold` | `number` | `15` | Min percentage point shift |
| `alerts.newMarkets` | `boolean` | `false` | Alert on new matching markets |
| `alerts.interestKeywords` | `string[]` | `[]` | Keywords for new market matching |
| `channels` | `Channel[]` | `[]` | Notification channels |
| `pollIntervalMinutes` | `number` | `15` | How often to check (minutes) |
| `solanaRpcUrl` | `string` | mainnet | Solana RPC endpoint |

## CLI Commands

```bash
# Start monitoring loop
claim-alert monitor [options]
  -c, --config <path>      Config file (default: ./config.json)
  -s, --state <path>       State file (default: ./data/state.json)
  --dry-run                Detect but don't send
  --once                   Single cycle then exit
  --interval <minutes>     Override poll interval

# Single check
claim-alert check [options]
  -c, --config <path>      Config file

# Generate sample config
claim-alert init [options]
  -o, --output <path>      Output path (default: ./config.json)
```

## Docker

```bash
# Build and run
docker compose up -d

# View logs
docker compose logs -f

# Run single check
docker compose run --rm claim-alert-agent check
```

Mount your `config.json` and set `SOLANA_RPC_URL`:

```bash
SOLANA_RPC_URL=https://your-rpc.com docker compose up -d
```

## Architecture

```
claim-alert-agent/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── index.ts                  # Public API exports
│   ├── types/
│   │   ├── config.ts             # Configuration types
│   │   ├── market.ts             # Market & position types
│   │   └── alert.ts              # Alert types
│   ├── services/
│   │   ├── baozi-client.ts       # Baozi MCP data provider
│   │   ├── alert-detector.ts     # Core detection logic
│   │   ├── state-store.ts        # Persistent state (dedup, odds history)
│   │   ├── monitor.ts            # Main polling loop
│   │   └── notifiers/
│   │       ├── base.ts           # Notifier interface
│   │       ├── webhook.ts        # Webhook channel
│   │       ├── telegram.ts       # Telegram bot channel
│   │       └── email.ts          # Email (SMTP) channel
│   └── tests/
│       ├── run.ts                # Test runner
│       ├── mock-provider.ts      # Mock Baozi data provider
│       ├── alert-detector.test.ts
│       ├── state-store.test.ts
│       ├── notifiers.test.ts
│       ├── monitor.test.ts
│       └── config.test.ts
├── examples/
│   └── config.example.json
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

### How It Works

1. **Poll cycle** starts every N minutes
2. **BaoziClient** fetches positions, claimable winnings, and market data via MCP scripts
3. **AlertDetector** compares current data against state to find triggers
4. **StateStore** tracks previous odds (for shift detection) and sent alerts (for dedup)
5. **Notifiers** deliver alerts to configured channels
6. State is saved to disk between cycles

### Deduplication

Each alert gets a unique key based on type + market + wallet. Once sent, the same alert won't fire again until the key expires (7 days) or state is reset. Odds shift alerts include the current probability in the key, so further shifts will re-trigger.

## Testing

```bash
# Run all tests
npm test

# Expected: 30 tests, all passing
```

Tests cover:
- Alert detection (claimable, resolved, closing soon, odds shift, new markets)
- State persistence and pruning
- Notification formatting (Telegram HTML, email HTML)
- Deduplication logic
- Configuration defaults and overrides
- Monitor integration

## Development

```bash
# Type check
npm run lint

# Build
npm run build

# Dev mode with auto-reload
npm run dev
```

## Integration with Baozi MCP

This agent uses the existing Baozi MCP scripts in the parent repo:
- `scripts/get-portfolio` — Fetch wallet positions
- `scripts/get-odds` — Fetch market data and probabilities
- `scripts/list-markets` — List active markets
- `scripts/claim-winnings` — Check claimable winnings

The `BaoziDataProvider` interface is abstracted, so you can swap in a direct Solana RPC implementation or mock for testing.

## License

MIT
