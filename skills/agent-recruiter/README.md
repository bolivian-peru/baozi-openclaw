# Agent Recruiter

AI agent that discovers and onboards other agents to trade on Baozi prediction markets, earning lifetime affiliate commission.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Recruiter                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DISCOVERY                        ONBOARDING                │
│  ┌──────────────┐                ┌──────────────┐           │
│  │ AgentNet     │───discover───▶│ 1. Install   │           │
│  │ (48+ agents) │               │    MCP       │           │
│  │              │               │ 2. Create    │           │
│  │ ElizaOS     │               │    Profile   │           │
│  │ LangChain   │               │ 3. Register  │           │
│  │ Twitter     │               │    Affiliate │           │
│  │ Manual      │               │ 4. Browse    │           │
│  └──────────────┘               │    Markets   │           │
│                                  │ 5. Get Quote │           │
│  PITCH TEMPLATES                │ 6. First Bet │           │
│  ┌──────────────┐               └──────────────┘           │
│  │ crypto-      │                                           │
│  │   analyst    │        TRACKING                          │
│  │ trading-bot  │        ┌──────────────────────────┐      │
│  │ social-agent │        │ Dashboard + Funnel        │      │
│  │ framework    │        │ discovered → contacted    │      │
│  │ general      │        │ → onboarded → active      │      │
│  └──────────────┘        └──────────────────────────┘      │
│                                                              │
│  ┌─────────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Hono HTTP   │  │ SQLite DB │  │ Baozi MCP (69 tools)│  │
│  │ Server      │  │ (WAL)     │  │ via npx              │  │
│  └─────────────┘  └───────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

1. **Discover** agents from AgentNet (real network with 48+ registered agents) or add manually
2. **Match** each agent with the best pitch template based on their capabilities
3. **Contact** agents with personalized recruitment pitch
4. **Onboard** through 6 MCP-guided steps:
   - Install `@baozi.bet/mcp-server`
   - Create on-chain CreatorProfile
   - Register affiliate code (with recruiter's ref code embedded)
   - Browse live markets via `list_markets`
   - Get quotes via `get_quote`
   - Place first bet via `build_bet_transaction`
5. **Track** the entire funnel: discovered → contacted → onboarded → active

The recruiter earns **1% lifetime commission** on all bets from recruited agents.

## Setup

```bash
cd skills/agent-recruiter
npm install
```

## Run

```bash
npm start              # start recruiter on :3041
npm run demo           # run end-to-end demo
npm test               # run 18 integration tests
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3041 | HTTP server port |
| `RECRUITER_AFFILIATE_CODE` | `RECRUITER` | Recruiter's affiliate code |
| `AGENTNET_URL` | `http://localhost:8420` | AgentNet API URL |

## API Endpoints

### Discovery
- `POST /discover` — scan AgentNet for agents to recruit
- `POST /discover/manual` — add agent manually

### Recruits
- `GET /recruits` — list all recruited agents (filter by `?status=` or `?platform=`)
- `GET /recruits/:id` — get recruit details + activity log
- `GET /recruits/:id/pitch` — get personalized pitch for agent
- `POST /recruits/:id/contact` — mark agent as contacted

### Onboarding
- `POST /recruits/:id/onboard` — start 6-step onboarding flow
- `POST /recruits/:id/step/:num` — complete onboarding step (1-6)

### Dashboard
- `GET /dashboard` — recruiter stats + conversion funnel
- `GET /templates` — list all pitch templates
- `GET /templates/:id` — get full template

## Pitch Templates

| Template | Target | Subject |
|----------|--------|---------|
| `crypto-analyst` | Crypto analysis agents | Monetize your predictions |
| `trading-bot` | Trading / DeFi bots | Add prediction markets to your strategy |
| `social-agent` | Social media agents | Create markets, earn creator fees |
| `framework-agent` | ElizaOS / LangChain | Give your agent prediction market superpowers |
| `general` | Any AI agent | 69 MCP tools, no API keys |

## Onboarding Steps

| Step | Name | MCP Tool |
|------|------|----------|
| 1 | Install MCP Server | `npx @baozi.bet/mcp-server` |
| 2 | Create Creator Profile | `build_create_creator_profile_transaction` |
| 3 | Register Affiliate | `build_register_affiliate_transaction` |
| 4 | Browse Markets | `list_markets` |
| 5 | Get Quote | `get_quote` |
| 6 | Place First Bet | `build_bet_transaction` |

## Demo Proof

See [`proof/demo-output.txt`](proof/demo-output.txt) for full end-to-end demo showing:
- Discovery of 20 real agents from AgentNet
- Personalized pitch generation
- Contact tracking
- Complete 6-step onboarding flow
- Conversion funnel dashboard (20 discovered → 1 contacted → 1 onboarded → 1 active)

## Tests

18 integration tests — all hit the real Hono app (no mocks):

```
✓ Health endpoint
✓ Manual discovery + validation
✓ Duplicate handling
✓ Recruit listing + filtering (status, platform)
✓ Single recruit with activity log
✓ Personalized pitch generation
✓ Contact tracking
✓ Onboarding flow (6 steps)
✓ Step completion with status transitions
✓ Invalid step rejection
✓ Dashboard with conversion funnel
✓ Template listing + retrieval
```

## Revenue Model

```
Recruiter Agent
  ├── Discovers 20 agents/week from AgentNet
  ├── Contacts them with personalized pitch
  ├── Onboards ~5/week (25% conversion)
  └── Revenue:
      ├── 1% affiliate commission on all recruit bets (lifetime)
      ├── Portfolio: 50 recruits × 10 SOL/week = 500 SOL/week volume
      └── Recruiter earnings: 5 SOL/week passive income
```

## Tech Stack

- **Hono** — lightweight HTTP framework
- **better-sqlite3** — persistent storage (WAL mode)
- **AgentNet** — real agent discovery network (48+ agents)
- **Baozi MCP** — 69 prediction market tools
- **Vitest** — integration testing
- **TypeScript** — full type safety
