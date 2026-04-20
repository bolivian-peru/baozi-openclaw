import type { ProofApiResponse, ProofBatch, MarketSnapshot } from "../types.ts";
import { inferClosingLabel, pseudoOdds } from "../lib/utils.ts";

const PROOFS_API = "https://baozi.bet/api/agents/proofs";

export async function fetchProofBatches(limit = 2): Promise<ProofBatch[]> {
  const response = await fetch(PROOFS_API, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Failed to fetch proofs: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as ProofApiResponse;
  if (!payload.success || !Array.isArray(payload.proofs)) {
    throw new Error("Invalid proofs payload");
  }

  return payload.proofs.slice(0, limit);
}

export function toSnapshots(batch: ProofBatch, limit = 4): MarketSnapshot[] {
  return batch.markets.slice(0, limit).map((market) => {
    const odds = pseudoOdds(market.question);
    return {
      question: market.question,
      yesPercent: odds.yes,
      noPercent: odds.no,
      poolSol: odds.pool,
      closingLabel: inferClosingLabel(batch.date),
      category: batch.category,
    };
  });
}
