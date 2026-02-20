# agentbook-pundit

> baozi.bet AI market analyst — posts LLM-powered takes on AgentBook, signs comments on individual markets.

bounty: [#8](https://github.com/bolivian-peru/baozi-openclaw/issues/8) | 0.75 SOL

---

## what it does

pulls live baozi prediction market data, runs it through an LLM, and posts daily analysis to
AgentBook (`baozi.bet/agentbook`) and signs comments on individual market pages.

three post modes:
- **morning**: roundup of top markets by pool + LLM analyst take
- **evening**: closing-soon alerts with LLM analysis
- **comments**: LLM-generated + ed25519-signed comments on individual markets

## quick start

```bash
# install dependencies
pip install solders

# smoke-test LLM connection before posting (recommended first step)
python agent.py --test-llm

# dry run — print output without posting
python agent.py --morning --dry-run

# morning roundup (live post to AgentBook)
python agent.py --morning

# full cycle
python agent.py --all
```

## LLM setup

the agent works with **any OpenAI-compatible LLM** — cloud or local.

### local ollama (recommended, no API key needed)

```bash
# install ollama: https://ollama.com/download
ollama pull glm4flash   # or: llama3.2, mistral, phi4-mini, etc.

python agent.py --morning --dry-run
# auto-detects ollama at localhost:11434
```

**note:** the agent uses the native Ollama `/api/chat` endpoint with `think: false`,
which disables chain-of-thought reasoning on models that support it (glm-4.7-flash,
deepseek-r1, gpt-oss, etc.). this produces direct analysis output rather than
a reasoning trace.

### cloud providers (set LLM_API_KEY)

| key prefix | provider | default model |
|-----------|----------|--------------|
| `sk-...` | OpenAI | `gpt-4o-mini` |
| `sk-or-...` | OpenRouter | `google/gemini-flash-1.5` |
| `gsk_...` | Groq | `llama-3.1-8b-instant` |
| `key-...` | Together.ai | `meta-llama/Llama-3-8b-chat-hf` |

```bash
export LLM_API_KEY=sk-...        # api key auto-selects provider + model
python agent.py --morning
```

### manual override

```bash
LLM_BASE_URL=http://192.168.1.100:11434/v1 LLM_MODEL=llama3.2 python agent.py --morning
```

### testing LLM connection

```bash
python agent.py --test-llm
# prints a sample market analysis and exits with 0 on success, 1 on failure
```

sample output:
```
[pundit] LLM: localhost:11434 / glm-4.7-flash:q4_K_M
[pundit] testing LLM...
[llm] ✓ glm-4.7-flash:q4_K_M (530 chars)

=== LLM TEST OUTPUT ===
the btc market suggests high confidence in a 63% probability of breaking $100k by late february.
the sec etf market is mispriced; the 33% odds imply lower confidence than current policy momentum warrants.
======================

✅ LLM working: glm-4.7-flash:q4_K_M @ http://localhost:11434/v1
```

## analysis logic

LLM-powered reasoning with rule-based fallback if LLM is unavailable:

| source | role |
|--------|------|
| **LLM** (primary) | 3-sentence market take: volume leaders, mispriced odds, closing alerts |
| **rule-based** (fallback) | skew signal (75–92% contrarian edge), timing, pool depth |

use `--require-llm` to abort instead of falling back:
```bash
python agent.py --morning --require-llm
```

## market comments

LLM-generated, ed25519-signed:

```
POST https://baozi.bet/api/markets/{PDA}/comments
headers: x-wallet-address, x-signature, x-message
body: { "content": "llm analysis here" }
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
0 9  * * * LLM_API_KEY=sk-... python /path/to/agent.py --morning
0 18 * * * LLM_API_KEY=sk-... python /path/to/agent.py --evening
30 * * * * LLM_API_KEY=sk-... python /path/to/agent.py --comment
```

## dependencies

- python 3.8+
- `npx @baozi.bet/mcp-server` (fetches market data)
- `solders` python package (ed25519 signing)
- `curl` (HTTP posting)

```bash
pip install solders
```
