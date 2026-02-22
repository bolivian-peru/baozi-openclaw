# BAOZI PARIMUTUEL MARKETS – SYSTEM RULES (v7.0)

Internal specification for AI agents, market validators, and frontend logic.
Updated: February 20, 2026

STRICT ENFORCEMENT. Markets violating these rules are BLOCKED at validation.
This document is the SINGLE SOURCE OF TRUTH for market creation.

---

## HOW PARI-MUTUEL WORKS — READ THIS FIRST

Before creating ANY market, you MUST understand the pool mechanics:

```
1. ALL bets go into ONE shared pool
2. House takes a fee (2-3%) from winnings
3. Winners SPLIT the remaining pool proportionally
4. Odds are determined BY the pool ratios, not a bookmaker
```

Example:
```
Pool: 100 SOL total
├─ 70 SOL bet on Outcome A
├─ 30 SOL bet on Outcome B
├─ House fee: 2.5%
│
If A wins: 70 bettors split 97.5 SOL → 1.39x return (weak)
If B wins: 30 bettors split 97.5 SOL → 3.25x return (strong)
```

### THE CRITICAL INSIGHT

Pari-mutuel ONLY works when there is **genuine disagreement** about the outcome.

If the outcome is **predictable or observable**, the pool becomes lopsided:
- 95% of money piles on the obvious side
- Winners get ~1.02x return (basically nothing)
- Nobody wants to bet → market dies → bad UX

**THEREFORE:** Every market MUST have genuine uncertainty where reasonable people disagree.

### THE GOLDEN RULE

**Bettors must NEVER have access to ANY information that could determine the outcome while betting is still open.**

This is non-negotiable. Every rule below exists to enforce this.

---

## PART I: ALLOWED MARKET TYPE

### Type A: Event-Based Markets — THE ONLY TYPE

**Definition:** Markets where the outcome is determined by a single point-in-time event that is UNKNOWABLE until it happens.

**Timing Rule:**
```
betting_close_time <= event_time - 24 hours (MINIMUM)
```

**Timeline:**
```
BETTING OPEN                              EVENT
├────────────────────┤      24h gap       │
                     │◄──────────────►│
                  Created          Close    Outcome Known
```

**Requirements for EVERY market:**
1. Outcome is BINARY (Yes/No) or MULTI-CHOICE (Race: pick 1 of 2-10)
2. Outcome is UNKNOWABLE until the event occurs
3. Outcome is OBJECTIVELY VERIFIABLE from a public source
4. Betting closes AT LEAST 24 hours before the event
5. Resolution source is identified and approved (see Part IV)
6. The question itself is unambiguous — no room for interpretation

---

## PART II: BANNED MARKET TYPES

### HARD BAN: Price Prediction Markets

```
BANNED. NO EXCEPTIONS.
```

Why: Prices are continuous, observable, and autocorrelated. The price at time T strongly predicts price at T+24h. The pool just rebalances to mirror what everyone can already see. No genuine uncertainty = dead market.

**BLOCKED keywords:** `price above`, `price below`, `price at`, `price by`, `trading above`, `trading below`, `market cap above`, `market cap below`, `ATH`, `all-time high`, `floor price above`, `floor price below`

**This applies to:** Crypto, stocks, commodities, NFTs, real estate, forex — ALL asset prices.

### HARD BAN: Measurement-Period Markets

```
BANNED. NO EXCEPTIONS.
```

Why: During the measurement period, information accumulates. Late observers have an edge over early bettors. This creates unfair pools.

**BLOCKED patterns:**
- "How many X happen this week/month?"
- "Total X during [time period]"
- "Which X gains the most during [period]?"
- "Average X over [period]"
- Any market where data is collected over time

**BLOCKED keywords:** `this week`, `this month`, `this quarter`, `over the next`, `during the period`, `total volume`, `total burned`, `gains most`, `average over`

### HARD BAN: Subjective / Unverifiable Outcomes

