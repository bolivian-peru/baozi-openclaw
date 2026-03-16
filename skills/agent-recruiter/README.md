# Agent Recruiter

> The viral loop that never stops — agents recruiting agents.

AI Agent that recruits other AI agents to Baozi prediction markets and earns 1% lifetime affiliate commission.

## What It Does

1. **Discovers** other AI agents (via AgentBook, ElizaOS, LangChain, Solana Agent Kit)
2. **Explains** Baozi prediction markets to them
3. **Walks them through** setup (CreatorProfile, affiliate code, first bet)
4. **Earn 1% lifetime** affiliate commission on everything the recruited agent does

## Why This Matters

Every other bounty builds a TOOL. This bounty builds a **DISTRIBUTION CHANNEL**.

The affiliate system makes this self-sustaining: the recruiter earns 1% of everything, so it's incentivized to keep recruiting forever.

```
Agent Recruiter (has affiliate code "RECRUITER")
 │
 ├─→ Discovers Agent B
 │   → Sends outreach + affiliate link
 │   → Agent B registers with ref=RECRUITER
 │   → Agent B places first bet
 │   → Recruiter earns 1% of Agent B's lifetime winnings
 │
 └─→ Portfolio: 50 agents × 10 SOL/week = 5 SOL/week passive income
```

## Quick Start

### Installation

```bash
# Clone the repo
cd baozi-openclaw/skills/agent-recruiter

# Install dependencies
bun install
```

### Configuration

Set environment variables:

```bash
# Required
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
export SOLANA_PRIVATE_KEY="[your-base58-private-key]"

# Optional
export RECRUITER_AFFILIATE_CODE="RECRUITER"  # Your affiliate code
export DRY_RUN="true"  # Simulate without real transactions
```

### Commands

```bash
# Discover agents from various sources
bun run start discover

# Onboard discovered agents
bun run start onboard

# Track recruited agents and earnings
bun run start track

# Full recruitment loop
bun run start
```

## Agent Discovery Sources

| Source | Type | Status |
|--------|------|--------|
| AgentBook | Directory | ✅ |
| ElizaOS | Framework | ✅ |
| LangChain | Framework | ✅ |
| Solana Agent Kit | Framework | ✅ |
| Twitter/X | Social | 🔜 |

## Outreach Templates

### Crypto Analysis Agents
> "Monetize your predictions"

### Trading Bots
> "Add prediction markets to your strategy"

### Social Agents
> "Create markets, earn creator fees"

### General Purpose
> "69 tools, no API keys, earn while you predict"

## Onboarding Flow

1. **Send Initial Pitch** - Personalized outreach based on agent type
2. **Install MCP** - `npx @baozi.bet/mcp-server`
3. **Create Profile** - On-chain identity via `build_create_creator_profile_transaction`
4. **Register Affiliate** - Get their own affiliate code
5. **Browse Markets** - `list_markets` to see what's live
6. **Get Quote** - `get_quote` to check odds
7. **Place Bet** - `build_bet_transaction` for first bet
8. **Confirm** - Verify affiliate link to recruiter

## Tracking Dashboard

```
============================================================
📊 AGENT RECRUITER - TRACKING DASHBOARD
============================================================

🎯 Recruiter Code: RECRUITER

📈 Statistics:
   Total Recruited: 5
   Active Agents:   3
   Total Volume:   15.50 SOL
   Total Earnings: 0.1550 SOL

👥 Recruited Agents:
------------------------------------------------------------
   ✅ CryptoOracle (LangChain)
      First Bet: 0.50 SOL | Volume: 5.00 SOL | Earnings: 0.05 SOL
   
   ✅ SportsBot (ElizaOS)
      First Bet: 0.25 SOL | Volume: 2.50 SOL | Earnings: 0.025 SOL
   
   ✅ DeFiStrategy (Solana Agent Kit)
      First Bet: 0.80 SOL | Volume: 8.00 SOL | Earnings: 0.08 SOL
```

## Demo

```bash
# Run full demo
bun run start

# Output:
# 🌟 AGENT RECRUITER - AI That Onboards Other Agents 🌟
# 
# 🔍 AGENT DISCOVERY MODE
# 
# Scanning for AI agents...
# 
# 📡 Checking AgentBook...
#    Found 4 agents
# 📡 Checking ElizaOS...
#    Found 2 agents
# ...
# 
# 🎯 New agents to recruit:
#    - CryptoOracle (LangChain)
#    - SportsBettingBot (ElizaOS)
# ...
# 
# 🤝 ONBOARDING MODE
# 
# 📤 Processing: CryptoOracle
#    Subject: Monetize your predictions 💰
#    Sending outreach...
#    ✅ First bet placed: 0.50 SOL
#    🎉 CryptoOracle successfully onboarded!
# 
# 📊 TRACKING DASHBOARD
# 
# 💰 Projected Earnings:
#    Weekly:  0.15 SOL
#    Monthly: 0.60 SOL
#    Yearly:  7.80 SOL
```

## Architecture

```
src/
├── index.ts      # Main entry point, CLI commands
├── config.ts     # Configuration, outreach templates
├── discover.ts   # Agent discovery from various sources
├── onboard.ts    # Onboarding flow and messages
└── track.ts      # Tracking dashboard and data
```

## Baozi MCP Tools Used

- `build_create_creator_profile_transaction` - Create on-chain identity
- `build_register_affiliate_transaction` - Register affiliate code
- `check_affiliate_code` - Verify affiliate codes
- `format_affiliate_link` - Generate referral links
- `build_bet_transaction` - Place bets
- `list_markets` - Browse markets

## Program Info

- **Program ID:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`
- **Affiliate Commission:** 1% lifetime on recruited agent's gross winnings
- **Creator Fee:** 2% on markets you create
- **MCP Server:** `npx @baozi.bet/mcp-server`
- **Docs:** https://baozi.bet/skill

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| SOLANA_RPC_URL | Yes | mainnet-beta | Solana RPC endpoint |
| SOLANA_PRIVATE_KEY | No | - | Private key for transactions |
| RECRUITER_AFFILIATE_CODE | No | RECRUITER | Your affiliate code |
| DRY_RUN | No | false | Simulate without transactions |

## Future Enhancements

- [ ] Real Twitter/X API integration for agent discovery
- [ ] Telegram/Discord bot for automated outreach
- [ ] Integration with ElizaOS message protocol
- [ ] Real-time webhook for tracking recruited agent activity
- [ ] Multi-level recruitment (recruiters recruiting recruiters)

---

一笼包子，一桌人情 — one basket of buns, a whole table of affection.
