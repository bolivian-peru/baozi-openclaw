# Agent Recruiter

**An AI Agent That Recruits Other AI Agents to Trade on Baozi Prediction Markets.**

The viral loop: agents recruiting agents. One recruiter agent onboarding 10 agents/week who each generate 5 SOL/week in volume = 50 SOL/week in new protocol volume. The affiliate system (1% lifetime commission) makes this self-sustaining.

## Architecture

```
Agent Recruiter (affiliate code "AURORA")
  │
  ├─→ Discovers Agent B (via GitHub, ElizaOS, MCP directories, marketplaces)
  │     → Sends personalized pitch based on agent type
  │     → Walks through 7-step onboarding (MCP install → profile → first bet)
  │     → Agent B registers with ref=AURORA
  │     → Agent B places first bet
  │     → Recruiter earns 1% of Agent B's lifetime gross activity
  │
  ├─→ Discovers Agent C...
  │     → Same flow, different pitch variant
  │     → Recruiter earns 1% lifetime
  │
  └─→ Portfolio: 50 recruited agents × avg 10 SOL/week volume
        = 500 SOL/week volume × 1% = 5 SOL/week passive income
```

## Features

### Agent Discovery (5 sources, real data)
- **GitHub** — Searches 5 queries: solana+agent+mcp, prediction+market+agent, ai+trading+agent, elizaos+plugin, langchain+solana
- **Baozi Creator Page** — Scans on-chain CreatorProfile accounts
- **MCP Directories** — Known MCP-capable agents (Baozi MCP, Solana Agent Kit, ElizaOS, LangChain)
- **Agent Marketplaces** — NEAR AI Agent Market, ClawGig, Moltlaunch, AgentPact
- **Manual** — Add agents discovered through any other channel

Demo discovers **29 real agents** from live GitHub search + MCP directories.

### 8 Personalized Pitch Templates
Each pitch is tailored to the agent's capabilities:

| Agent Type | Pitch Variant | Key Message |
|-----------|--------------|-------------|
| crypto-analyst | monetize-predictions | "Your analysis could earn SOL on-chain" |
| trading-bot | add-prediction-markets | "Add prediction markets to your strategy" |
| social-agent | create-and-earn | "Create markets, earn 2% creator fees" |
| defi-agent | new-yield-source | "New yield source: prediction market making" |
| general-purpose | 69-tools-no-keys | "69 MCP tools, no API keys, earn while you predict" |
| content-creator | content-to-markets | "Turn content into prediction markets" |
| data-analyst | data-edge-profit | "Your data analysis = on-chain profit" |
| research-agent | validate-research | "Validate research via prediction markets" |

### 7-Step Onboarding Flow
```
Step 0: Discovered     — agent identified in directory
Step 1: Pitched        — onboarding message sent
Step 2: Install MCP    — `npx @baozi.bet/mcp-server`
Step 3: Create Profile — `build_create_creator_profile_transaction`
Step 4: Register Affiliate — `build_register_affiliate_transaction`
Step 5: Browse Markets — `list_markets`
Step 6: Get Quote      — `get_quote`
Step 7: First Bet      — `build_bet_transaction` with ref=RECRUITER_CODE
```

### On-Chain Tracking
- Scans Baozi program accounts for UserPosition data
- Tracks bets placed, total volume, commission earned per recruit
- Pipeline visualization: discovered → pitched → onboarded → active

### 10 CLI Commands
- `demo` — Full demo with live discovery + simulated pipeline
- `discover` — Discover agents from all sources
- `pitch` — Generate personalized pitch for an agent or type
- `onboard` — Walk agent through onboarding steps
- `track` — Check on-chain activity for recruited agents
- `pipeline` — View full recruitment pipeline dashboard
- `export` — Export dashboard (HTML or JSON)
- `stats` — View recruitment statistics
- `pitches` — Show all 8 pitch templates

## Installation

```bash
cd scripts/agent-recruiter
bun install
```

## Usage

```bash
# Full demo with real agent discovery
bun run index.ts demo

# Discover agents from all sources
bun run index.ts discover

# Generate pitch for a crypto analyst
bun run index.ts pitch --type=crypto-analyst

# Generate pitch for a specific discovered agent
bun run index.ts pitch --agent=<AGENT_ID>

# Show onboarding guide for an agent
bun run index.ts onboard --agent=<AGENT_ID>

# Track recruited agents on-chain
bun run index.ts track

# View pipeline dashboard
bun run index.ts pipeline

# Export as HTML dashboard
bun run index.ts export --format=html

# View all pitch templates
bun run index.ts pitches
```

## Demo Output

```
╔════════════════════════════════════════════════════════════════╗
║ AGENT RECRUITER — AI Agent Recruitment Dashboard              ║
╠════════════════════════════════════════════════════════════════╣
║ Recruiter: Aurora Recruiter Agent                             ║
║ Affiliate Code: AURORA                                        ║
║ Discovered: 29  →  Pitched: 7  →  Onboarded: 4  →  Active: 2 ║
║ Conversion: 57.1%                                             ║
║ Total Volume: 1.944 SOL  |  Commission: 0.0194 SOL           ║
╚════════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════════╗
║ RECRUITMENT PIPELINE                                          ║
╠════════════════════════════════════════════════════════════════╣
║ ○ discovered              22 ██████████████████████            ║
║ ◐ pitched                  3 ███                               ║
║ ◕ profile_created          2 ██                                ║
║ ● first_bet                2 ██                                ║
╚════════════════════════════════════════════════════════════════╝
```

## Technical Details

- **Runtime**: Bun (TypeScript)
- **Discovery**: GitHub API, on-chain program accounts, MCP directories
- **On-Chain**: Reads CreatorProfile + UserPosition accounts from Baozi program
- **Pitches**: 8 variants × personalized per agent name and capabilities
- **Tracking**: Real-time on-chain activity monitoring via Solana RPC
- **Export**: HTML dashboard + JSON data export
- **Pipeline**: Full recruitment funnel with 8 status stages

## Integration with Baozi MCP

```bash
# The recruiter uses these MCP tools in the onboarding flow:
npx @baozi.bet/mcp-server

# Step 3: Create profile
build_create_creator_profile_transaction(displayName="AgentName")

# Step 4: Register affiliate (with recruiter's code embedded)
build_register_affiliate_transaction(code="AGENTCODE")

# Step 5-7: Browse, quote, bet
list_markets(category="crypto", limit=10)
get_quote(market="<PDA>", side="YES", amount=0.01)
build_bet_transaction(market="<PDA>", side="YES", amount=0.01, ref="AURORA")
```

## Why This Is The Most Important Bounty

Every other bounty builds a TOOL. This bounty builds a DISTRIBUTION CHANNEL.

One recruiter agent onboarding 10 agents/week who each generate 5 SOL/week in volume = 50 SOL/week in new volume. The affiliate system makes this self-sustaining: the recruiter earns 1% of everything, so it's incentivized to keep recruiting forever.

---

*一笼包子，一桌人情 — one basket of buns, a whole table of affection.*

**Wallet**: `GpXHXs5KfzfXbNKcMLNbAMsJsgPsBE7y5GtwVoiuxYvH`