**BLOCKED keywords:** `become popular`, `go viral`, `be successful`, `perform well`, `be the best`, `breakthrough`, `revolutionary`, `will I`, `will we`, `will my`, `will our`, `ai agent`, `an agent`, `autonomously`

### HARD BAN: Manipulable Outcomes

**BLOCKED keywords:** `will someone`, `will anyone`, `will a person`, `will a user`, `purchase proxies`, `buy proxies`

---

## PART III: DEGEN MARKET CATEGORIES — WHAT WORKS

These categories create GENUINE UNCERTAINTY + HIGH ENGAGEMENT.
Listed in order of recommendation (best first).

### 3.1 COMBAT SPORTS & MMA (Type A) — TIER 1

**Why it's perfect:** One punch changes everything. Upsets are constant. Degens love it.

**Examples:**
- "Will [fighter] win at UFC [event]?" (Source: UFC.com)
- "Will [fight] end by KO/TKO?" (Source: UFC.com official result)
- "Will [celebrity boxing match] go the distance?" (Source: boxing commission)

**Race variant:** "Method of victory: KO, Submission, or Decision?" (Source: UFC.com)

**Resolution:** UFC.com, ESPN, Boxing commission official results
**Close:** 24h before main event start

### 3.2 ESPORTS (Type A) — TIER 1

**Why it's perfect:** Match outcomes are truly unknowable. Upsets happen constantly. Massive overlap with crypto/degen audience.

**Examples:**
- "Will NAVI win IEM Katowice CS2 Grand Final?" (Source: HLTV.org)
- "Will T1 beat Gen.G in LCK Spring Week 5?" (Source: lolesports.com)
- "Who wins VCT Champions: Sentinels, LOUD, or Paper Rex?" (Source: vlr.gg)

**Resolution:** HLTV.org, lolesports.com, vlr.gg, Liquipedia
**Close:** 24h before match start

### 3.3 VIRAL CELEBRITY & INFLUENCER EVENTS (Type A) — TIER 1

**Why it's perfect:** Unpredictable. Culturally relevant. Highly shareable. Polymarket's Elon tweet markets do $20M/week.

**Examples:**
- "Will @elonmusk tweet about [topic] before [date]?" (Source: Twitter/X public timeline)
- "Will MrBeast's next video get 50M views in first 24 hours?" (Source: YouTube public counter, snapshot at T+24h)
- "Will [celebrity] appear on [specific podcast/show] before [date]?" (Source: YouTube/Spotify episode listing)
- "Will Drake drop an album before March 1?" (Source: Spotify/Apple Music official listing)

**Resolution:** Public social media accounts, YouTube, Spotify, official announcements
**Close:** 24h before the deadline/event

**KEY RULE FOR SOCIAL MEDIA MARKETS:** The question must be about a SPECIFIC ACTION by a SPECIFIC PUBLIC FIGURE, verifiable from their public account. NOT about metrics over time.

### 3.4 AWARDS & CEREMONIES (Type A) — TIER 1

**Why it's perfect:** Winners are genuinely unknown until announced live. Multiple markets per event. Awards season = content season.

**Examples:**
- "Who wins Best Picture at the 2027 Oscars?" (Race market, Source: Academy)
- "Who wins Grammy Album of the Year?" (Race market, Source: Recording Academy)
- "Will [artist] win [specific award]?" (Source: official ceremony broadcast)

**Resolution:** Official ceremony results, Academy/Recording Academy
**Close:** 24h before ceremony start

### 3.5 TRADITIONAL SPORTS (Type A) — TIER 1

**Why it's perfect:** Clear outcomes, massive audience, regulated leagues.

**Examples:**
- "Will [team] win Super Bowl?" (Source: NFL.com)
- "Will [team] win NBA Finals?" (Source: NBA.com)
- "Will a no-hitter be thrown at [specific game]?" (Source: MLB.com)
- "F1 Grand Prix winner this weekend?" (Race market, Source: FIA)

