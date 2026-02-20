# PR #28 — AgentBook Pundit Fix Notes

## What was fixed

### 1) Golden-rule compliance (open markets = factual only)
- Reworked posting logic so **all open-market content is odds/facts only**.
- Removed predictive framing for open markets (no "likely to win", "value", "contrarian play" language).
- Added explicit guardrail text in posts: `No prediction included (open market guardrail).`
- Added `generateResolvedRecap()` for **closed/resolved markets only**, where analysis is allowed.

Files:
- `src/analyst.ts`
- `src/baozi-api.ts`
- `src/index.ts`

### 2) Affiliate support
- Added affiliate config:
  - `AFFILIATE_CODE`
  - `AFFILIATE_QUERY_PARAM` (default `ref`)
- All shared market links now include affiliate param when code is set.

Files:
- `src/config.ts`
- `src/analyst.ts`
- `.env.example`

### 3) CreatorProfile + Affiliate registration scripts
- Hardened `create-profile.ts` JSON parsing from MCP responses.
- Added new `register-affiliate.ts` script using `build_register_affiliate_transaction`.
- Added npm script:
  - `npm run affiliate -- <CODE>`

Files:
- `src/create-profile.ts`
- `src/register-affiliate.ts`
- `package.json`

### 4) .env.example correctness
- Kept API URL as `https://baozi.bet/api` (correct endpoint)
- Added affiliate env vars.

File:
- `.env.example`

## 48h live-proof status (based on current runtime logs)

AgentBook URL:
- https://baozi.bet/agentbook

Current observed posts in local runtime log (`posts.log`):
- 2026-02-17 21:55 UTC — Post #1
- 2026-02-18 00:00 UTC — Post #2
- 2026-02-19 12:00 UTC — Post #1 (after restart)
- 2026-02-19 15:00 UTC — Post #2

Observed sample post snippets with context from `posts.log`:
1. `📊 Market Roundup ... "Will @baozibet tweet a pizza emoji by March 1?..."`
2. `📈 Strong Consensus: "Will @baozibet tweet a pizza emoji by March 1?..."`
3. `Baozi Roundup: Pizza tweet at 100%?... "Sinners" BAFTA odds are 50/50...`
4. `🍕 Tweet by March 1st? 100% YES odds smell fishy...`

⚠️ Note: snippets #3/#4 show predictive tone from old logic; the new code in this PR removes that behavior for open markets.

## Remaining operational step
- Restart service so running process picks up new guardrail code.
- Verify new posts on AgentBook are factual-only for open markets.

## Shell/process tool blocker encountered
In this subagent environment, command execution could not be started because no process session could be created.

Attempts made:
- `process(action=list)` → returns no sessions.
- `process(action=submit, sessionId=<id>, data='pwd')` → `No active session found`.
- `process(action=start, sessionId='test-shell', data='bash')` → `Unknown action start`.
- `process(action=exec, ...)` without session → `sessionId is required`.

Conclusion: this runtime appears to allow only interaction with **already-existing** process sessions, but not creating new ones.
