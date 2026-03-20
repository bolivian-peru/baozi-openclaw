import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTestDb } from "../src/db/schema.js";
import { registerAnalyst } from "../src/services/registry.js";
import {
  publishAnalysis,
  discoverAnalyses,
  requestAccess,
  completePurchase,
  getAnalysisById,
  getPurchasesByBuyer,
} from "../src/services/marketplace.js";
import { createReputationRecord } from "../src/services/reputation.js";
import type Database from "better-sqlite3";

// Mock MCP calls to avoid network dependency in tests
vi.mock("../src/utils/mcp.js", () => ({
  fetchMarketTitle: vi.fn().mockResolvedValue("Will BTC break $100k by Q2?"),
  fetchMarketOutcome: vi.fn().mockResolvedValue(undefined),
  fetchActiveMarkets: vi.fn().mockResolvedValue([]),
  getMarketSentiment: vi.fn().mockResolvedValue(null),
}));

// Use simulated payments
process.env.X402_SIMULATE = "true";
process.env.PLATFORM_FEE_RATE = "0.05";
process.env.AFFILIATE_COMMISSION_RATE = "0.10";

const MARKET_PDA = "TEST_MARKET_PDA_111111111111111111111111111";
const BUYER = "BUYER_WALLET_ADDR_111111111111111111111111111";

let db: Database.Database;
let analystId: string;
let affiliateCode: string;

beforeEach(async () => {
  db = getTestDb();
  const analyst = registerAnalyst(db, {
    walletAddress: "ANALYST_WALLET_11111111111111111111111111",
    name: "TestAnalyst",
    description: "Test analyst",
  });
  analystId = analyst.id;
  affiliateCode = analyst.affiliateCode;
});

describe("publishAnalysis", () => {
  it("creates an analysis with paywall", async () => {
    const a = await publishAnalysis(db, {
      analystId,
      marketPda: MARKET_PDA,
      title: "Test Analysis",
      preview: "This is a short teaser.",
      thesis: "Full detailed thesis goes here.",
      predictedSide: "YES",
      confidence: 75,
      priceInSol: 0.001,
    });

    expect(a.id).toBeTruthy();
    expect(a.predictedSide).toBe("YES");
    expect(a.confidence).toBe(75);
    expect(a.priceInSol).toBe(0.001);
    expect(a.isActive).toBe(true);
    expect(a.purchaseCount).toBe(0);
  });

  it("enriches with market title from MCP", async () => {
    const a = await publishAnalysis(db, {
      analystId,
      marketPda: MARKET_PDA,
      title: "BTC Analysis",
      preview: "Short preview.",
      thesis: "Full thesis.",
      predictedSide: "NO",
      confidence: 60,
      priceInSol: 0.0005,
    });
    expect(a.marketTitle).toBe("Will BTC break $100k by Q2?");
  });

  it("rejects preview longer than 280 chars", async () => {
    await expect(
      publishAnalysis(db, {
        analystId,
        marketPda: MARKET_PDA,
        title: "Test",
        preview: "X".repeat(281),
        thesis: "Full thesis.",
        predictedSide: "YES",
        confidence: 50,
        priceInSol: 0.001,
      })
    ).rejects.toThrow("280 characters");
  });

  it("rejects invalid confidence values", async () => {
    await expect(
      publishAnalysis(db, {
        analystId,
        marketPda: MARKET_PDA,
        title: "Test",
        preview: "ok",
        thesis: "ok",
        predictedSide: "YES",
        confidence: 150,
        priceInSol: 0.001,
      })
    ).rejects.toThrow("Confidence");
  });

  it("rejects zero price", async () => {
    await expect(
      publishAnalysis(db, {
        analystId,
        marketPda: MARKET_PDA,
        title: "Test",
        preview: "ok",
        thesis: "ok",
        predictedSide: "YES",
        confidence: 50,
        priceInSol: 0,
      })
    ).rejects.toThrow("Price");
  });
});