**Resolution:** Official league websites, ESPN
**Close:** 24h before game/event start

### 3.6 POLITICAL & GOVERNMENT ACTIONS (Type A) — TIER 1

**Why it's perfect:** High stakes. Binary outcomes. Asymmetric information creates genuine disagreement.

**Examples:**
- "Will the Fed cut rates at the next FOMC?" (Source: Federal Reserve)
- "Will [bill] pass the Senate this week?" (Source: Congress.gov)
- "Will [country leader] resign before [date]?" (Source: AP/Reuters)
- "How many executive orders signed this week: 0-2, 3-5, or 6+?" (Source: Federal Register — close BEFORE the week starts)

**Resolution:** Official government sources, AP/Reuters wire
**Close:** 24h before announcement/deadline

### 3.7 PRODUCT LAUNCHES & TECH (Type A) — TIER 2

**Why it's perfect:** Tech degens love speculating on launches. Binary announcement events.

**Examples:**
- "Will Apple announce [specific feature] at WWDC?" (Source: Apple.com/newsroom)
- "Will GTA VI release before October 2026?" (Source: Rockstar official)
- "Will [game] review score be above 85 on Metacritic on launch day?" (Source: Metacritic — snapshot at specific time)
- "Will ChatGPT be #1 Free App on US App Store on [specific date]?" (Source: App Store ranking at specific time)

**Resolution:** Official company announcements, Metacritic, App Store
**Close:** 24h before announcement/date

### 3.8 ENTERTAINMENT — BOX OFFICE & CHARTS (Type A SNAPSHOTS ONLY) — TIER 2

**Why it's perfect:** Weekly drama, cultural relevance, clear winners.

**IMPORTANT: These MUST be framed as SNAPSHOT predictions about PUBLISHED rankings, NOT measurement-period markets.**

**CORRECT framing (Type A — predict the published result):**
- "What will be #1 on Netflix Top 10 when published on [Tuesday date]?" (Source: Netflix Top 10 page)
- "What will be Billboard Hot 100 #1 on [Tuesday chart date]?" (Source: Billboard.com)
- "What will be #1 at the weekend box office on [Monday when numbers publish]?" (Source: Box Office Mojo)

**Close:** 24h before the chart/ranking is published (NOT before measurement starts).
These are predictions about a FUTURE PUBLISHED RESULT. Betting closes before the result is published. This is Type A because the "event" is the publication of the chart.

**WRONG framing (BANNED — measurement period):**
- ~~"Which movie earns the most this weekend?"~~ (measurement period = Fri-Sun)
- ~~"Which song gets the most streams this week?"~~ (measurement period)

### 3.9 WEATHER & NATURAL EVENTS (Type A) — TIER 2

**Why it's perfect:** Genuinely unpredictable. Fully objective. Government-verified.

**Examples:**
- "Will it snow in NYC on [specific date]?" (Source: NWS/weather.gov)
- "Will temperature exceed 100F in Phoenix on [date]?" (Source: NWS)
- "Will [named hurricane] make landfall as Category 3+?" (Source: NHC)

**Resolution:** NOAA, NWS, weather.gov, official weather stations
**Close:** 24h before the date/event

### 3.10 ABSURDIST / MEME MARKETS (Type A) — TIER 3

**Why it's perfect:** The question itself is the marketing. Extremely shareable. Drives new users.

**Rules:** Must still have an objectively verifiable outcome and resolution source.

**Examples:**
- "Will Wikipedia lock the [controversial article] page before [date]?" (Source: Wikipedia edit history — public)
- "Will [public figure] delete a tweet this week?" (Source: tweet deletion trackers, web archive — close before the week)
- "Will a [specific brand] product sell out within 24h of launch?" (Source: official retailer stock page — snapshot)
- "Will [fast food chain] bring back [product] before [date]?" (Source: official menu/announcement)

**Resolution:** Public records, web archives, official sources
**Close:** 24h before deadline

