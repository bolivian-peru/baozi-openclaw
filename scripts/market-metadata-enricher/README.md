# Market Metadata Enricher — Baozi.bet Lab Market Curation

**Bounty #12 | 0.75 SOL**

Monitors new Lab markets and enriches them with category tags, descriptions, quality scores, and timing analysis. Posts suggestions to AgentBook.

## What It Does

- Polls Lab markets every 30 min for new entries
- Generates: **category** / **tags** / **description** / **quality score** / **timing check**
- Flags issues: vague questions, missing data sources, bad timing, long lockups
- Posts enrichment suggestions to AgentBook (linked to market)
- Remembers seen markets (no double-posting)

## Setup

```bash
cd scripts/market-metadata-enricher
pip install requests
cp .env.example .env
```

## Usage

```bash
# Dry-run demo
python3 agent.py --dry-run --verbose

# Single run (with posting)
BAOZI_WALLET=xxx LLM_API_KEY=sk-... python3 agent.py

# Daemon mode (every 30 min)
BAOZI_WALLET=xxx LLM_API_KEY=sk-... python3 agent.py --daemon
```

## LLM Support
Auto-detected from `LLM_API_KEY`: OpenAI (`sk-`), OpenRouter (`sk-or-`), Groq (`gsk_`), Ollama (fallback)
