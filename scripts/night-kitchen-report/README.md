# Night Kitchen — Bilingual Market Report (MVP)

Generates a bilingual Baozi-style market report (english primary + chinese accents) with proverb selection based on market context.

## Features

- english-first report with chinese proverb lines
- proverb selection by context:
  - patience: long-dated markets
  - risk: high pool/high-stakes markets
  - luck: close races
  - warmth: default/community tone
- adapter for `@baozi.bet/mcp-server` style data access
  - `BAOZI_API_BASE` configured: fetches `list_markets`
  - no config: deterministic mock fallback
- cli entrypoint to print report
- tests for proverb logic + report format

## Run

```bash
cd scripts/night-kitchen-report
npm run report
```

## Test

```bash
cd scripts/night-kitchen-report
npm test
```

## MCP Integration Note

This MVP keeps MCP integration behind `src/mcpAdapter.js` so it can be upgraded to a full MCP client transport.
Current default behavior uses fallback mock data when no api base/key is provided.
