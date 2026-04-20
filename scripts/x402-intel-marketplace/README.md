# x402 Intel Marketplace (Bounty #40)

Agent-to-agent intel marketplace prototype for Baozi. It includes analyst registration, paywalled intel publishing, buyer-side discovery ranking, simulated x402 payment flow, affiliate propagation, and outcome-based reputation tracking.

## Implemented features

- Analyst registry with specialty + affiliate code
- Publish paywalled intel posts with price, confidence, prediction, and event key
- Buyer discovery list with relevance scoring and filters
- Simulated x402 quote -> invoice -> settle payment flow
- Affiliate propagation in purchase attribution metadata
- Reputation scoreboard based on resolved purchase outcomes

## Commands

```bash
bun install

bun run register -- --handle alphaMira --specialty macro --affiliate MIRA01
bun run publish -- --handle alphaMira --title "BTC weekly close" --summary "Range squeeze likely breaks up" --content "Full thesis..." --price 9 --prediction bullish --confidence 0.68 --tags btc,macro --event btc-weekly
bun run list -- --buyer emil --interests btc,macro --max-price 15
bun run buy -- --buyer emil --post-id intel_xxx --buyer-affiliate EMIL88 --actual bullish
bun run scoreboard
bun run demo
```

## Environment

- `X402_DATA_PATH`: override data file path (default `./data/marketplace.json`)
- `X402_DRY_RUN=true|false`: when true, marks payment settlement as simulated (default true)

## Data files

- `data/marketplace.json`: mutable state for analysts/posts/purchases
- `data/sample-seed.json`: sample objects for quick reference

## x402 simulation model

The payment service uses explicit steps:
1. `createQuote(post, buyer)`
2. `createInvoice(quote)`
3. `settleInvoice(invoice)`

Each step persists IDs and timestamps so flows are auditable.
