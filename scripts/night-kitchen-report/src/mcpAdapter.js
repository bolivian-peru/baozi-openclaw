/**
 * Adapter for @baozi.bet/mcp-server compatible data access.
 *
 * MVP behavior:
 * - If BAOZI_API_BASE is provided, fetches from `${base}/api/mcp/list_markets` (JSON).
 * - Otherwise falls back to deterministic mock data (works without keys/network).
 */

const MOCK_MARKETS = [
  {
    id: "m1",
    question: "will btc hit $110k by april 1?",
    yes: 0.58,
    no: 0.42,
    poolSol: 32.4,
    closesInHours: 240,
    resolved: false
  },
  {
    id: "m2",
    question: "who wins nba all-star mvp?",
    outcomes: [
      ["lebron", 0.35],
      ["tatum", 0.28],
      ["jokic", 0.22],
      ["other", 0.15]
    ],
    poolSol: 18.7,
    closesInHours: 48,
    resolved: false
  },
  {
    id: "m3",
    question: "will sol close above $220 this week?",
    yes: 0.51,
    no: 0.49,
    poolSol: 61.2,
    closesInHours: 8,
    resolved: false
  }
];

export async function listMarkets() {
  const base = process.env.BAOZI_API_BASE;
  if (!base) return MOCK_MARKETS;

  const url = `${base.replace(/\/$/, "")}/api/mcp/list_markets`;
  const res = await fetch(url, { headers: { "content-type": "application/json" } });
  if (!res.ok) throw new Error(`failed list_markets: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.markets)) throw new Error("invalid list_markets response");
  return data.markets;
}
