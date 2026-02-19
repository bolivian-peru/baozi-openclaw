# 🥟 Baozi Trust Proof Explorer

A web dashboard for exploring and verifying Baozi prediction market resolution proofs. Full transparency into oracle decisions, evidence sources, and on-chain verification.

**Live data from:** `GET https://baozi.bet/api/agents/proofs`

---

## 🖼️ Screenshots

### Dashboard Overview
The main dashboard shows aggregate oracle statistics including total resolutions, market count, on-chain proofs with tx signatures, trust score, evidence source count, and categories covered. Below the stats, a tier breakdown shows resolution counts and speeds for each oracle tier.

### Resolution Proofs View
Each resolution proof card displays the title, date, resolver identity, tier badge, layer (official/labs), and category. Inside each card, individual markets are listed with their question, evidence text, outcome (YES/NO), source links, Solscan transaction links, and market PDA addresses.

### Trust Comparison
Side-by-side comparison table between Baozi, Polymarket, and traditional bookmakers across 10 transparency metrics including resolution proofs, on-chain settlement, evidence sources, multi-tier oracle, dispute mechanisms, and API availability.

### Oracle Info
Detailed oracle information including Grandma Mei's on-chain address, program ID, network, and a breakdown of the 3-tier resolution architecture with data sources and speeds.

---

## ✨ Features

- **📊 Oracle Stats Dashboard** — Total resolutions, markets verified, on-chain proof count, trust score, unique evidence sources, and category breakdown
- **🔍 Resolution Proof Explorer** — Browse every resolution with full evidence chain, outcome, source links, and Solscan transaction links
- **🏗️ 3-Tier Architecture View** — Tier 1 (Trustless/Pyth), Tier 2 (Verified/API), Tier 3 (AI Research) breakdown with stats
- **⚖️ Trust Comparison** — Baozi vs Polymarket vs traditional bookmakers transparency comparison across 10 metrics
- **🔮 Oracle Info** — On-chain oracle address, program ID, API endpoints, and resolution architecture details
- **🔎 Search** — Full-text search across market questions, evidence, and categories
- **🎛️ Filter & Sort** — Filter by tier (1/2/3), category, and sort by date or market count
- **📱 Responsive** — Works on desktop, tablet, and mobile
- **🌙 Dark Theme** — Native dark UI matching Baozi's design language
- **⚡ Zero Dependencies** — Single HTML file, no build step, no frameworks

---

## 🚀 Setup

### Option 1: Open directly
```bash
# Just open the HTML file in your browser
open trust-proof-explorer/index.html
```

### Option 2: Serve locally
```bash
# Python
cd trust-proof-explorer
python3 -m http.server 8080

# Node.js
npx serve trust-proof-explorer

# Then visit http://localhost:8080
```

### Option 3: Deploy
The single `index.html` file can be deployed to any static hosting:
- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages
- Any CDN

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                 Browser (Client)                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐ │
│  │  State   │  │ Renderer │  │ Event Handlers │ │
│  │ Manager  │──│  (DOM)   │──│ (Search/Filter │ │
│  │          │  │          │  │  /Sort/Tabs)   │ │
│  └────┬─────┘  └──────────┘  └────────────────┘ │
│       │                                          │
│  ┌────▼─────────────────────────────────────┐   │
│  │           fetch() on page load            │   │
│  └────┬──────────────────────────────────────┘   │
│       │                                          │
└───────┼──────────────────────────────────────────┘
        │ HTTPS
        ▼
┌───────────────────────────────────────┐
│   Baozi API (baozi.bet)               │
│                                       │
│   GET /api/agents/proofs              │
│   → proofs[], stats{}, oracle{}       │
│                                       │
│   Data includes:                      │
│   • Resolution proof batches          │
│   • Market PDAs (Solana addresses)    │
│   • Evidence + source URLs            │
│   • Tx signatures (Solscan-linked)    │
│   • Oracle tier metadata              │
└───────────────────────────────────────┘
```

### Data Flow
1. Page loads → fetches `GET /api/agents/proofs`
2. Response parsed → state populated with proofs, stats, oracle info
3. Categories extracted → filter dropdowns populated
4. Dashboard rendered with computed stats
5. User interactions (search/filter/sort/tab) → re-render from state

### Key Design Decisions
- **Single HTML file** — Zero build step, maximum portability
- **No framework** — Vanilla JS for simplicity and performance
- **Client-side filtering** — All data fetched once, filtered/sorted in-browser
- **Dark theme** — Matches Baozi's native design language
- **CSS custom properties** — Consistent theming with easy customization

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents/proofs` | GET | All resolution proofs with stats and oracle info |
| `/api/oracle/status` | GET | Oracle status page |

### Response Shape (`/api/agents/proofs`)
```json
{
  "success": true,
  "proofs": [{
    "id": 1,
    "date": "2026-02-08",
    "slug": "feb7-sports",
    "title": "Feb 7 Sports Markets",
    "layer": "official|labs",
    "tier": 1|2|3,
    "category": "sports",
    "markets": [{
      "pda": "Solana PDA address",
      "source": "ESPN",
      "outcome": "YES|NO",
      "evidence": "Resolution evidence text",
      "question": "Market question",
      "sourceUrl": "https://...",
      "txSignature": "Solana tx sig"
    }],
    "sourceUrls": ["https://..."],
    "resolvedBy": "Mei",
    "createdAt": "ISO-8601"
  }],
  "stats": { "totalProofs": 8, "totalMarkets": 19, "byLayer": {} },
  "oracle": { "name": "Grandma Mei", "address": "...", "program": "...", "tiers": [] }
}
```

---

## 📄 License

MIT — Built for the [Baozi Openclaw Bounty #43](https://github.com/bolivian-peru/baozi-openclaw/issues/43)
