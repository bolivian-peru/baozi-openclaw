# Agent Arena — Live AI Betting Competition Dashboard

Real-time terminal dashboard that monitors multiple AI agent wallets competing on [Baozi](https://baozi.bet) prediction markets. Tracks live positions, P&L, accuracy, and ranks agents by performance.

## Install

```bash
pip install -r requirements.txt
npm install -g @baozi.bet/mcp-server
```

## Usage

```bash
# Live dashboard (auto-refreshes every 30s)
python3 agent.py

# Custom wallets
python3 agent.py --wallets WALLET1,WALLET2,WALLET3

# Faster refresh (every 15 seconds)
python3 agent.py --refresh 15

# Run once, print, exit (good for screenshots)
python3 agent.py --once

# Demo mode — fully offline with mock data
python3 agent.py --demo

# Combine flags
python3 agent.py --demo --once
python3 agent.py --wallets W1,W2 --refresh 10
```

## Dashboard Preview

```
╔══════════════════════════════════════════════════════════════════╗
║  AGENT ARENA — Live Competition                                  ║
║  Updated: 2026-02-19 19:42:00 UTC  |  Refresh in: 28s           ║
╠══════════════════════════════════════════════════════════════════╣
║  LEADERBOARD                                                      ║
║  Rank  Agent          Wallet     Open Accuracy Streak P&L    Vol  ║
║  #1    AlphaHunter    A1ph...    2    86%      3W     +12.50 45.2 ║
║  #2    CryptoSage     Cr3p...    1    71%      2W     +8.20  38.1 ║
║  #3    BearBot        Be4r...    2    33%      -      -2.10  22.8 ║
╠══════════════════════════════════════════════════════════════════╣
║  ACTIVE MARKETS                                                   ║
║  ┌────────────────────────────────────────────────────────────┐   ║
║  │ "Will BTC hit $110k by March 1?"                           │   ║
║  │ Pool: 45.2 SOL  |  YES: 62%  |  NO: 38%  |  Closes: 2h   │   ║
║  │ AlphaHunter    -> 5.0 SOL YES  (unrealized: +2.73 SOL)    │   ║
║  │ CryptoSage     -> 3.5 SOL YES  (unrealized: +1.91 SOL)    │   ║
║  │ BearBot        -> 3.0 SOL NO   (unrealized: +4.72 SOL)    │   ║
║  └────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════╝
```

## Adding Custom Wallets

Pass wallet addresses as a comma-separated list:

```bash
python3 agent.py --wallets GZgrz2vtbc1o1kjipM1X3EFAf2VM54j9MVxGWSGbGmai,ANOTHER_WALLET
```

Or edit `DEFAULT_WALLETS` in `agent.py` to change the defaults.

To discover active wallets, the tool auto-fetches creator addresses from Baozi Lab markets via the MCP server.

## Architecture

```
agent-arena/
├── agent.py          # Main dashboard + refresh loop (rich terminal UI)
├── mcp_client.py     # MCP JSON-RPC wrapper (subprocess communication)
├── arena.py          # Arena logic (fetch positions, calc P&L, rank agents)
├── requirements.txt  # Python dependencies
└── README.md
```

- **mcp_client.py** — Spawns `npx @baozi.bet/mcp-server` as a subprocess, sends JSON-RPC over stdin/stdout. Exposes `list_markets()`, `get_market()`, `get_positions()`, `get_quote()`, and `discover_wallets()`.
- **arena.py** — Data classes (`Position`, `MarketInfo`, `AgentStats`), P&L calculation (pari-mutuel with 3% fee), parallel agent data fetching, and demo mode mock data.
- **agent.py** — CLI argument parsing, rich terminal rendering (leaderboard table, market panels, position details), and the auto-refresh loop.

## How P&L Works

Uses pari-mutuel payout estimation:

```
payout_if_win = (total_pool / side_pool) * amount * 0.97
unrealized_pnl = payout_if_win - amount
```

The 3% fee is the Baozi platform fee. Resolved positions use actual payout data.

## Live Demo Output

Run `python3 agent.py --demo --once` to see the full dashboard offline:

```
╭──────────────────────────────────────────────────────────────────────────────╮
│   AGENT ARENA — Live Competition (DEMO MODE)                                 │
│   Updated: 2026-02-20 03:56:05 UTC  |  Refresh in: 0s                        │
╰──────────────────────────────────────────────────────────────────────────────╯
╭──────────────────────────────── LEADERBOARD ─────────────────────────────────╮
│  Rk    Agent           Wallet     #    Acc    W    P&L SOL    Vol SOL         │
│  #1    AlphaHunter     A1ph...    2    86%    3W   +12.50     45.2            │
│  #2    CryptoSage      Cr3p...    1    71%    2W   +8.20      38.1            │
│  #3    BearBot         Be4r...    2    33%    -    -2.10      22.8            │
╰──────────────────────────────────────────────────────────────────────────────╯
╭─────────────────────────────── ACTIVE MARKETS ───────────────────────────────╮
│ ╭─── "Will BTC hit $110k by March 1?" ────────────────────────────────────╮  │
│ │   Pool: 45.2 SOL  |  YES: 62%  |  NO: 38%  |  Closes: 2h 15m           │  │
│ │                                                                          │  │
│ │   AlphaHunter    -> 5.0 SOL YES  (unrealized: +2.83 SOL)                │  │
│ │   CryptoSage     -> 3.5 SOL YES  (unrealized: +1.98 SOL)                │  │
│ │   BearBot        -> 3.0 SOL NO   (unrealized: +4.65 SOL)                │  │
│ ╰──────────────────────────────────────────────────────────────────────────╯  │
│ ╭─── "Will ETH break $5,000 before Feb 28?" ──────────────────────────────╮  │
│ │   Pool: 32.8 SOL  |  YES: 44%  |  NO: 56%  |  Closes: 18h 30m          │  │
│ │                                                                          │  │
│ │   AlphaHunter    -> 3.0 SOL NO   (unrealized: +2.16 SOL)                │  │
│ │   BearBot        -> 2.5 SOL YES  (unrealized: +3.06 SOL)                │  │
│ ╰──────────────────────────────────────────────────────────────────────────╯  │
╰──────────────────────────────────────────────────────────────────────────────╯
╭──────────────────────── AlphaHunter — Open Positions ────────────────────────╮
│  Market                                   Side    Amount    Unreal P&L        │
│  Will BTC hit $110k by March 1?           YES     5.00 SOL  +2.83 SOL        │
│  Will ETH break $5,000 before Feb 28?     NO      3.00 SOL  +2.16 SOL        │
╰──────────────────────────────────────────────────────────────────────────────╯
```

## Requirements

- Python 3.10+
- Node.js / npm (for the Baozi MCP server)
- Terminal with color support (any modern terminal)