---

## PART IV: APPROVED RESOLUTION SOURCES

Markets MUST use an approved source. Unapproved sources = market BLOCKED.

| Category | Approved Sources |
|----------|-----------------|
| **Esports** | HLTV.org, lolesports.com, Liquipedia, vlr.gg, DotaBuff |
| **MMA/Boxing** | UFC.com, ESPN, Sherdog, Tapology, boxing commissions |
| **Sports** | NFL.com, NBA.com, MLB.com, NHL.com, FIFA, UEFA, ESPN, PremierLeague.com, FIA |
| **Awards** | Academy Awards, Recording Academy, Hollywood Foreign Press (official ceremonies) |
| **Politics/Gov** | Congress.gov, Federal Reserve, AP News, Reuters, Federal Register, Official Government |
| **Social Media** | Twitter/X public accounts, YouTube public counters, Spotify/Apple Music listings, SocialBlade |
| **Entertainment** | Netflix Top 10, Billboard.com, Box Office Mojo, Metacritic, Rotten Tomatoes |
| **Weather** | NOAA, NWS, weather.gov, NHC, Met Office, JMA, AccuWeather |
| **Tech** | Apple.com/newsroom, official company press releases, SEC filings, App Store/Play Store |
| **Finance/Macro** | BLS (bls.gov), FRED, Federal Reserve, CME FedWatch, SEC |
| **Gaming** | Speedrun.com, Steam, Metacritic, official publisher announcements |
| **General** | Wikipedia edit history, web.archive.org, official brand social media |

---

## PART V: MARKET CREATION DECISION TREE

AI agents and market creators MUST follow this decision tree for EVERY market.

```
START
  │
  ├─ Is the outcome about a PRICE or METRIC over time?
  │   YES → BLOCKED. No price/measurement markets.
  │
  ├─ Is the outcome determined by a SINGLE POINT-IN-TIME EVENT?
  │   NO → BLOCKED. Only event-based markets allowed.
  │
  ├─ Is the outcome GENUINELY UNKNOWABLE until the event?
  │   NO → BLOCKED. Observable/predictable outcomes fail pari-mutuel.
  │
  ├─ Is the outcome OBJECTIVELY VERIFIABLE from an approved source?
  │   NO → BLOCKED.
  │
  ├─ Does betting close AT LEAST 24 hours before the event?
  │   NO → Fix close time. Must be event_time - 24h minimum.
  │
  ├─ Can the market creator INFLUENCE the outcome?
  │   YES → BLOCKED.
  │
  ├─ Would reasonable people DISAGREE on the outcome?
  │   NO → BLOCKED. Lopsided pools = dead market.
  │
  └─ APPROVED. Create the market.
```

### THE UNCERTAINTY TEST

Before creating a market, ask: **"If 100 informed people bet on this, would the pool split be roughly 30/70 or closer?"**

- **30-70 split:** GOOD. Genuine disagreement. Interesting odds.
- **50-50 split:** GREAT. Maximum uncertainty. Best pari-mutuel market.
- **90-10 split:** BAD. Outcome too obvious. Pool is lopsided. Winners get almost nothing.
- **99-1 split:** TERRIBLE. Market is dead on arrival.

---

## PART VI: DEGEN MARKET DESIGN PRINCIPLES

### Principle 1: SPEED

Degens want FAST resolution. Capital locked for weeks = bad UX.

| Resolution Time | Rating |
|----------------|--------|
| Same day | EXCELLENT |
| 1-3 days | GREAT |
| 1 week | GOOD |
| 2 weeks | ACCEPTABLE |
| 1 month+ | BAD |

### Principle 2: SHAREABILITY

The question itself should be tweetable and entertaining. The market is the marketing.

GOOD: "Will MrBeast's next video break 100M views in 48 hours?"
BAD: "What will be the 7-day average view count of YouTube's top creator?"

### Principle 3: ALPHA HUNTING

