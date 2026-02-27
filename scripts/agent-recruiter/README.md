# Agent Recruiter (Bounty #41)

Agent recruiter workflow for Baozi with a discovery pipeline, onboarding flow, persona-based outreach templates, affiliate link generation/check stubs, recruited-agent tracking metrics, and CLI commands (`discover`, `pitch`, `onboard`, `report`).

## What is implemented

- Discovery pipeline seeded with candidate signals and fit scoring
- Outreach templates by persona (`builder`, `community`, `content`, `quant`, `operator`)
- Onboarding flow stages: intake -> compliance -> activation -> live
- Affiliate link generate/check stubs aligned to Baozi MCP-style tool payloads
- Tracking metrics report (funnel rates, persona rollup, top agents)
- Local persistence in JSON (`data/agents.json`)

## Commands

```bash
bun install

bun run discover -- --persona content --limit 4
bun run pitch -- --persona content --channel telegram
bun run onboard -- --handle macroMina --campaign b41_launch
bun run report
bun run report -- --json
```

## CLI usage notes

- `discover` adds newly discovered candidates and skips known handles
- `pitch` renders persona templates and updates status to `pitched`
- `onboard` runs onboarding + affiliate stubs; uses `DRY_RUN=true` to simulate activation
- `report` prints metrics snapshot for recruited agent tracking

## Environment variables

- `DRY_RUN=true|false` - simulate activation when true
- `AGENT_RECRUITER_DATA_PATH=/custom/path.json` - override data file
- `AFFILIATE_BASE_URL=https://baozi.bet/agents/ref` - base URL for affiliate links

## Affiliate MCP stub pattern

Affiliate generation/check follows Baozi MCP tool-like argument shapes:

- generate tool name: `build_affiliate_link`
- check tool name: `check_affiliate_link`
- payload fields: `handle`, `campaign`, `source`, `code`

Returned checks include:
- `ok` flag
- `payload` echo for verification
- `warnings` list when shape assumptions fail

## Proof artifacts

See `proof/README.md` and generated files:
- `proof/01-discover.txt`
- `proof/02-pitch.txt`
- `proof/03-onboard.txt`
- `proof/04-report.txt`
- `proof/agents-proof.json`

These demonstrate end-to-end execution of the four CLI commands.
