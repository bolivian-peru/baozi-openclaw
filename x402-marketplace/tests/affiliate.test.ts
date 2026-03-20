import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTestDb } from "../src/db/schema.js";
import { registerAnalyst } from "../src/services/registry.js";
import { publishAnalysis, completePurchase } from "../src/services/marketplace.js";
import {
  recordAffiliateCommission,
  recordAnalystReferral,
  getAffiliateStats,
  getAffiliateRecords,
} from "../src/services/affiliate.js";
import type Database from "better-sqlite3";

vi.mock("../src/utils/mcp.js", () => ({
  fetchMarketTitle: vi.fn().mockResolvedValue(undefined),
  fetchMarketOutcome: vi.fn().mockResolvedValue(undefined),
  fetchActiveMarkets: vi.fn().mockResolvedValue([]),
  getMarketSentiment: vi.fn().mockResolvedValue(null),
}));

process.env.X402_SIMULATE = "true";
process.env.AFFILIATE_COMMISSION_RATE = "0.10";
process.env.PLATFORM_FEE_RATE = "0.05";

const MARKET_PDA = "AFF_TEST_MARKET_11111111111111111111111111";
const BUYER = "AFF_BUYER_WALLET_1111111111111111111111111";

let db: Database.Database;
let analyst: ReturnType<typeof registerAnalyst>;
let affiliate: ReturnType<typeof registerAnalyst>;

beforeEach(() => {
  db = getTestDb();
  analyst = registerAnalyst(db, {
    walletAddress: "AFF_ANALYST_WALLET_1111111111111111111111",
    name: "Analyst",
    description: "",
  });
  affiliate = registerAnalyst(db, {
    walletAddress: "AFF_AFFILIATE_WALLET_111111111111111111111",
    name: "Affiliate",
    description: "",
  });
});

describe("recordAffiliateCommission", () => {
  it("records a commission entry", () => {
    const record = recordAffiliateCommission(db, {
      affiliateCode: affiliate.affiliateCode,
      affiliateWallet: affiliate.walletAddress,
      purchaseId: "purchase-abc",
      commission: 0.001,
    });

    expect(record.id).toBeTruthy();
    expect(record.affiliateCode).toBe(affiliate.affiliateCode);
    expect(record.commission).toBe(0.001);
    expect(record.purchaseId).toBe("purchase-abc");
  });
});

describe("recordAnalystReferral", () => {
  it("records analyst referral with zero commission", () => {
    const record = recordAnalystReferral(db, {
      affiliateCode: affiliate.affiliateCode,
      affiliateWallet: affiliate.walletAddress,
      referredAnalystId: analyst.id,
    });

    expect(record.referredAnalystId).toBe(analyst.id);
    expect(record.commission).toBe(0);
  });
});

describe("getAffiliateStats", () => {
  it("returns null for unknown affiliate code", () => {
    expect(getAffiliateStats(db, "UNKNOWN-CODE")).toBeNull();
  });

  it("counts total referrals correctly", () => {
    const newAnalyst = registerAnalyst(db, {
      walletAddress: "NEW_ANALYST_WALLET_111111111111111111111",
      name: "New",
      description: "",
    });

    recordAnalystReferral(db, {
      affiliateCode: affiliate.affiliateCode,
      affiliateWallet: affiliate.walletAddress,
      referredAnalystId: newAnalyst.id,
    });

    const stats = getAffiliateStats(db, affiliate.affiliateCode);
    expect(stats).not.toBeNull();
    expect(stats!.totalReferrals).toBe(1);
  });

  it("sums total commissions earned", () => {
    recordAffiliateCommission(db, {
      affiliateCode: affiliate.affiliateCode,
      affiliateWallet: affiliate.walletAddress,
      purchaseId: "purchase-1",
      commission: 0.001,
    });
    recordAffiliateCommission(db, {
      affiliateCode: affiliate.affiliateCode,
      affiliateWallet: affiliate.walletAddress,
      purchaseId: "purchase-2",
      commission: 0.002,
    });

    const stats = getAffiliateStats(db, affiliate.affiliateCode);
    expect(stats!.totalCommissions).toBeCloseTo(0.003);
  });
});

describe("affiliate integration via completePurchase", () => {
  it("records affiliate commission automatically on purchase", async () => {
    const a = await publishAnalysis(db, {
      analystId: analyst.id,
      marketPda: MARKET_PDA,
      title: "Test",
      preview: "Short preview",
      thesis: "Full thesis",
      predictedSide: "YES",
      confidence: 70,
      priceInSol: 0.01,
    });

    const { purchase } = await completePurchase(db, {
      analysisId: a.id,
      buyerWallet: BUYER,
      affiliateCode: affiliate.affiliateCode,
    });

    expect(purchase.affiliateCode).toBe(affiliate.affiliateCode);
    expect(purchase.affiliateCommission).toBeCloseTo(0.001); // 10% of 0.01

    const stats = getAffiliateStats(db, affiliate.affiliateCode);
    expect(stats!.totalCommissions).toBeCloseTo(0.001);
  });

  it("does not record commission for unknown affiliate code", async () => {
    const a = await publishAnalysis(db, {
      analystId: analyst.id,
      marketPda: MARKET_PDA,
      title: "Test",
      preview: "p",
      thesis: "t",
      predictedSide: "YES",
      confidence: 70,
      priceInSol: 0.01,
    });

    const { purchase } = await completePurchase(db, {
      analysisId: a.id,
      buyerWallet: BUYER,
      affiliateCode: "UNKNOWN-XYZ",
    });

    // Unknown code means no affiliate wallet found → no commission
    expect(purchase.affiliateCommission).toBe(0);
  });
});

describe("getAffiliateRecords", () => {
  it("returns all records for a code", () => {
    recordAffiliateCommission(db, {
      affiliateCode: affiliate.affiliateCode,
      affiliateWallet: affiliate.walletAddress,
      purchaseId: "p1",
      commission: 0.001,
    });
    recordAffiliateCommission(db, {
      affiliateCode: affiliate.affiliateCode,
      affiliateWallet: affiliate.walletAddress,
      purchaseId: "p2",
      commission: 0.002,
    });

    const records = getAffiliateRecords(db, affiliate.affiliateCode);
    expect(records.length).toBe(2);
  });
});