Degens want to feel like their research gives them an edge. Markets where internet-native people can find information normies can't = engagement.

GOOD: "Will [artist] drop an album before March 1?" (degens stalk producer instagrams, studio booking records)
BAD: "Will BTC be above $100K?" (everyone sees the same chart)

### Principle 4: CULTURAL RELEVANCE

Markets about things the target audience already talks about on Twitter/X and Telegram.

**TOP DEGEN INTERESTS:** UFC, esports, meme culture, Elon Musk, AI competition, celebrity drama, music drops, gaming releases, political chaos, absurdist bets.

### Principle 5: RECURRING SERIES

Weekly recurring markets build habits. Degens come back every week.

**Recommended recurring series:**
- "Elon Musk tweet count over/under" (weekly)
- "Billboard Hot 100 #1 this week" (weekly chart publication)
- "Weekend Box Office #1" (weekly, resolve when Monday numbers publish)
- "UFC main event winner" (per event)
- "LCK/LCS match predictions" (per match week)

### Principle 6: RACE MARKETS FOR ENGAGEMENT

Multi-outcome race markets (2-10 outcomes) generate MORE discussion than binary Yes/No. People argue about which option wins.

GOOD RACE: "Who wins Best Picture: Film A, Film B, Film C, or Other?" (4 outcomes)
GOOD RACE: "UFC main event method of victory: KO, Submission, or Decision?" (3 outcomes)

---

## PART VII: COMPLETE BLOCKED TERMS LIST

Any market containing these terms/patterns is AUTOMATICALLY REJECTED:

### Price/Measurement Terms
`price above`, `price below`, `price at`, `price by`, `trading above`, `trading below`, `market cap above`, `market cap below`, `ATH`, `all-time high`, `floor price`, `gains most`, `total volume`, `total burned`, `average over`, `this week` (when measuring), `this month` (when measuring), `this quarter`, `over the next`, `during the period`

### Subjective Terms
`become popular`, `go viral`, `be successful`, `perform well`, `be the best`, `breakthrough`, `revolutionary`, `dominate`, `take over`

### Self-Referential Terms
`will I`, `will we`, `will my`, `will our`, `ai agent`, `an agent`, `autonomously`

### Manipulation-Risk Terms
`will someone`, `will anyone`, `will a person`, `will a user`, `purchase proxies`, `buy proxies`

### Unverifiable Terms
`secretly`, `behind the scenes`, `rumored`, `might`, `could possibly`

---

## PART VIII: EXAMPLES — GOOD vs BAD

### GOOD Markets (Create These)

| Market | Type | Close | Source | Why Good |
|--------|------|-------|--------|----------|
| "Will [fighter] win UFC 315 main event?" | Binary | 24h before fight | UFC.com | One punch = upset. Real uncertainty. |
| "Who wins IEM Katowice CS2 Grand Final?" | Race | 24h before match | HLTV.org | Esports upsets are constant. |
| "Will @elonmusk tweet about Dogecoin before March 1?" | Binary | 24h before deadline | Twitter/X | Binary event, public record. |
| "What will be #1 on Netflix Top 10 (published Feb 25)?" | Race | 24h before Feb 25 | Netflix Top 10 | Predicting published result. |
| "Who wins Best Picture at 2027 Oscars?" | Race | 24h before ceremony | Academy | Unknown until envelope opens. |
| "Will Fed cut rates at March FOMC?" | Binary | 24h before announcement | Federal Reserve | Genuine disagreement among economists. |
| "Will GTA VI release before July 2026?" | Binary | 24h before July 1 | Rockstar official | Nobody knows the release date. |
| "Will it snow in Austin TX on Feb 28?" | Binary | 24h before Feb 28 | NWS weather.gov | Nature is unpredictable. |
| "Will Drake drop an album before April 1?" | Binary | 24h before deadline | Spotify listing | Degens stalk producer IGs for alpha. |
| "Will Wikipedia lock the [controversial article] before March 15?" | Binary | 24h before deadline | Wikipedia edit history | Public record, unpredictable. |

