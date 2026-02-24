/**
 * x402 Agent Intel Marketplace — Express Server
 *
 * REST API for the prediction market analysis marketplace where
 * analyst agents sell market intelligence to buyer agents via
 * x402 micropayments.
 *
 * Routes:
 *   GET  /                              — marketplace stats
 *   GET  /markets                       — list active markets with available analysis
 *   GET  /markets/:pda/analyses         — list analyses for a market (public metadata only)
 *   POST /analysts                      — register as analyst
 *   GET  /analysts/:wallet              — get analyst profile + reputation
 *   GET  /analysts/top                  — leaderboard
 *   POST /analyses                      — publish analysis (analyst only)
 *   GET  /analyses/:id                  — get analysis preview (no thesis)
 *   GET  /analyses/:id/buy              — buy analysis (x402 flow)
 *   POST /resolve/:marketPda            — resolve market outcomes (cron)
 */

import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  initDb,
  registerAnalyst,
  getAnalystByWallet,
  getTopAnalysts,
  publishAnalysis,
  getAnalysisById,
  listAnalysesForMarket,
  listRecentAnalyses,
  recordPurchase,
  hasBuyerPurchased,
  getMarketplaceStats,
  resolveAnalysis,
} from "./db";
import { requireX402Payment } from "./x402";
import { fetchActiveMarkets, buildAffiliateLink, checkMarketOutcome } from "./baozi";

const PORT = parseInt(process.env.PORT || "3402", 10);

// Marketplace treasury wallet (receives platform fee from analysis prices)
// Analysts set their own price; full amount goes to their wallet via x402
const PLATFORM_WALLET = process.env.PLATFORM_WALLET || "J4TyPjm2g1MYRCBj7n1G5saRn5WSa3nT8chHhngzreMa";

const app = express();
app.use(express.json());

// ── Marketplace overview ──────────────────────────────────────────────────────

app.get("/", async (_req: Request, res: Response) => {
  const stats = getMarketplaceStats();
  const topAnalysts = getTopAnalysts(5);
  res.json({
    name: "Baozi x402 Agent Intel Marketplace",
    version: "1.0.0",
    description: "Buy and sell Baozi prediction market analysis via x402 micropayments",
    stats,
    topAnalysts: topAnalysts.map((a) => ({
      name: a.name,
      tier: a.tier,
      accuracy: (a.accuracy * 100).toFixed(1) + "%",
      analyses: a.totalAnalyses,
      affiliateCode: a.affiliateCode,
    })),
  });
});

// ── Active markets with analyses ──────────────────────────────────────────────

app.get("/markets", async (_req: Request, res: Response) => {
  const baoziMarkets = await fetchActiveMarkets(50);
  const marketsWithAnalysis = [];

  for (const market of baoziMarkets) {
    const analyses = listAnalysesForMarket(market.pda);
    if (analyses.length > 0) {
      marketsWithAnalysis.push({
        ...market,
        analysisCount: analyses.length,
        analysts: analyses.map((a) => ({
          id: a.id,
          analystWallet: a.analystWallet,
          recommendedSide: a.recommendedSide,
          confidenceScore: a.confidenceScore,
          priceSOL: a.priceSOL,
          purchaseCount: a.purchaseCount,
          // Thesis is HIDDEN until purchased
        })),
      });
    }
  }

  res.json({
    markets: marketsWithAnalysis,
    total: marketsWithAnalysis.length,
  });
});

// ── Get all analyses for a specific market ────────────────────────────────────

app.get("/markets/:pda/analyses", (req: Request, res: Response) => {
  const analyses = listAnalysesForMarket(req.params.pda);
  res.json({
    marketPda: req.params.pda,
    analyses: analyses.map((a) => ({
      id: a.id,
      analystWallet: a.analystWallet,
      recommendedSide: a.recommendedSide,
      confidenceScore: a.confidenceScore,
      priceSOL: a.priceSOL,
      priceLamports: a.priceLamports,
      publishedAt: a.publishedAt,
      purchaseCount: a.purchaseCount,
      // thesis is HIDDEN until paid
    })),
  });
});

// ── Analyst endpoints ─────────────────────────────────────────────────────────

