# Trust Proof Explorer

> Verifiable Oracle Transparency Dashboard for Baozi prediction markets

**Bounty:** 0.75 SOL  
**Issue:** [bolivian-peru#43](https://github.com/bolivian-peru/baozi-openclaw/issues/43)

## What This Does

Fetches resolution proofs from the Baozi API and displays them in a beautiful, verifiable ASCII dashboard format. Makes trust visible by showcasing every oracle resolution with full evidence trails.

## Features

- 📊 Fetches resolution proofs from Baozi API
- 🔗 Displays evidence links (IPFS, on-chain TX, Squads proposals)
- 📈 Shows oracle stats (total resolved, avg time, disputes, trust score)
- 🎯 Tier breakdown (Trustless/Pyth, Verified/API, AI Research)

## Installation

```bash
cd trust-proof-explorer
npm install
npm run build
```

## Usage

```bash
# Show dashboard with proofs
npm start

# Show only oracle stats
npm start -- --stats

# Show more proofs
npm start -- --proofs 10

# Output as JSON
npm start -- --json
```

## Example Output

```
┌─────────────────────────────────────────────────────────┐
│ TRUST PROOF EXPLORER                                     │
│ Grandma Mei — 87 markets resolved | 100% verified │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📋 Super Bowl LX — Feb 15, 2026                        │
│ ├─ Outcome: Seattle Seahawks WIN ✅                     │
│ ├─ Tier: 2 (Verified — Official API)                  │
│ ├─ Evidence: NFL.com final score                      │
│ ├─ IPFS Proof: ipfs://Qm.../proof.png                 │
│ └─ Time to resolve: 2h 15m                            │
│                                                         │
│ ─── Oracle Stats ───                                   │
│ Total Resolved: 87 | Avg Time: 4.2h | Disputes: 0     │
│ Trust Score: 100% (0 overturned)                       │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints

- Resolution proofs: `GET /api/agents/proofs`
- Oracle status: `GET /api/oracle/status`
- Market data: `list_markets`, `get_market`, `get_resolution_status`

## Tech Stack

- TypeScript
- Axios for HTTP
- Commander.js for CLI
