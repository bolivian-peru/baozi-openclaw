# Night Kitchen Agent 🥟

A bilingual market report generator for Baozi prediction markets. Fetches live data and serves up warm, kitchen-flavored insights in both English and Chinese.

## Features

- 🔄 **Live market data** - Fetches real-time markets from Baozi API
- 🌏 **Bilingual reports** - English + Chinese throughout
- 🥟 **Brand voice** - Lowercase, warm, kitchen metaphors
- 📜 **Smart proverbs** - Traditional Chinese wisdom matched to market conditions
- 📤 **AgentBook posting** - Optional posting to Baozi's agent feed
- 🎭 **Demo mode** - Works out of the box with sample data

## Quick Start

```bash
cd integrations/night-kitchen
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python night_kitchen.py
```

The agent runs in **demo mode** by default with sample market data. To use live data, set your Baozi API key:

```bash
export BAOZI_API_KEY="your-api-key-here"
./venv/bin/python night_kitchen.py
```

## Usage

### Generate a report

```bash
python night_kitchen.py              # Demo mode (no API key needed)
BAOZI_API_KEY=xxx python night_kitchen.py  # Live data
```

### Generate short summary

```bash
python night_kitchen.py --short
```

### Post to AgentBook

```bash
python night_kitchen.py --post
```

### Focus on specific market

```bash
python night_kitchen.py --market-id btc-110k-march
```

## Project Structure

```
night-kitchen/
├── night_kitchen.py      # Main agent entry point
├── api_client.py         # Baozi HTTP API client
├── proverbs.py           # Proverb selection logic
├── report_generator.py   # Report formatting
├── config.py             # Configuration
├── requirements.txt      # Python dependencies
└── README.md             # This file
```

## API Endpoints

The agent uses these Baozi endpoints:

- **Markets**: `GET https://baozi.bet/api/markets` (requires API key)
- **AgentBook**: `POST https://baozi.bet/api/agentbook/posts` (requires API key)

## Getting an API Key

1. Visit [baozi.bet](https://baozi.bet)
2. Create an account or sign in
3. Generate an API key from your settings
4. Set it as an environment variable: `export BAOZI_API_KEY="your-key"`

## Proverb Library

Proverbs are selected based on market conditions:

| Proverb | Meaning | When Used |
|---------|---------|-----------|
| 心急吃不了热豆腐 | Patience - can't rush hot tofu | Long-dated markets |
| 慢工出细活 | Fine work takes time | Quality-focused |
| 好饭不怕晚 | Good food doesn't fear being late | Worth waiting |
| 火候到了，自然熟 | When fire is right, it's done | Timing |
| 贪多嚼不烂 | Bite off more than you can chew | High-stakes warning |
| 知足常乐 | Contentment brings happiness | Take profits |
| 见好就收 | Quit while ahead | Smart exits |
| 谋事在人成事在天 | Man proposes, heaven disposes | Acceptance |

## Example Output

```
夜厨房 — night kitchen report
mar 1, 2026

3 markets cooking.

🥟 "Will BTC hit $110k by March 1?"
   YES: 58% | NO: 42% | Pool: 32.4 SOL

   心急吃不了热豆腐
   "patience — you can't rush hot tofu."

───────────────

好饭不怕晚 — good food doesn't fear being late.

baozi.bet | 小小一笼，大大缘分
```

## Configuration

Edit `config.py` to customize:

- `MAX_MARKETS_DISPLAY` - Max markets per report (default: 5)
- `REQUEST_TIMEOUT` - API timeout in seconds (default: 10)
- `DEFAULT_REPORT_TITLE` - Report header text

Environment variables:

- `BAOZI_API_KEY` - Your Baozi API key for live data
- `NIGHT_KITCHEN_DEMO` - Set to `1` to force demo mode

## Brand Voice Guidelines

- **Always lowercase** - no capital letters
- **Short lines** - easy to scan
- **Kitchen metaphors** - steaming, cooking, fire
- **Honest about risk** - no hype, stay grounded
- **Warm tone** - friendly, not corporate

## License

MIT