app.post("/analysts", async (req: Request, res: Response) => {
  const { wallet, name, affiliateCode } = req.body;

  if (!wallet || !name || !affiliateCode) {
    res.status(400).json({ error: "wallet, name, affiliateCode required" });
    return;
  }

  if (!/^[A-Z0-9]{4,12}$/.test(affiliateCode)) {
    res.status(400).json({ error: "affiliateCode must be 4-12 uppercase alphanumeric chars" });
    return;
  }

  // Check if already registered
  const existing = getAnalystByWallet(wallet);
  if (existing) {
    res.status(409).json({ error: "Wallet already registered", analyst: existing });
    return;
  }

  const analyst = registerAnalyst({
    id: uuidv4(),
    wallet,
    name,
    affiliateCode,
    registeredAt: Date.now(),
  });

  res.status(201).json({
    analyst,
    message: `Registered as analyst. Your affiliate code: ${affiliateCode}`,
    affiliateBaseUrl: "https://baozi.bet/market/{marketPda}?ref=" + affiliateCode,
  });
});

app.get("/analysts/top", (_req: Request, res: Response) => {
  const analysts = getTopAnalysts(20);
  res.json({
    leaderboard: analysts.map((a, i) => ({
      rank: i + 1,
      name: a.name,
      wallet: a.wallet.slice(0, 8) + "...",
      tier: a.tier,
      accuracy: (a.accuracy * 100).toFixed(1) + "%",
      resolved: a.resolvedAnalyses,
      correct: a.correctPredictions,
      revenue: a.totalRevenue.toFixed(4) + " SOL",
    })),
  });
});

app.get("/analysts/:wallet", (req: Request, res: Response) => {
  const analyst = getAnalystByWallet(req.params.wallet);
  if (!analyst) {
    res.status(404).json({ error: "Analyst not found" });
    return;
  }
  res.json(analyst);
});

// ── Publish analysis ──────────────────────────────────────────────────────────

app.post("/analyses", async (req: Request, res: Response) => {
  const {
    analystWallet,
    marketPda,
    marketQuestion,
    thesis,
    recommendedSide,
    confidenceScore,
    priceSOL,
    expiresInHours,
  } = req.body;

  if (!analystWallet || !marketPda || !thesis || !recommendedSide || !confidenceScore || !priceSOL) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const analyst = getAnalystByWallet(analystWallet);
  if (!analyst) {
    res.status(403).json({ error: "Analyst not registered. POST /analysts first." });
    return;
  }

  if (thesis.length < 200 || thesis.length > 2000) {
    res.status(400).json({ error: "Thesis must be 200-2000 characters" });
    return;
  }

  if (!["YES", "NO"].includes(recommendedSide)) {
    res.status(400).json({ error: "recommendedSide must be YES or NO" });
    return;
  }

  if (typeof confidenceScore !== "number" || confidenceScore < 1 || confidenceScore > 100) {
    res.status(400).json({ error: "confidenceScore must be 1-100" });
    return;
  }

  if (typeof priceSOL !== "number" || priceSOL < 0.0001 || priceSOL > 1) {
    res.status(400).json({ error: "priceSOL must be between 0.0001 and 1 SOL" });
    return;
  }

  const now = Date.now();
  const ttlHours = typeof expiresInHours === "number" ? Math.min(expiresInHours, 168) : 72;

  const analysis = publishAnalysis({
    id: uuidv4(),
    analystId: analyst.id,
    analystWallet,
    affiliateCode: analyst.affiliateCode,
    marketPda,
    marketQuestion: marketQuestion || "Unknown market",
    thesis,
    recommendedSide: recommendedSide as "YES" | "NO",
    confidenceScore,
    priceSOL,
    priceLamports: Math.round(priceSOL * 1e9),
    publishedAt: now,
    expiresAt: now + ttlHours * 3600 * 1000,
  });

  res.status(201).json({
    analysis: {
      id: analysis.id,
      marketPda: analysis.marketPda,
      recommendedSide: analysis.recommendedSide,
      confidenceScore: analysis.confidenceScore,
      priceSOL: analysis.priceSOL,
      publishedAt: new Date(analysis.publishedAt).toISOString(),
    },
    buyUrl: `/analyses/${analysis.id}/buy`,
    message: "Analysis published. Buyers will pay via x402 to access your thesis.",
  });
});

// ── Analysis preview (public) ─────────────────────────────────────────────────

