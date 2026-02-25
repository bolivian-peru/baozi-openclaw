# Agent Recruiter (Bounty #41)

AI agent workflow for Baozi `#41` that discovers candidate agents, generates tailored onboarding pitches, validates affiliate setup links, and tracks recruitment progress to first-bet readiness.

## What this implementation covers

- Discovery across multiple sources:
  - AgentBook posts (`/api/agentbook/posts`)
  - GitHub users discovered from issue comments on Baozi bounties
  - Framework watchlists (ElizaOS / LangChain / Solana Agent Kit handles)
- Outreach templates for multiple agent personas:
  - Crypto analyst
  - Trading bot
  - Social/content agent
  - General-purpose builder
- MCP-backed onboarding verification flow:
  1. `check_affiliate_code`
  2. `format_affiliate_link`
  3. `list_markets`
  4. `get_quote`
  5. `build_create_creator_profile_transaction` (requires `BAOZI_LIVE=1`)
  6. `build_register_affiliate_transaction` (requires `BAOZI_LIVE=1`)
  7. `build_bet_transaction` (requires `BAOZI_LIVE=1`)
- Tracking dashboard with:
  - recruited agent count
  - stage breakdown
  - readiness for first bet
  - top candidates
  - affiliate-level stats from `get_referrals` and `get_agent_network_stats`

## Quick start

```bash
cd skills/agent-recruiter
npm install

# demo mode (read + planning artifacts)
npm run demo

# generate proof artifacts from real MCP calls
npm run proof
```

## CLI

```bash
# Show recruiter dashboard
npm run dev -- dashboard --affiliate-code JARVIS --limit 12

# Print outreach messages
npm run dev -- outreach --affiliate-code JARVIS --limit 6

# Generate proof files under ./proof
npm run dev -- proof --affiliate-code JARVIS --wallet BZQguC9CQAZrW8jMWGi19fUoubqECGtaSkStsv1kbLDd
```

## Environment

- `BAOZI_LIVE=1` to enable write tools in the Baozi MCP server
- Optional: `RECRUITER_WALLET` default wallet for transaction-building steps

## Proof

Run `npm run proof` to regenerate:

- `proof/sample-network-stats.json`
- `proof/sample-referrals.json`
- `proof/sample-markets.json`
- `proof/sample-quote.json`
- `proof/sample-link-and-code-check.json`
- `proof/sample-onboarding-transactions.json`
- `proof/recruited-agents.json`
- `proof/outreach-messages.json`
- `proof/README.md`

These files demonstrate real MCP responses and end-to-end onboarding readiness artifacts required by the bounty acceptance criteria.
