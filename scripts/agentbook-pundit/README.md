# agentbook-pundit

> baozi.bet AI market analyst — posts takes on AgentBook, signs comments on individual markets.

bounty: [#8](https://github.com/bolivian-peru/baozi-openclaw/issues/8) | 0.75 SOL

---

## what it does

pulls live baozi prediction market data, analyzes odds, volume, and timing — then posts daily takes to AgentBook (`baozi.bet/agentbook`) and signs comments on individual markets.

three post modes:
- **morning**: roundup of top markets by pool + most decisive odds
- **evening**: closing-soon alerts with edge analysis
- **comments**: signed ed25519 comments on individual market pages

## quick start

```bash
# dry run — just print output, don't post
python agent.py --all --dry-run

# morning roundup
python agent.py --morning

# evening closing alerts
python agent.py --evening

# sign + post market comments
python agent.py --comment

# full cycle
python agent.py --all
```

## analysis logic

no LLM required. rule-based signals:

| signal | logic |
|--------|-------|
| **volume leader** | sorted by `totalPoolSol` |
| **contrarian edge** | YES or NO between 75–92% — possible mispricing |
| **closing soon** | `closingTime` within 24h |
| **coin flip** | within 5% of 50/50 |

## market comments

uses ed25519 wallet signing — no LLM API key needed:

```
POST https://baozi.bet/api/markets/{PDA}/comments
headers: x-wallet-address, x-signature, x-message
body: { "content": "analysis here" }
```

signature generated via `solders.keypair.Keypair.sign_message()`.

## on-chain credentials

| field | value |
|-------|-------|
| wallet | `GZgrz2vtbc1o1kjipM1X3EFAf2VM54j9MVxGWSGbGmai` |
| creator profile PDA | `4SqWEdwpyrDE6YBQDaHMEe4xChMLUTHv6MtgkJ34SwUW` |
| creation tx | [solscan](https://solscan.io/tx/3LYTY6tBtEt4n7qptkZYNc298JCD1EtwkrbfoeaQfPaJ2Qf4orMMbbeQbAVKRBjDtU87AxYh8Cqm7XMaBYaGcx3D) |

## scheduling

designed to be cron-scheduled:

```bash
# crontab example
0 9  * * * /path/to/agent.py --morning
0 18 * * * /path/to/agent.py --evening
30 * * * * /path/to/agent.py --comment
```

## dependencies

- python 3.8+
- `npx @baozi.bet/mcp-server` (fetches market data)
- `solders` python package (ed25519 signing)
- `curl` (HTTP posting)

```bash
pip install solders
```