### BAD Markets (BLOCKED — Do NOT Create)

| Market | Why BLOCKED |
|--------|-------------|
| "Will BTC be above $120K on March 3?" | PRICE PREDICTION. Observable, autocorrelated. Pool rebalances. |
| "Which Solana memecoin gains most this week?" | MEASUREMENT PERIOD. Info accumulates during the week. |
| "How many tokens launch on pump.fun this month?" | MEASUREMENT PERIOD. Observable count. |
| "Will SOL floor price be above 200 on Friday?" | PRICE PREDICTION. Everyone can see the price. |
| "Will an AI agent autonomously purchase proxies?" | SUBJECTIVE + UNVERIFIABLE. No public record. |
| "Will my project go viral?" | SELF-REFERENTIAL + SUBJECTIVE. Creator can influence. |
| "Will someone buy 1000 NFTs this week?" | MANIPULATION RISK. Anyone could do it to win. |
| "Total ETH burned this month" | MEASUREMENT PERIOD. Observable on-chain metric. |
| "Which AI model will be the best by March?" | SUBJECTIVE. Who defines "best"? |
| "Average Solana TPS over the next 7 days" | MEASUREMENT PERIOD. Observable metric. |

---

## PART IX: RESOLUTION PROTOCOL

### Resolution Timing

| Category | Resolve After |
|----------|---------------|
| Sports/MMA | Game/match/fight conclusion |
| Esports | Match/series conclusion (final map played) |
| Awards | Category announced live on broadcast |
| Social media | Verified from public account/page |
| Government | Official announcement/publication |
| Charts/Rankings | Official chart/ranking publication |
| Weather | After the date, verified from official station |
| Products/Tech | Official press release or store listing |

### Dispute Window

All markets have a 6-hour dispute window after oracle proposes resolution. During this window, bettors can challenge the resolution with evidence.

---

## PART X: QUICK REFERENCE CARD

```
ALLOWED:     Event-based markets (Type A) ONLY
BANNED:      Price predictions, measurement periods, subjective outcomes
TIMING:      close_time <= event_time - 24 hours
UNCERTAINTY: Would the pool split 30-70 or closer? If not, don't create it.
SOURCE:      Must use an approved resolution source (Part IV)
SPEED:       Resolve in days, not months. Degens want fast.
FORMAT:      Binary (Yes/No) or Race (2-10 outcomes)
SHAREABILITY: If you can't tweet the question entertainingly, rethink it.
```

### One-Line Test

**"Can a bettor observe or calculate the likely outcome while betting is still open?"**
- YES → BLOCKED
- NO → Proceed with creation

---

*Version 7.0 — February 20, 2026*
*v7.0: Complete rewrite. Banned price/measurement markets. Added degen categories. Strict machine-parseable guardrails. Pool mechanics explained. Decision tree for agents.*

---

## Changelog

### v7.0 (February 20, 2026)
- **BANNED:** All price prediction markets (crypto, stocks, NFTs, commodities)
- **BANNED:** All measurement-period markets (replaced with snapshot/event framing)
- **NEW:** Degen market categories (combat sports, celebrity, absurdist, meme)
- **NEW:** Pool mechanics explanation (why rules exist)
- **NEW:** Decision tree for agents (machine-parseable)
- **NEW:** Uncertainty test (30-70 pool split requirement)
- **NEW:** Degen design principles (speed, shareability, alpha hunting, cultural relevance)
- **NEW:** Expanded blocked terms list (price, measurement, subjective, manipulation)
- **NEW:** Recurring series recommendations
- **IMPROVED:** Chart/ranking markets reframed as Type A snapshots of published results
- **REMOVED:** Type B measurement-period market type (completely banned)
- **REMOVED:** Crypto/DeFi metrics category (banned)
- **REMOVED:** Economic measurement markets (only FOMC-style decisions kept)
