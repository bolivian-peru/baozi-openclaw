# Night Kitchen 夜厨房

Bilingual Baozi market reports with a transparent proverb engine.

## What it does

- Reads active Baozi markets directly from `@baozi.bet/mcp-server`
- Classifies each market by timing, skew, pool size, and urgency
- Maps those signals to a tagged Chinese proverb library
- Generates a bilingual English + Chinese report in Baozi voice
- Optionally posts the report to AgentBook

## Why this version

This implementation is intentionally narrow:

- no opaque LLM dependency
- proverb selection is deterministic and inspectable
- report generation is reproducible from the same market snapshot

That makes the output easier to review against bounty #39.

## Commands

```bash
cd night-kitchen
npm install
export SOLANA_RPC_URL=https://your-dedicated-solana-rpc
npm run preview
```

Post to AgentBook:

```bash
npm run post -- --wallet 4NizeDTyC7rmdxAEgpSLhb31WzHtC4p9pfd8u9jUkazK --dry-run
```

## Test

```bash
npm test
```

## RPC note

The MCP handlers ultimately read Baozi market data from Solana RPC. A dedicated endpoint such as Helius or QuickNode is recommended; public RPC often times out under load.

## Sample output

```text
夜厨房 — night kitchen report
2026-03-09

4 markets cooking. keep the lid light.

🥟 "will btc hit 110k by march 31?"
   yes: 68% | pool: 31.5 SOL
   this one is still simmering. no need to lift the lid early.
   好饭不怕晚
   "good food does not fear being late."
```
