import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTestDb } from "../src/db/schema.js";
import { registerAnalyst } from "../src/services/registry.js";
import { publishAnalysis } from "../src/services/marketplace.js";
import {
  createReputationRecord,
  resolveReputationRecord,
  getAnalystStats,
  getReputationRecords,
  getLeaderboard,
} from "../src/services/reputation.js";
import type Database from "better-sqlite3";

vi.mock("../src/utils/mcp.js", () => ({
  fetchMarketTitle: vi.fn().mockResolvedValue(undefined),
  fetchMarketOutcome: vi.fn().mockResolvedValue(undefined),
  fetchActiveMarkets: vi.fn().mockResolvedValue([]),
  getMarketSentiment: vi.fn().mockResolvedValue(null),
}));

process.env.X402_SIMULATE = "true";

const MARKET_PDA = "REP_TEST_MARKET_11111111111111111111111111";

let db: Database.Database;
let analystId: string;

beforeEach(async () => {
  db = getTestDb();
  const analyst = registerAnalyst(db, {
    walletAddress: "REP_ANALYST_WALLET_111111111111111111111111",
    name: "RepBot",
    description: "",
  });
  analystId = analyst.id;
});

async function createAndTrackAnalysis(
  side: "YES" | "NO",
  confidence: number
): Promise<string> {
  const a = await publishAnalysis(db, {
    analystId,
    marketPda: MARKET_PDA,
    title: `Analysis ${Date.now()}`,
    preview: "Short preview",
    thesis: "Full thesis",
    predictedSide: side,
    confidence,
    priceInSol: 0.001,
  });
  createReputationRecord(db, {
    analystId,
    analysisId: a.id,
    marketPda: MARKET_PDA,
    predictedSide: side,
    confidence,
  });
  return a.id;
}

describe("createReputationRecord", () => {
  it("creates a pending reputation record", async () => {
    const analysisId = await createAndTrackAnalysis("YES", 75);
    const records = getReputationRecords(db, analystId);
    expect(records.length).toBe(1);
    expect(records[0].analysisId).toBe(analysisId);
    expect(records[0].wasCorrect).toBeUndefined();
    expect(records[0].actualOutcome).toBeUndefined();
  });
});

describe("resolveReputationRecord", () => {
  it("marks prediction as correct when outcome matches", async () => {
    const analysisId = await createAndTrackAnalysis("YES", 80);
    const record = resolveReputationRecord(db, analysisId, "YES");
    expect(record).not.toBeNull();
    expect(record!.wasCorrect).toBe(true);
    expect(record!.actualOutcome).toBe("YES");
    expect(record!.resolvedAt).toBeTruthy();
  });

  it("marks prediction as incorrect when outcome differs", async () => {
    const analysisId = await createAndTrackAnalysis("YES", 80);
    const record = resolveReputationRecord(db, analysisId, "NO");
    expect(record!.wasCorrect).toBe(false);
  });

  it("returns null for unknown analysis ID", () => {
    const record = resolveReputationRecord(db, "nonexistent-id", "YES");
    expect(record).toBeNull();
  });
});

describe("getAnalystStats", () => {
  it("returns zero stats for new analyst", () => {
    const stats = getAnalystStats(db, analystId);
    expect(stats.totalAnalyses).toBe(0);
    expect(stats.resolvedAnalyses).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.reputationScore).toBe(0);
  });

  it("computes win rate correctly", async () => {
    const ids = await Promise.all([
      createAndTrackAnalysis("YES", 80),
      createAndTrackAnalysis("YES", 70),
      createAndTrackAnalysis("NO", 60),
      createAndTrackAnalysis("YES", 75),
    ]);

    // 3 out of 4 correct
    resolveReputationRecord(db, ids[0], "YES"); // correct
    resolveReputationRecord(db, ids[1], "YES"); // correct
    resolveReputationRecord(db, ids[2], "YES"); // incorrect (predicted NO)
    resolveReputationRecord(db, ids[3], "YES"); // correct

    const stats = getAnalystStats(db, analystId);
    expect(stats.resolvedAnalyses).toBe(4);
    expect(stats.correctPredictions).toBe(3);
    expect(stats.winRate).toBeCloseTo(0.75);
  });

  it("builds composite reputation score", async () => {
    // Create 10 resolved predictions, all correct (high win rate)
    const ids = await Promise.all(
      Array.from({ length: 10 }, () => createAndTrackAnalysis("YES", 80))
    );
    for (const id of ids) {
      resolveReputationRecord(db, id, "YES");
    }

    const stats = getAnalystStats(db, analystId);
    expect(stats.reputationScore).toBeGreaterThan(50);
    expect(stats.winRate).toBe(1.0);
  });

  it("includes total earnings from purchases", async () => {
    const { completePurchase } = await import("../src/services/marketplace.js");
    const a = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "t", preview: "p", thesis: "full",
      predictedSide: "YES", confidence: 70, priceInSol: 0.01,
    });

    await completePurchase(db, { analysisId: a.id, buyerWallet: "BUYER_EARNINGS_1111111111111111111111" });

    const stats = getAnalystStats(db, analystId);
    // After 5% platform fee: 0.01 * 0.95 = 0.0095
    expect(stats.totalEarnings).toBeGreaterThan(0);
    expect(stats.totalPurchases).toBe(1);
  });
});

describe("getLeaderboard", () => {
  it("orders analysts by reputation score descending", async () => {
    // Create a second analyst with lower performance
    const poorAnalyst = registerAnalyst(db, {
      walletAddress: "POOR_ANALYST_WALLET_11111111111111111111111",
      name: "PoorBot",
      description: "",
    });

    // Give first analyst 5 correct predictions
    const ids = await Promise.all(
      Array.from({ length: 5 }, () => createAndTrackAnalysis("YES", 80))
    );
    for (const id of ids) resolveReputationRecord(db, id, "YES");

    // Give second analyst 5 incorrect predictions
    for (let i = 0; i < 5; i++) {
      const a = await publishAnalysis(db, {
        analystId: poorAnalyst.id,
        marketPda: MARKET_PDA,
        title: `Poor Analysis ${i}`,
        preview: "p",
        thesis: "t",
        predictedSide: "YES",
        confidence: 60,
        priceInSol: 0.001,
      });
      createReputationRecord(db, {
        analystId: poorAnalyst.id,
        analysisId: a.id,
        marketPda: MARKET_PDA,
        predictedSide: "YES",
        confidence: 60,
      });
      resolveReputationRecord(db, a.id, "NO"); // all wrong
    }

    const board = getLeaderboard(db, 10);
    expect(board.length).toBe(2);
    expect(board[0].reputationScore).toBeGreaterThanOrEqual(board[1].reputationScore);
    expect(board[0].analystName).toBe("RepBot");
  });

  it("respects limit parameter", async () => {
    for (let i = 0; i < 5; i++) {
      registerAnalyst(db, {
        walletAddress: `EXTRA_ANALYST_WALLET_${i.toString().padStart(30, "0")}`,
        name: `ExtraBot${i}`,
        description: "",
      });
    }
    const board = getLeaderboard(db, 3);
    expect(board.length).toBe(3);
  });
});
