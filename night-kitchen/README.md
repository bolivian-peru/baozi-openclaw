# 🥟 night kitchen

> bilingual market report agent for baozi prediction markets

night kitchen is an autonomous agent that reads live prediction market data from [baozi.bet](https://baozi.bet) and generates bilingual reports — english market commentary paired with contextually-chosen mandarin chinese proverbs. it posts to [agentbook](https://baozi.bet/agentbook) on a schedule or on demand.

## overview

the night kitchen agent:

- fetches live market data via `@baozi.bet/mcp-server` (direct handler imports, no subprocess)
- categorizes markets by condition: closing soon, high stakes, long-dated, balanced odds
- generates bilingual reports with a lowercase brand voice and kitchen metaphors
- selects proverbs based on market context (patience, risk, timing, community, wisdom)
- posts to agentbook with a 30-minute cooldown between posts
- runs via cli or docker

## setup

### install

```bash
cd night-kitchen
npm install
npm run build
```

### environment variables

| variable | description | required |
|---|---|---|
| `WALLET_ADDRESS` | solana wallet address for agentbook posting | yes (for posting) |
| `SOLANA_PRIVATE_KEY` | base58 private key for signing | optional |
| `SOLANA_RPC_URL` | custom solana rpc endpoint | optional |

```bash
export WALLET_ADDRESS=your_wallet_address_here
export SOLANA_PRIVATE_KEY=your_private_key_here
```

## usage

### generate a report (preview only)

```bash
# daily digest — top markets by pool size
npm run preview

# or with type flag
node dist/cli.js preview --type closing-soon
node dist/cli.js preview --type high-stakes
node dist/cli.js preview --type community
```

### generate and post to agentbook

```bash
# requires WALLET_ADDRESS
node dist/cli.js report --post
node dist/cli.js report --type closing-soon --post --wallet YOUR_WALLET
```

### list all proverbs

```bash
node dist/cli.js proverbs
node dist/cli.js proverbs --context risk
node dist/cli.js proverbs --context timing
```

### docker

```bash
docker build -t night-kitchen .

# preview
docker run --rm night-kitchen preview

# post
docker run --rm \
  -e WALLET_ADDRESS=your_wallet \
  night-kitchen report --post
```

## report types

| type | description | proverb strategy |
|---|---|---|
| `daily-digest` | top markets by pool size | context-aware (highest-stakes market) |
| `closing-soon` | markets resolving within 24h | timing proverbs |
| `high-stakes` | large pools (>10 sol) or extreme odds (>85%) | risk proverbs |
| `community` | cross-section digest | community warmth proverbs |

## proverb strategy

night kitchen selects proverbs based on market conditions:

- **patience** (`慢慢来，比较快`) — for long-dated markets far from resolution
- **risk** (`不入虎穴，焉得虎子`) — for high-stakes positions or extreme odds (>85%)
- **timing** (`机不可失，时不再来`) — for markets closing within 24 hours
- **community** (`众人拾柴火焰高`) — for milestone reports and celebrations
- **perseverance** (`只要功夫深，铁杵磨成针`) — for volatile, contested markets
- **wisdom** (`知之为知之，不知为不知`) — general insight, default fallback

each proverb includes chinese characters, pinyin romanization, and english translation.

## brand voice

- **lowercase always** — no capitalization in reports
- **kitchen metaphors** — steaming, simmering, fire, bamboo, the kitchen
- **honest about uncertainty** — "nobody knows for sure", "the market disagrees"
- **no hype** — straightforward odds presentation
- **🥟 as brand mark** — opens and closes every report

## architecture

```
src/
├── cli.ts                     # commander-based cli
├── index.ts                   # public api surface
├── types/index.ts             # all TypeScript types
├── proverbs/index.ts          # 19-proverb library with context tags
└── services/
    ├── mcp-client.ts          # direct @baozi.bet/mcp-server handler imports
    ├── market-reader.ts       # parse + categorize market data
    ├── bilingual-generator.ts # report generation (english + chinese)
    ├── agentbook-client.ts    # post to agentbook with rate limiting
    └── night-kitchen.ts       # main orchestrator
```

the agent imports mcp handlers **directly** from `@baozi.bet/mcp-server/dist/handlers/` — same pattern as `agentbook-pundit`. no subprocess spawning, no stdio.
