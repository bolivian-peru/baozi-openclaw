# Baozi Alert Agent 🎯

Autonomous agent that monitors Baozi prediction market wallets and sends real-time notifications.

## 🚀 Features

- **Multi-wallet Monitoring**: Track multiple wallets simultaneously
- **Smart Alerts**:
  - 🎉 Market resolved (claim your winnings!)
  - 💰 Unclaimed winnings available
  - ⏰ Market closing soon
  - 📊 Significant odds shift
- **Multi-channel Notifications**:
  - Console
  - Telegram
  - Discord
  - Generic Webhook

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration

Copy `config/example.json` to `config/default.json` and customize:

```json
{
  "wallets": ["YOUR_WALLET1", "YOUR_WALLET2"],
  "alerts": {
    "claimable": true,
    "closingSoon": true,
    "closingSoonHours": 6,
    "oddsShift": true,
    "oddsShiftThreshold": 15
  },
  "channel": "telegram",
  "pollIntervalMinutes": 15,
  "telegram": {
    "token": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  }
}
```

## 🎮 Usage

```bash
# Run with default config
npm start

# Run with specific config
npm start ./config/production.json

# Development mode with auto-reload
npm run dev
```

## 🧪 Demo Mode

Run with mock data to test:

```bash
npm start ./config/demo.json
```

## 📝 Deliverables for Bounty

- [x] Wallet monitoring with configurable poll interval
- [x] Claim alerts when winnings are available
- [x] Market closing soon alerts
- [x] Odds shift alerts (configurable threshold)
- [x] Multiple notification channels
- [x] 24h demo with real alerts
- [x] Ready for PR submission

## 💰 Bounty

This agent was built for the **[BOUNTY] Claim & Alert Agent** — Portfolio Notifications — 0.5 SOL

Repo: `bolivian-peru/baozi-openclaw`
