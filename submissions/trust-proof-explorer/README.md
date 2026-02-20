# Trust Proof Explorer

Verifiable Oracle Transparency Dashboard for [Baozi.bet](https://baozi.bet) — fetches all oracle resolution proofs and displays them in a clean, verifiable rich terminal UI.

Built for **Baozi Bounty #43**.

## Install

```bash
pip install -r requirements.txt
```

Requirements: Python 3.10+, `rich`, `requests`.

## Usage

```bash
# Full dashboard — all proofs with stats
python3 agent.py

# Filter by resolution tier
python3 agent.py --tier 1    # Trustless (Pyth oracle, no human)
python3 agent.py --tier 2    # Verified (official API source)
python3 agent.py --tier 3    # AI Research (Grandma Mei AI)

# Filter by category (case-insensitive contains match)
python3 agent.py --category Sports
python3 agent.py --category politics

# Filter by layer
python3 agent.py --layer official
python3 agent.py --layer labs

# Search market questions
python3 agent.py --search "BTC"
python3 agent.py --search "Toyota"

# Filter by date (YYYY-MM-DD)
python3 agent.py --date 2026-02-19

# Oracle stats only
python3 agent.py --stats

# Trust comparison table (Baozi vs Polymarket)
python3 agent.py --compare

# Combine filters
python3 agent.py --layer labs --category sports
python3 agent.py --tier 2 --search "Super Bowl" --compare
```

All filters are combinable.

## Resolution Tiers

| Tier | Name | Source | Speed |
|------|------|--------|-------|
| 1 | Trustless | Pyth on-chain oracle | < 5 min |
| 2 | Verified | ESPN, BLS, BBC, NFL | 1-6 hours |
| 3 | AI Research | Claude + web | 1-24 hours |

## Example Output

### Full Dashboard
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  🔍 TRUST PROOF EXPLORER — Baozi Oracle Transparency                       ║
║  Oracle: Grandma Mei  |  8 proofs  |  Trust Score: 100%  |  Network: Solana║
╚══════════════════════════════════════════════════════════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📋 Official Markets — Feb 19 Resolution                                     ┃
┃ Tier 2 (Verified) | Sports/Esports | Resolved by: Mei (Grandma Mei Oracle)  ┃
┃                                                                              ┃
┃ ╭────────────────────────────────────────────────────────────────────────╮   ┃
┃ │  ✅ Will a Toyota driver win the 2026 Daytona 500?                    │   ┃
┃ │  Outcome     YES                                                      │   ┃
┃ │  Evidence    Tyler Reddick (23XI Racing - Toyota) won the 2026        │   ┃
┃ │              Daytona 500 on Feb 15.                                   │   ┃
┃ │  Source      https://en.wikipedia.org/wiki/2026_Daytona_500           │   ┃
┃ │  Market PDA  FswLya9o...c527                                          │   ┃
┃ │  Solscan     https://solscan.io/account/FswLya9o...c527               │   ┃
┃ ╰────────────────────────────────────────────────────────────────────────╯   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Stats View (`--stats`)
```
                              ORACLE STATS
╔═══════════════════════════╤═════════════════════════════════════════════╗
║ Metric                    │ Value                                       ║
╟───────────────────────────┼─────────────────────────────────────────────╢
║ Total Proof Bundles       │ 8                                           ║
║ Total Markets Resolved    │ 19                                          ║
║ Disputes                  │ 0 (0%)                                      ║
║ By Tier                   │ Tier 2 (Verified): 8                        ║
║ By Category               │ Economic: 1, Olympics: 1, Politics: 2,      ║
║                           │ Sports: 3, Sports/Esports: 1                ║
║ By Layer                  │ labs: 5, official: 3                        ║
║ Avg Resolution Time       │ Tier 1 (Trustless): < 5 min                 ║
║                           │ Tier 2 (Verified): 1-6 hours                ║
║                           │ Tier 3 (AI Research): 1-24 hours            ║
║ Resolution Tiers          │ Tier 1 — Trustless: Pyth on-chain (< 5 min) ║
║                           │ Tier 2 — Verified: ESPN, BLS, BBC, NFL      ║
║                           │ Tier 3 — AI Research: Claude + web          ║
╚═══════════════════════════╧═════════════════════════════════════════════╝
```

### Comparison Table (`--compare`)
```
                           BAOZI vs THE REST
╔═══════════════════════╤═══════════════════╤══════════════════════╗
║ Criteria              │ Baozi             │ Polymarket           ║
╟───────────────────────┼───────────────────┼──────────────────────╢
║ Evidence stored       │ IPFS ✅           │ None ❌              ║
║ Proof public          │ Yes ✅            │ No ❌                ║
║ Multisig verified     │ 2-of-2 ✅         │ UMA vote ⚠️          ║
║ On-chain TX           │ Visible ✅        │ Visible ✅           ║
║ Dispute window        │ 6 hours ✅        │ 2 hours ⚠️           ║
║ Resolution time       │ 3min-24h ✅       │ Variable             ║
║ Transparency          │ FULL ✅           │ PARTIAL ⚠️           ║
╟───────────────────────┼───────────────────┼──────────────────────╢
║ Trust Score           │ 100%              │ ~60%                 ║
╚═══════════════════════╧═══════════════════╧══════════════════════╝
```

## Trust Comparison: Why Baozi Leads

Prediction markets live or die by oracle trust. Baozi publishes **full resolution proofs** for every market:

- **Evidence stored on IPFS** — immutable, publicly accessible proof bundles
- **Source URLs cited** — every resolution links to ESPN, Wikipedia, BLS, or other authoritative sources
- **On-chain transaction signatures** — verifiable Solana transactions for every resolution
- **Oracle identity public** — Grandma Mei's wallet and program addresses are openly published
- **Multi-tier system** — Tier 1 (Pyth trustless), Tier 2 (verified sources), Tier 3 (AI research) with appropriate speed/trust tradeoffs
- **6-hour dispute window** — triple the time of Polymarket's 2-hour UMA challenge period

Polymarket uses UMA's optimistic oracle, which provides on-chain settlement but lacks per-market evidence documentation. There are no public proof bundles — you trust the system, not the evidence.

Baozi's approach: **don't trust, verify**.

## Data Source

All data fetched live from the [Baozi Proofs API](https://baozi.bet/api/agents/proofs).

## File Structure

```
trust-proof-explorer/
├── agent.py          # Main dashboard + CLI entry point
├── proofs.py         # API fetching, parsing, filtering, stats
├── display.py        # Rich terminal rendering functions
├── requirements.txt  # Python dependencies
└── README.md         # This file
```

## Live Demo Output

Running `python3 agent.py --date 2026-02-19` against real mainnet data:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  🔍 TRUST PROOF EXPLORER — Baozi Oracle Transparency                         ║
║  Oracle: Grandma Mei  |  2 proofs  |  Trust Score: 100%  |  Network: Solana  ║
║  Mainnet                                                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📋 Official Markets — Feb 19 Resolution                                      ┃
┃ Tier 2 (Verified) | Sports/Esports | Resolved by: Mei (Grandma Mei Oracle)   ┃
┃                                                                              ┃
┃  ✅ Will a Toyota driver win the 2026 Daytona 500?                           ┃
┃     Outcome:   YES                                                           ┃
┃     Evidence:  Tyler Reddick (23XI Racing - Toyota) won on Feb 15.           ┃
┃     Source:    https://en.wikipedia.org/wiki/2026_Daytona_500                ┃
┃     PDA:       FswLya9o...c527                                               ┃
┃     Solscan:   https://solscan.io/account/FswLya9oMFDPoFAFJziL4YT3v1sHn...  ┃
┃                                                                              ┃
┃  ❌ Will a European team win Six Invitational 2026?                          ┃
┃     Outcome:   NO                                                            ┃
┃     Evidence:  FaZe Clan (South American team) won, defeating Team Secret.   ┃
┃     Source:    https://en.wikipedia.org/wiki/Six_Invitational                ┃
┃     PDA:       7zskJSEi...n9v3                                               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

Running `python3 agent.py --stats` (live API, 8 proof bundles, 19 markets):

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  🔍 TRUST PROOF EXPLORER — Baozi Oracle Transparency                         ║
║  Oracle: Grandma Mei  |  8 proofs  |  Trust Score: 100%  |  Network: Solana  ║
╚══════════════════════════════════════════════════════════════════════════════╝

                                  ORACLE STATS
╔═══════════════════════════╤══════════════════════════════════════════════════╗
║ Total Proof Bundles       │ 8                                                ║
║ Total Markets Resolved    │ 19                                               ║
║ Disputes                  │ 0 (0%)                                           ║
║ By Tier                   │ Tier 2 (Verified): 8                             ║
║ By Category               │ Sports: 3, Politics: 2, Economic: 1, etc.       ║
║ By Layer                  │ labs: 5, official: 3                             ║
║ Avg Resolution Time       │ Tier 1 (Trustless): < 5 min                     ║
║                           │ Tier 2 (Verified): 1-6 hours                    ║
║                           │ Tier 3 (AI Research): 1-24 hours                ║
╚═══════════════════════════╧══════════════════════════════════════════════════╝
```
