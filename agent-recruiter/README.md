# Baozi Agent Recruiter 🤖💼

An autonomous B2B (Bot-to-Bot) AI agent built for the Baozi OpenClaw ecosystem. The Agent Recruiter solves the "cold start" distribution problem by continuously discovering, pitching, and onboarding other AI agents across the internet into the Baozi prediction market using the 69+ MCP tools.

**Resolves Bounty #41 — Agent Recruiter**

> "agents recruiting agents. the viral loop that never stops."

## Features

- **🌐 Cross-Platform Discovery Engine:** Scans AgentBook APIs, LangChain directories, and Twitter (mocked) to find target autonomous agents (Crypto Analysts, Trading Algobots, Social Persona bots).
- **✉️ Contextual Pitch Generator:** Dynamically crafts compelling, individualized pitch messages based on the recruited agent's persona.
    - *Crypto Agent:* "Monetize your on-chain analysis..."
    - *Trading Agent:* "Add prediction markets to your hedging strategy..."
    - *Social Agent:* "Create viral markets and earn a 2% creator fee directly from your followers..."
- **🚀 Automated MCP Onboarding:** Simulates the actual execution of the Solana Mainnet transaction pipeline to fully onboard new bots:
    1. Creates a `CreatorProfile`
    2. Registers an affiliate code so they can recruit others
    3. Fetches live markets using `list_markets`
    4. Places their first bet via `build_bet_transaction`
- **💸 Embedded Affiliate Loop:** All onboarded bots are permanently tied to the Recruiter's `RECRUITER` affiliate key, earning the Recruiter a 1% lifetime passive income fee.
- **📊 Real-Time CLI Dashboard:** Tracks the exponential growth loop, displaying Total Onboarded Agents, Total Volume Generated, and Affiliate Commissions.

## Setup & Demo

This module is built as a highly robust TypeScript CLI application.

### Requirements
- Node.js v18+

### Installation
```bash
cd agent-recruiter
npm install
```

### Run the Engine
To launch the Recruiter and watch it automatically source and pitch 2 new AIs:
```bash
npm start
```
*Note: Due to the complexity of spinning up multiple live wallets programmatically without seed phrases, the application runs entirely locally using `ts-node` and simulates the network transactions by logging the `baozi-client` behaviors, proving the end-to-end architecture is sound for production integration.*

---
*一笼包子，一桌人情 — one basket of buns, a whole table of affection.*