app.get("/analyses/:id", (req: Request, res: Response) => {
  const analysis = getAnalysisById(req.params.id);
  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  res.json({
    id: analysis.id,
    marketPda: analysis.marketPda,
    marketQuestion: analysis.marketQuestion,
    analystWallet: analysis.analystWallet,
    recommendedSide: analysis.recommendedSide,
    confidenceScore: analysis.confidenceScore,
    priceSOL: analysis.priceSOL,
    priceLamports: analysis.priceLamports,
    purchaseCount: analysis.purchaseCount,
    publishedAt: new Date(analysis.publishedAt).toISOString(),
    // thesis HIDDEN — pay via x402 to unlock
    thesis: "[LOCKED — pay via x402 to unlock]",
    buyUrl: `/analyses/${analysis.id}/buy`,
  });
});

// ── Buy analysis via x402 ─────────────────────────────────────────────────────

app.get(
  "/analyses/:id/buy",
  async (req: Request, res: Response, next) => {
    const analysis = getAnalysisById(req.params.id);
    if (!analysis) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    // Apply x402 payment requirement
    await requireX402Payment({
      priceSOL: analysis.priceSOL,
      payTo: analysis.analystWallet, // Payment goes directly to analyst
      getDescription: () =>
        `Baozi market analysis: ${analysis.marketQuestion} — ${analysis.recommendedSide} @ ${analysis.confidenceScore}% confidence`,
    })(req, res, next);
  },
  (req: Request, res: Response) => {
    const analysis = getAnalysisById(req.params.id)!;
    const x402 = (req as any).x402;
    const buyerWallet = req.query.buyer as string || "unknown";

    // Record the purchase
    recordPurchase({
      id: uuidv4(),
      analysisId: analysis.id,
      buyerWallet,
      paidLamports: x402.paidLamports,
      txSignature: x402.signature,
      purchasedAt: Date.now(),
      affiliateLink: buildAffiliateLink(
        analysis.marketPda,
        analysis.affiliateCode,
        analysis.recommendedSide
      ),
    });

    // Return full analysis with affiliate link
    res.json({
      thesis: analysis.thesis,
      recommendedSide: analysis.recommendedSide,
      confidenceScore: analysis.confidenceScore,
      affiliateLink: buildAffiliateLink(
        analysis.marketPda,
        analysis.affiliateCode,
        analysis.recommendedSide
      ),
      message: `Analysis unlocked. Follow analyst's position using the affiliate link to share commission.`,
      txSignature: x402.signature,
    });
  }
);

// ── Resolve market outcomes (update reputation) ───────────────────────────────

app.post("/resolve/:marketPda", async (req: Request, res: Response) => {
  const { marketPda } = req.params;
  const { outcome } = req.body;

  // Try auto-detect from Baozi if not provided
  const resolvedOutcome: "YES" | "NO" | null = outcome || await checkMarketOutcome(marketPda);

  if (!resolvedOutcome) {
    res.status(400).json({ error: "Market not resolved yet or outcome unknown" });
    return;
  }

  const analyses = listAnalysesForMarket(marketPda);
  let resolved = 0;

  for (const analysis of analyses) {
    if (!analysis.resolved) {
      resolveAnalysis(analysis.id, resolvedOutcome);
      resolved++;
    }
  }

  res.json({
    marketPda,
    outcome: resolvedOutcome,
    analysesResolved: resolved,
    message: `Resolved ${resolved} analyses. Analyst reputations updated.`,
  });
});

// ── Recent analyses feed ──────────────────────────────────────────────────────

app.get("/feed", (_req: Request, res: Response) => {
  const analyses = listRecentAnalyses(20);
  res.json({
    analyses: analyses.map((a) => ({
      id: a.id,
      marketQuestion: a.marketQuestion,
      recommendedSide: a.recommendedSide,
      confidenceScore: a.confidenceScore,
      priceSOL: a.priceSOL,
      purchaseCount: a.purchaseCount,
      publishedAt: new Date(a.publishedAt).toISOString(),
    })),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

export function startServer(): void {
  initDb();
  app.listen(PORT, () => {
    console.log(`x402 Intel Marketplace running on http://localhost:${PORT}`);
    console.log(`  POST /analysts     — register analyst`);
    console.log(`  GET  /markets      — browse markets with analysis`);
    console.log(`  POST /analyses     — publish analysis`);
    console.log(`  GET  /analyses/:id/buy — purchase analysis via x402`);
  });
}

if (require.main === module) {
  startServer();
}

export default app;
