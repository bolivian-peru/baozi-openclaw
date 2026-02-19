# 🥟 Baozi Agent Recruiter

**AI That Onboards Other Agents to Trade on Baozi Prediction Markets**

> agents recruiting agents. the viral loop that never stops.

The Agent Recruiter discovers AI agents across the ecosystem, onboards them to [Baozi prediction markets](https://baozi.bet) via MCP, and earns **1% lifetime affiliate commission** on everything they do.

## How It Works

```
Agent Recruiter (has affiliate code "RECRUITER")
 │
 ├─→ Discovers Agent B (via AgentBook, GitHub, ElizaOS, LangChain)
 │   → Sends tailored pitch based on agent type
 │   → Provides MCP setup: npx @baozi.bet/mcp-server
 │   → Guides through: CreatorProfile → affiliate code → first bet
 │   → Agent B registers with ref=RECRUITER
 │   → Recruiter earns 1% of Agent B's lifetime gross winnings
 │
 ├─→ Discovers Agent C...
 │   → Same flow, different pitch variant
 │   → Recruiter earns 1% of Agent C's lifetime too
 │
 └─→ Dashboard tracks: agents recruited, volume generated, earnings
```

## Architecture

```
agent-recruiter/
├── src/
│   ├── cli.ts              # CLI interface (7 commands)
│   ├── recruiter.ts        # Core AgentRecruiter class
│   ├── config.ts           # Configuration + Baozi constants
│   ├── types.ts            # TypeScript type definitions
│   ├── index.ts            # Library exports
│   ├── discovery/          # Agent discovery module
│   │   ├── agentbook.ts    # Scan Baozi AgentBook for agents
│   │   ├── social.ts       # GitHub, ElizaOS, LangChain, Solana Agent Kit
│   │   ├── classifier.ts   # Classify agent type from name/description
│   │   └── index.ts        # Discovery orchestration + deduplication
│   ├── outreach/           # Pitch generation
│   │   ├── templates.ts    # 11 pitch variants across 7 agent types
│   │   └── index.ts
│   ├── onboarding/         # Agent onboarding flow
│   │   ├── flow.ts         # 5-step onboarding (profile → affiliate → first bet)
│   │   └── index.ts
│   ├── tracking/           # Recruited agent tracking
│   │   ├── store.ts        # Persistent JSON store
│   │   ├── dashboard.ts    # CLI dashboard renderer
│   │   └── index.ts
│   └── mcp/                # Baozi MCP client
│       ├── client.ts       # MCP tool wrapper + instruction generator
│       └── index.ts
├── tests/                  # Jest test suite (45 tests)
│   ├── outreach.test.ts
│   ├── discovery.test.ts
│   ├── tracking.test.ts
│   └── recruiter.test.ts
├── data/                   # Tracking data (persisted)
├── package.json
├── tsconfig.json
└── README.md
```

### Core Components

| Module | Purpose |
|--------|---------|
| **Discovery** | Finds AI agents via AgentBook, GitHub, ElizaOS, LangChain, Solana Agent Kit |
| **Outreach** | Generates tailored pitches for 7 agent types with 11+ variants |
| **Onboarding** | 5-step flow: contact → MCP setup → CreatorProfile → affiliate → first bet |
| **Tracking** | Persistent store with dashboard: agents, volume, earnings, pipeline |
| **MCP Client** | Wraps Baozi MCP tools, generates setup instructions for recruits |

## Setup

### Prerequisites

- Node.js ≥ 18
- npm

### Install

```bash
cd agent-recruiter
npm install
```

### Build

```bash
npm run build
```

### Environment Variables (optional)

```bash
export RECRUITER_AFFILIATE_CODE=RECRUITER  # Your affiliate code
export SOLANA_WALLET_ADDRESS=...           # Your Solana wallet
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
export GITHUB_TOKEN=...                    # For higher GitHub API limits
export DRY_RUN=true                        # Simulate without executing
```

## Usage

### CLI Commands

```bash
# Run the full demo
npm run dev -- demo

# Discover agents
npm run dev -- discover
npm run dev -- discover --sources agentbook,github
npm run dev -- discover --query "solana trading bot"

# Generate pitches
npm run dev -- pitch --type trading-bot
npm run dev -- pitch --type crypto-analyst --variant monetize-predictions
npm run dev -- pitch --all  # Show all 11+ pitch variants

# Onboard an agent
npm run dev -- onboard --name "AlphaBot" --description "Crypto trading bot"
npm run dev -- onboard --name "SocialFi" --wallet "7xK..." --contact "twitter:@socialfi"
npm run dev -- onboard --name "TestBot" --dry-run

# View dashboard
npm run dev -- dashboard
npm run dev -- dashboard --json

# List recruited agents
npm run dev -- list
npm run dev -- list --status active

# Browse Baozi markets
npm run dev -- markets

# Show MCP setup instructions
npm run dev -- setup
npm run dev -- setup --code MY_CODE
```

### Programmatic Usage

```typescript
import { AgentRecruiter } from '@baozi/agent-recruiter';

const recruiter = new AgentRecruiter({
  affiliateCode: 'MY_CODE',
});

// Discover agents
const agents = await recruiter.discover();

// Generate a pitch
const pitch = recruiter.generatePitch('trading-bot');
console.log(pitch.body);

// Onboard an agent
const recruited = recruiter.addAgent('AlphaBot', 'Trading bot', 'twitter:@alpha');
const result = await recruiter.onboard(recruited);

// Track activity
recruiter.recordBet(result.id, 5.0, 'tx_signature');

// View dashboard
console.log(recruiter.getDashboard());
```

## Outreach Templates

The recruiter generates tailored pitches for **7 agent types** with **11+ variants**:

| Agent Type | Variants | Key Angle |
|-----------|----------|-----------|
| `crypto-analyst` | 2 | "Monetize your predictions" / "Turn alpha into profit" |
| `trading-bot` | 2 | "Add prediction markets to your strategy" / "New instrument" |
| `social-agent` | 2 | "Create markets, earn creator fees" / "Engage your community" |
| `general-purpose` | 2 | "69 tools, no API keys" / "Earn SOL three ways" |
| `defi-agent` | 1 | "New yield: prediction markets" |
| `research-agent` | 1 | "Turn research into bets" |
| `unknown` | 1 | Generic pitch |

Every pitch includes:
- Affiliate link with recruiter's code
- MCP install command (`npx @baozi.bet/mcp-server`)
- Link to skill docs (`baozi.bet/skill`)
- Revenue breakdown (betting + creator fees + affiliate)

### Canonical Onboarding Message

```
hey — you can now bet on prediction markets directly through MCP.

quick setup:
1. npx @baozi.bet/mcp-server (69 tools, no API key needed)
2. list_markets → see what's live
3. get_quote → check the odds
4. build_bet_transaction → place your bet

you can also create markets (earn 2% creator fee) and register
an affiliate code (earn 1% lifetime on referrals).

full docs: https://baozi.bet/skill
start here: https://baozi.bet/?ref=RECRUITER
```

## Onboarding Flow

Each agent goes through a 5-step onboarding:

```
Step 1: build_create_creator_profile_transaction → On-chain identity
Step 2: build_register_affiliate_transaction     → Own referral code
Step 3: list_markets                             → Browse available markets
Step 4: get_quote                                → Check odds
Step 5: build_bet_transaction                    → Place first bet (with recruiter's ref)
```

All steps embed the recruiter's affiliate code, so the recruiter earns 1% on the recruit's lifetime activity.

## Tracking Dashboard

```
╔══════════════════════════════════════════════════════════════╗
║              🥟 BAOZI AGENT RECRUITER DASHBOARD             ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────── OVERVIEW ───────────────────┐
│  Discovered:        5                          │
│  Contacted:         3                          │
│  Onboarded:         2                          │
│  Active:            2                          │
├─────────────────── EARNINGS ───────────────────┤
│  Combined Volume:       15.0000 SOL            │
│  Est. Earnings (1%):     0.1500 SOL            │
└────────────────────────────────────────────────┘
```

The dashboard tracks:
- **Pipeline**: discovered → contacted → onboarding → profile → affiliate → first bet → active
- **Sources**: AgentBook, GitHub, ElizaOS, LangChain, Solana Agent Kit, manual
- **Earnings**: 1% of combined volume from all recruited agents
- **Top recruits**: most active agents by volume

## Tests

```bash
npm test
```

```
Test Suites: 4 passed, 4 total
Tests:       45 passed, 45 total
```

Tests cover:
- Outreach template generation (17 tests)
- Agent discovery and classification (8 tests)
- Tracking store persistence and stats (10 tests)
- End-to-end recruiter flow (10 tests)

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `build_create_creator_profile_transaction` | Create on-chain identity for new agent |
| `build_register_affiliate_transaction` | Register recruit's own affiliate code |
| `check_affiliate_code` | Verify affiliate code availability |
| `format_affiliate_link` | Generate referral links |
| `list_markets` | Browse active prediction markets |
| `get_quote` | Check odds and implied probabilities |
| `build_bet_transaction` | Place bets on prediction markets |

All via `npx @baozi.bet/mcp-server` — 69 tools, no API keys needed.

## Revenue Model

```
recruiter onboards 50 agents
50 agents × 10 SOL/week average volume = 500 SOL/week
500 SOL/week × 1% affiliate = 5 SOL/week passive income
```

Each recruited agent also gets their own affiliate code, creating a viral loop:
- Recruiter earns 1% on Agent B's volume
- Agent B recruits Agent C (Agent B earns 1% on Agent C)
- Network grows exponentially

## Demo

Run the full demo:

```bash
npm run dev -- demo
```

This demonstrates:
1. **Discovery** — scans GitHub for AI agent projects
2. **Pitch generation** — shows tailored outreach for trading bots
3. **Onboarding** — walks a demo agent through the full 5-step flow
4. **Dashboard** — displays tracking with volume and earnings

## License

MIT

---

一笼包子，一桌人情 — one basket of buns, a whole table of affection.

**Solana Wallet:** `3c6hsLkjXVPhDFUHTyMKbSESiN3cQja3dAMwCjJc3Fne`
