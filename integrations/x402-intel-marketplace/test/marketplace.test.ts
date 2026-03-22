/**
 * x402 Intel Marketplace — Unit Tests
 */
import { describe, it, expect, beforeEach } from "@jest/globals";
import { Marketplace } from "../src/marketplace.js";
import type { AnalystProfile, IntelListing } from "../src/types.js";

const TEST_WALLET = "ANALYST11111111111111111111111111111111111";
const BUYER_WALLET = "BUYER111111111111111111111111111111111111";
const TEST_MARKET_PDA = "MARKET111111111111111111111111111111111111";

const VALID_THESIS =
  "This is a valid thesis with sufficient length. The market dynamics suggest " +
  "a strong upward trend driven by on-chain accumulation patterns. Whale wallets " +
  "have been steadily building positions over the last 72 hours, and the pool " +
  "composition has shifted significantly toward the YES outcome. Historical " +
  "precedent from similar markets indicates 78% resolution accuracy for these signals.";

function makeMarketplace(): Marketplace {
  return new Marketplace({
    dataDir: `/tmp/test-marketplace-${Date.now()}`,
    simulatePayments: true,
  });
}

describe("Analyst Registration", () => {
  it("registers a new analyst", () => {
    const market = makeMarketplace();
    const analyst = market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "TestOracle",
      affiliateCode: "TESTOR",
    });

    expect(analyst.wallet).toBe(TEST_WALLET);
    expect(analyst.displayName).toBe("TestOracle");
    expect(analyst.affiliateCode).toBe("TESTOR");
    expect(analyst.tier).toBe("novice");
    expect(analyst.totalPredictions).toBe(0);
    expect(analyst.accuracy).toBe(0);
  });

  it("updates existing analyst display name", () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "OldName",
      affiliateCode: "CODE1",
    });
    const updated = market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "NewName",
      affiliateCode: "CODE2",
    });

    expect(updated.displayName).toBe("NewName");
    expect(updated.affiliateCode).toBe("CODE2");
  });

  it("retrieves analyst by wallet", () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "TestOracle",
      affiliateCode: "TEST",
    });

    const fetched = market.getAnalyst(TEST_WALLET);
    expect(fetched).toBeDefined();
    expect(fetched?.wallet).toBe(TEST_WALLET);
  });
});

describe("Publishing Intel", () => {
  it("publishes valid analysis", async () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "TestOracle",
      affiliateCode: "TEST",
    });

    const result = await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 75,
      priceSOL: 0.01,
      teaser: "Strong signals for YES resolution",
      thesis: VALID_THESIS,
    });

    expect(result.success).toBe(true);
    expect(result.intel).toBeDefined();
    expect(result.intel?.predictedOutcome).toBe("Yes");
    expect(result.intel?.confidence).toBe(75);
    expect(result.intel?.priceSOL).toBe(0.01);
    expect(result.intel?.salesCount).toBe(0);
    expect(result.intel?.affiliateCode).toBe("TEST");
  });

  it("rejects unregistered analyst", async () => {
    const market = makeMarketplace();
    const result = await market.publishIntel({
      analystWallet: "UNREGISTERED",
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 75,
      priceSOL: 0.01,
      teaser: "Teaser",
      thesis: VALID_THESIS,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not registered");
  });

  it("rejects invalid confidence (out of range)", async () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "T",
      affiliateCode: "T",
    });

    const r1 = await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 0,
      priceSOL: 0.01,
      teaser: "Teaser",
      thesis: VALID_THESIS,
    });
    expect(r1.success).toBe(false);

    const r2 = await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 101,
      priceSOL: 0.01,
      teaser: "Teaser",
      thesis: VALID_THESIS,
    });
    expect(r2.success).toBe(false);
  });

  it("rejects thesis that is too short", async () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "T",
      affiliateCode: "T",
    });

    const result = await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 50,
      priceSOL: 0.01,
      teaser: "Short thesis",
      thesis: "Too short",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Thesis must be between");
  });
});

