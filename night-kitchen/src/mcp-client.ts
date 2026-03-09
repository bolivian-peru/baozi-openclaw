import { listMarkets as rawListMarkets } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import type { Market } from "./types.js";

export async function listActiveMarkets(limit = 8): Promise<Market[]> {
  const rawMarkets = await rawListMarkets("active");
  if (!Array.isArray(rawMarkets)) {
    return [];
  }

  return rawMarkets
    .map(normalizeMarket)
    .filter((market): market is Market => Boolean(market))
    .slice(0, limit);
}

function normalizeMarket(raw: any): Market | null {
  if (!raw?.publicKey || !raw?.question) {
    return null;
  }

  const yesPool = Number(raw.yesPoolSol ?? 0);
  const noPool = Number(raw.noPoolSol ?? 0);
  const totalPool = Number(raw.totalPoolSol ?? yesPool + noPool);
  const yesProbability =
    raw.yesPercent !== undefined ? Number(raw.yesPercent) / 100 : totalPool > 0 ? yesPool / totalPool : 0.5;
  const noProbability =
    raw.noPercent !== undefined ? Number(raw.noPercent) / 100 : totalPool > 0 ? noPool / totalPool : 0.5;

  return {
    pda: String(raw.publicKey),
    question: String(raw.question),
    closingTime: String(raw.closeTimeIso ?? raw.closeTime ?? new Date(Date.now() + 86400000).toISOString()),
    pool: {
      total: totalPool
    },
    outcomes: [
      { index: 0, label: "Yes", probability: yesProbability, pool: yesPool },
      { index: 1, label: "No", probability: noProbability, pool: noPool }
    ]
  };
}
