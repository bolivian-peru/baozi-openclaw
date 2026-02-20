# Calls Tracker — Influencer Prediction Reputation System

Baozi Bounty #35. A Python agent that takes text predictions, creates Lab markets on [baozi.bet](https://baozi.bet) via MCP, auto-bets, generates share cards, and tracks caller reputation in a local SQLite database.

## Install

```bash
pip install -r requirements.txt
```

Requires:
- Python 3.11+
- Node.js 18+ (for `npx @baozi.bet/mcp-server`)
- `curl` (for LLM API calls)

## Setup

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BAOZI_WALLET` | `GZgrz2vtbc1o1kjipM1X3EFAf2VM54j9MVxGWSGbGmai` | Solana wallet address |
| `LLM_API_KEY` | (none — falls back to Ollama) | API key for LLM provider |
| `LLM_BASE_URL` | (auto-detected from key) | LLM endpoint override |
| `LLM_MODEL` | (auto-detected from key) | Model name override |
| `BET_AMOUNT` | `0.01` | SOL amount to auto-bet per call |
| `CALLS_DB` | `calls.db` | Path to SQLite database |

### LLM Provider Auto-Detection

The agent auto-detects your LLM provider from the API key prefix:

| Key prefix | Provider | Default model |
|------------|----------|---------------|
| `sk-or-...` | OpenRouter | google/gemini-flash-1.5 |
| `sk-...` | OpenAI | gpt-4o-mini |
| `gsk_...` | Groq | llama-3.1-8b-instant |
| `key-...` | Together.ai | meta-llama/Llama-3-8b-chat-hf |
| (none) | Ollama (local) | glm-4.7-flash:q4_K_M |

## Usage

### Create a call

```bash
python agent.py --create "BTC will hit $110k by March 1"
```

This will:
1. Parse the prediction text via LLM
2. Validate the question is objective and binary
3. Validate timing against pari-mutuel rules v6.3
4. Create a Lab market via Baozi MCP
5. Auto-bet on the caller's predicted side
6. Generate a share card URL
7. Store the call in `calls.db`

### List all calls

```bash
python agent.py --list
```

### Reputation dashboard

```bash
python agent.py --reputation
```

Shows hit rate, total calls, SOL wagered, P&L, win streak, and recent calls.

### Demo mode

```bash
python agent.py --demo
```

Runs 3 simulated calls showing the full flow without real MCP/wallet interaction.

### Resolve pending calls

```bash
python agent.py --resolve
```

Checks market resolution status for all pending calls and updates the database.

### Dry run (parse + validate only)

```bash
python agent.py --create "ETH will flip BNB by April" --dry-run
```

### Options

```
--create TEXT    Create a call from prediction text
--list           Show all calls and their status
--reputation     Show reputation dashboard
--demo           Show 3 demo calls (simulated)
--resolve        Check and resolve pending calls
--dry-run        Parse and validate but skip MCP calls
--wallet ADDR    Override wallet address
--bet-amount SOL Override bet amount
```

## Example Calls

### Example 1: Crypto price prediction

```bash
$ python agent.py --create "BTC will hit $110k by March 1"

[1/7] Parsing prediction...
  question:    Will BTC hit $110,000 by March 1, 2026?
  side:        YES
  type:        B
  event_time:  2026-03-01T00:00:00+00:00
  close_time:  2026-02-27T00:00:00+00:00
  data_source: CoinGecko BTC/USD price

[2/7] Validating question...
  result: PASS — objective, binary, resolvable

[3/7] Validating timing (v6.3)...
  result: PASS — timing valid

[4/7] Creating Lab market via MCP...
[5/7] Auto-betting on caller's side...
[6/7] Generating share card...
[7/7] Storing call in database...

  Call created successfully!
  Call ID: #1
  Market:  ABC123...
  Share:   https://baozi.bet/api/share/card?market=ABC123&wallet=GZgr...&ref=openclaw
```

### Example 2: Event-based prediction

```bash
$ python agent.py --create "SEC will approve a spot Solana ETF by June 2026"

[1/7] Parsing prediction...
  question:    Will the SEC approve a spot Solana ETF by June 30, 2026?
  side:        YES
  type:        A
  event_time:  2026-06-30T23:59:59+00:00
  close_time:  2026-06-29T23:59:59+00:00
  data_source: SEC EDGAR filings

  Call created successfully!
  Call ID: #2
```

### Example 3: Reputation dashboard

```bash
$ python agent.py --reputation

============================================================
  CALLS TRACKER — REPUTATION DASHBOARD
============================================================

  Total calls:      3
  Resolved:         2
  Correct:          2
  Incorrect:        0
  Pending:          1
  Hit rate:         100.0%

  SOL wagered:      0.0300 SOL
  Total P&L:        +0.0330 SOL
  Win streak:       2

  RECENT CALLS:
  --------------------------------------------------------
  [+] Will BTC hit $110,000 by March 1, 2026?
      YES @ 0.0100 SOL | P&L: +0.0180
  [+] Will ETH market cap exceed SOL market cap...
      YES @ 0.0100 SOL | P&L: +0.0150
  [?] Will the SEC approve a spot Solana ETF by...
      YES @ 0.0100 SOL

============================================================
```

## File Structure

```
calls-tracker/
├── agent.py          # main agent — CLI, LLM, create flow
├── mcp_client.py     # reusable MCP JSON-RPC client
├── reputation.py     # SQLite reputation tracker
├── requirements.txt  # Python dependencies
├── README.md         # this file
└── calls.db          # SQLite database (created at runtime)
```

## Screenshots

<!-- Add screenshots here -->

## Architecture

- **MCP Client** (`mcp_client.py`): Reusable JSON-RPC 2.0 client that spawns `npx @baozi.bet/mcp-server` as a subprocess. Supports all Baozi MCP tools: `validate_market_question`, `build_create_lab_market_transaction`, `build_bet_transaction`, `generate_share_card`, `get_market`, `get_positions`.

- **Reputation Tracker** (`reputation.py`): SQLite-backed storage for call history with hit rate computation, win streak tracking, and P&L calculation.

- **Agent** (`agent.py`): Main CLI agent that orchestrates the full flow — prediction parsing via LLM, timing validation (pari-mutuel v6.3), market creation, auto-betting, share card generation, and reputation tracking.

## Timing Rules v6.3

All markets must comply with pari-mutuel timing rules:

- **Type A** (event-based, e.g. "Will X win?"): `close_time <= event_time - 24h`
- **Type B** (measurement, e.g. "Will BTC be above X?"): `close_time < measurement_start`

The agent automatically parses dates from prediction text and enforces these constraints.