describe("Marketplace Listings", () => {
  it("lists published intel without thesis", async () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "Oracle",
      affiliateCode: "ORC",
    });
    await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 80,
      priceSOL: 0.01,
      teaser: "Market teaser",
      thesis: VALID_THESIS,
    });

    const listings = market.listIntel();
    expect(listings.length).toBeGreaterThan(0);

    const listing = listings[0];
    expect(listing.analystName).toBe("Oracle");
    expect(listing.teaser).toBe("Market teaser");
    // Thesis should NOT be in the listing
    expect((listing as any).thesis).toBeUndefined();
  });

  it("filters by minimum confidence", async () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "Oracle",
      affiliateCode: "ORC",
    });

    await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA + "1",
      predictedOutcome: "Yes",
      confidence: 50,
      priceSOL: 0.01,
      teaser: "Low confidence",
      thesis: VALID_THESIS,
    });
    await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA + "2",
      predictedOutcome: "No",
      confidence: 90,
      priceSOL: 0.01,
      teaser: "High confidence",
      thesis: VALID_THESIS,
    });

    const highOnly = market.listIntel({ minConfidence: 80 });
    expect(highOnly.length).toBe(1);
    expect(highOnly[0].confidence).toBe(90);
  });
});

describe("x402 Purchase Flow", () => {
  it("completes purchase with simulated payment", async () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "Oracle",
      affiliateCode: "ORC",
    });

    const pubResult = await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 80,
      priceSOL: 0.01,
      teaser: "Teaser",
      thesis: VALID_THESIS,
    });

    expect(pubResult.success).toBe(true);
    const intelId = pubResult.intel!.id;

    // First purchase — should succeed with simulated payment
    const buyResult = await market.purchaseIntel({
      intelId,
      buyerWallet: BUYER_WALLET,
    });

    expect(buyResult.success).toBe(true);
    expect(buyResult.intel?.thesis).toBe(VALID_THESIS);
    expect(buyResult.intel?.affiliateUrl).toContain(TEST_MARKET_PDA);
    expect(buyResult.intel?.affiliateUrl).toContain("ORC");
  });

  it("returns thesis on second purchase without re-paying", async () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "Oracle",
      affiliateCode: "ORC",
    });

    const pubResult = await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 80,
      priceSOL: 0.01,
      teaser: "Teaser",
      thesis: VALID_THESIS,
    });

    const intelId = pubResult.intel!.id;

    await market.purchaseIntel({ intelId, buyerWallet: BUYER_WALLET });
    const secondBuy = await market.purchaseIntel({
      intelId,
      buyerWallet: BUYER_WALLET,
    });

    expect(secondBuy.success).toBe(true);
    expect(secondBuy.intel?.thesis).toBe(VALID_THESIS);
  });

  it("credits analyst earnings on purchase", async () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "Oracle",
      affiliateCode: "ORC",
    });

    const pubResult = await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 80,
      priceSOL: 0.05,
      teaser: "Teaser",
      thesis: VALID_THESIS,
    });

    await market.purchaseIntel({
      intelId: pubResult.intel!.id,
      buyerWallet: BUYER_WALLET,
    });

    const analyst = market.getAnalyst(TEST_WALLET);
    expect(analyst?.totalEarnings).toBe(0.05);
  });
});

describe("Reputation Tracking", () => {
  it("updates reputation when intel resolves correctly", async () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "Oracle",
      affiliateCode: "ORC",
    });

    const pubResult = await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 80,
      priceSOL: 0.01,
      teaser: "Teaser",
      thesis: VALID_THESIS,
    });

    const resolveResult = market.resolveIntel(pubResult.intel!.id, "Yes");

    expect(resolveResult.success).toBe(true);
    expect(resolveResult.correct).toBe(true);
    expect(resolveResult.analyst?.totalPredictions).toBe(1);
    expect(resolveResult.analyst?.correctPredictions).toBe(1);
    expect(resolveResult.analyst?.accuracy).toBe(100);
  });

  it("marks incorrect prediction and updates stats", async () => {
    const market = makeMarketplace();
    market.registerAnalyst({
      wallet: TEST_WALLET,
      displayName: "Oracle",
      affiliateCode: "ORC",
    });

    const pubResult = await market.publishIntel({
      analystWallet: TEST_WALLET,
      marketPda: TEST_MARKET_PDA,
      predictedOutcome: "Yes",
      confidence: 80,
      priceSOL: 0.01,
      teaser: "Teaser",
      thesis: VALID_THESIS,
    });

    const resolveResult = market.resolveIntel(pubResult.intel!.id, "No");

    expect(resolveResult.success).toBe(true);
    expect(resolveResult.correct).toBe(false);
    expect(resolveResult.analyst?.correctPredictions).toBe(0);
    expect(resolveResult.analyst?.accuracy).toBe(0);
  });
});