describe("discoverAnalyses", () => {
  it("returns all active analyses", async () => {
    await publishAnalysis(db, {
      analystId,
      marketPda: MARKET_PDA,
      title: "Analysis 1",
      preview: "Preview 1",
      thesis: "Thesis 1",
      predictedSide: "YES",
      confidence: 70,
      priceInSol: 0.001,
    });
    await publishAnalysis(db, {
      analystId,
      marketPda: MARKET_PDA,
      title: "Analysis 2",
      preview: "Preview 2",
      thesis: "Thesis 2",
      predictedSide: "NO",
      confidence: 60,
      priceInSol: 0.002,
    });

    const listings = discoverAnalyses(db);
    expect(listings.length).toBe(2);
    // Thesis should NOT be in listing (paywall)
    for (const l of listings) {
      expect((l as any).thesis).toBeUndefined();
    }
  });

  it("filters by market PDA", async () => {
    await publishAnalysis(db, {
      analystId,
      marketPda: MARKET_PDA,
      title: "On-market",
      preview: "p",
      thesis: "t",
      predictedSide: "YES",
      confidence: 60,
      priceInSol: 0.001,
    });
    await publishAnalysis(db, {
      analystId,
      marketPda: "OTHER_MARKET_PDA_111111111111111111111111",
      title: "Off-market",
      preview: "p",
      thesis: "t",
      predictedSide: "NO",
      confidence: 60,
      priceInSol: 0.001,
    });

    const listings = discoverAnalyses(db, { marketPda: MARKET_PDA });
    expect(listings.length).toBe(1);
    expect(listings[0].title).toBe("On-market");
  });

  it("filters by minimum confidence", async () => {
    await publishAnalysis(db, {
      analystId,
      marketPda: MARKET_PDA,
      title: "High confidence",
      preview: "p",
      thesis: "t",
      predictedSide: "YES",
      confidence: 85,
      priceInSol: 0.001,
    });
    await publishAnalysis(db, {
      analystId,
      marketPda: MARKET_PDA,
      title: "Low confidence",
      preview: "p",
      thesis: "t",
      predictedSide: "YES",
      confidence: 50,
      priceInSol: 0.001,
    });

    const listings = discoverAnalyses(db, { minConfidence: 80 });
    expect(listings.length).toBe(1);
    expect(listings[0].title).toBe("High confidence");
  });

  it("filters by max price", async () => {
    await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "Cheap", preview: "p", thesis: "t",
      predictedSide: "YES", confidence: 60, priceInSol: 0.0005,
    });
    await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "Expensive", preview: "p", thesis: "t",
      predictedSide: "YES", confidence: 60, priceInSol: 0.05,
    });

    const listings = discoverAnalyses(db, { maxPrice: 0.001 });
    expect(listings.length).toBe(1);
    expect(listings[0].title).toBe("Cheap");
  });

  it("filters by predicted side", async () => {
    await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "Bull", preview: "p", thesis: "t",
      predictedSide: "YES", confidence: 70, priceInSol: 0.001,
    });
    await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "Bear", preview: "p", thesis: "t",
      predictedSide: "NO", confidence: 65, priceInSol: 0.001,
    });

    const yesOnly = discoverAnalyses(db, { predictedSide: "YES" });
    expect(yesOnly.every((l) => l.predictedSide === "YES")).toBe(true);
  });

  it("filters by tags", async () => {
    await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "Tagged", preview: "p", thesis: "t",
      predictedSide: "YES", confidence: 60, priceInSol: 0.001, tags: ["bitcoin", "whale"],
    });
    await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "Untagged", preview: "p", thesis: "t",
      predictedSide: "YES", confidence: 60, priceInSol: 0.001, tags: [],
    });

    const btcOnly = discoverAnalyses(db, { tags: ["bitcoin"] });
    expect(btcOnly.length).toBe(1);
    expect(btcOnly[0].title).toBe("Tagged");
  });
});

describe("requestAccess", () => {
  it("returns 402 for unpurchased analysis", async () => {
    const a = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "t", preview: "p", thesis: "full",
      predictedSide: "YES", confidence: 70, priceInSol: 0.001,
    });

    const result = requestAccess(db, a.id, BUYER);
    expect(result.status).toBe(402);
    expect(result.payment).toBeDefined();
    expect(result.payment?.payment.amount).toBe(0.001);
  });

  it("returns 200 after purchase", async () => {
    const a = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "t", preview: "p", thesis: "full thesis here",
      predictedSide: "YES", confidence: 70, priceInSol: 0.001,
    });

    await completePurchase(db, { analysisId: a.id, buyerWallet: BUYER });

    const result = requestAccess(db, a.id, BUYER);
    expect(result.status).toBe(200);
    expect(result.analysis?.thesis).toBe("full thesis here");
  });

  it("includes affiliate breakdown in 402 response", async () => {
    const referrer = registerAnalyst(db, {
      walletAddress: "REFERRER_WALLET_11111111111111111111111",
      name: "Referrer",
      description: "",
    });
    const a = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "t", preview: "p", thesis: "full",
      predictedSide: "YES", confidence: 70, priceInSol: 0.001,
    });

    const result = requestAccess(db, a.id, BUYER, referrer.affiliateCode);
    expect(result.status).toBe(402);
    expect(result.payment?.payment.breakdown.affiliateCommission).toBeGreaterThan(0);
  });
});

describe("completePurchase", () => {
  it("processes x402 payment and returns full thesis", async () => {
    const a = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "BTC Analysis", preview: "Short preview",
      thesis: "FULL DETAILED THESIS WITH ALL THE ALPHA",
      predictedSide: "YES", confidence: 80, priceInSol: 0.001,
    });

    const { purchase, analysis } = await completePurchase(db, {
      analysisId: a.id,
      buyerWallet: BUYER,
    });

    expect(purchase.txSignature).toBeTruthy();
    expect(purchase.simulated).toBe(true);
    expect(purchase.amountSol).toBe(0.001);
    expect(purchase.platformFee).toBeCloseTo(0.00005);
    expect(analysis.thesis).toBe("FULL DETAILED THESIS WITH ALL THE ALPHA");
  });

  it("increments purchase count on analysis", async () => {
    const a = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "t", preview: "p", thesis: "full",
      predictedSide: "YES", confidence: 70, priceInSol: 0.001,
    });

    await completePurchase(db, { analysisId: a.id, buyerWallet: "BUYER_1111111111111111111111111111111111" });
    await completePurchase(db, { analysisId: a.id, buyerWallet: "BUYER_2222222222222222222222222222222222" });

    const updated = getAnalysisById(db, a.id);
    expect(updated?.purchaseCount).toBe(2);
  });

  it("is idempotent — does not double-charge on re-purchase", async () => {
    const a = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "t", preview: "p", thesis: "full",
      predictedSide: "YES", confidence: 70, priceInSol: 0.001,
    });

    const { purchase: p1 } = await completePurchase(db, { analysisId: a.id, buyerWallet: BUYER });
    const { purchase: p2 } = await completePurchase(db, { analysisId: a.id, buyerWallet: BUYER });

    expect(p1.id).toBe(p2.id);
    expect(getAnalysisById(db, a.id)?.purchaseCount).toBe(1);
  });

  it("records affiliate commission when code provided", async () => {
    const aff = registerAnalyst(db, {
      walletAddress: "AFF_WALLET_1111111111111111111111111111111",
      name: "Affiliate",
      description: "",
    });
    const a = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "t", preview: "p", thesis: "full",
      predictedSide: "YES", confidence: 70, priceInSol: 0.01,
    });

    const { purchase } = await completePurchase(db, {
      analysisId: a.id,
      buyerWallet: BUYER,
      affiliateCode: aff.affiliateCode,
    });

    expect(purchase.affiliateCode).toBe(aff.affiliateCode);
    expect(purchase.affiliateCommission).toBeCloseTo(0.001); // 10% of 0.01
  });

  it("accepts pre-verified payment tx", async () => {
    const a = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "t", preview: "p", thesis: "full",
      predictedSide: "YES", confidence: 70, priceInSol: 0.001,
    });

    // First get a simulated tx
    const { purchase: p1 } = await completePurchase(db, { analysisId: a.id, buyerWallet: BUYER });
    const txSig = p1.txSignature;

    // A different buyer uses the tx — should fail verification (wrong analysisId)
    const a2 = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "t2", preview: "p", thesis: "full2",
      predictedSide: "NO", confidence: 60, priceInSol: 0.001,
    });

    await expect(
      completePurchase(db, {
        analysisId: a2.id,
        buyerWallet: "DIFFERENT_BUYER_11111111111111111111111111",
        paymentTx: txSig,
      })
    ).rejects.toThrow("Invalid or mismatched payment transaction");
  });
});

describe("getPurchasesByBuyer", () => {
  it("returns purchases for a buyer", async () => {
    const a1 = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "A1", preview: "p", thesis: "t",
      predictedSide: "YES", confidence: 70, priceInSol: 0.001,
    });
    const a2 = await publishAnalysis(db, {
      analystId, marketPda: MARKET_PDA, title: "A2", preview: "p", thesis: "t",
      predictedSide: "NO", confidence: 60, priceInSol: 0.001,
    });

    await completePurchase(db, { analysisId: a1.id, buyerWallet: BUYER });
    await completePurchase(db, { analysisId: a2.id, buyerWallet: BUYER });

    const purchases = getPurchasesByBuyer(db, BUYER);
    expect(purchases.length).toBe(2);
  });
});
