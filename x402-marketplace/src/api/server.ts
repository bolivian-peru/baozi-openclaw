/**
 * x402 Marketplace REST API Server
 * 
 * Exposes the marketplace functionality via HTTP endpoints.
 * Implements x402 payment protocol (HTTP 402 responses).
 * 
 * Endpoints:
 *   POST   /api/analysts              — Register analyst
 *   GET    /api/analysts/:id          — Get analyst profile
 *   GET    /api/analysts/:id/reputation — Get analyst reputation
 *   POST   /api/analyses              — Publish analysis
 *   GET    /api/analyses              — Browse analyses (marketplace)
 *   GET    /api/analyses/:id          — Get analysis (returns 402 if not paid)
 *   POST   /api/analyses/:id/purchase — Submit payment & get analysis
 *   POST   /api/analyses/:id/bet      — Place bet with affiliate
 *   GET    /api/leaderboard           — Analyst leaderboard
 *   GET    /api/markets               — List active markets
 *   GET    /api/markets/:pda          — Get market details
 *   POST   /api/markets/:pda/resolve  — Resolve market analyses
 *   GET    /api/stats                 — Marketplace statistics
 */

import express, { Request, Response, NextFunction } from 'express';
import { AgentIntelMarketplace } from '../marketplace';

export function createServer(marketplace: AgentIntelMarketplace): express.Application {
  const app = express();
  app.use(express.json());

  // ─── Analyst Endpoints ──────────────────────────────────────

  app.post('/api/analysts', async (req: Request, res: Response) => {
    try {
      const profile = await marketplace.registerAnalyst(req.body);
      res.status(201).json({ success: true, data: profile });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/analysts/:id', (req: Request, res: Response) => {
    const analyst = marketplace.getAnalyst(req.params.id);
    if (!analyst) {
      return res.status(404).json({ success: false, error: 'Analyst not found' });
    }
    const reputation = marketplace.reputationTracker.getReputation(req.params.id);
    res.json({ success: true, data: { ...analyst, reputation } });
  });

  app.get('/api/analysts/:id/reputation', (req: Request, res: Response) => {
    const reputation = marketplace.reputationTracker.getReputation(req.params.id);
    if (!reputation) {
      return res.status(404).json({ success: false, error: 'Analyst not found' });
    }
    res.json({ success: true, data: reputation });
  });

  // ─── Analysis Endpoints ─────────────────────────────────────

  app.post('/api/analyses', async (req: Request, res: Response) => {
    try {
      const analysis = await marketplace.publishAnalysis(req.body);
      res.status(201).json({ success: true, data: analysis });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/analyses', (req: Request, res: Response) => {
    const filters = {
      marketPda: req.query.marketPda as string | undefined,
      minAccuracy: req.query.minAccuracy ? parseFloat(req.query.minAccuracy as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      minConfidence: req.query.minConfidence ? parseInt(req.query.minConfidence as string) : undefined,
      sortBy: req.query.sortBy as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };
    const listings = marketplace.browseAnalyses(filters);
    res.json({ success: true, data: listings, count: listings.length });
  });

  /**
   * GET /api/analyses/:id
   * Returns 402 Payment Required if buyer hasn't paid.
   * This is the core x402 integration point.
   */
  app.get('/api/analyses/:id', (req: Request, res: Response) => {
    const buyerWallet = req.headers['x-wallet-address'] as string;

    if (!buyerWallet) {
      // No wallet provided — return preview only
      const listings = marketplace.browseAnalyses();
      const listing = listings.find(l => l.analysis.id === req.params.id);
      if (!listing) {
        return res.status(404).json({ success: false, error: 'Analysis not found' });
      }
      return res.json({
        success: true,
        data: {
          id: listing.analysis.id,
          marketPda: listing.analysis.marketPda,
          marketTitle: listing.analysis.marketTitle,
          analystName: listing.analyst.displayName,
          confidence: listing.analysis.confidence,
          recommendedSide: listing.analysis.recommendedSide,
          priceSOL: listing.analysis.priceSOL,
          preview: listing.preview,
          reputation: listing.reputation,
          // Thesis is hidden — buyer must pay via x402
        },
      });
    }

    // Wallet provided — check payment or return 402
    try {
      const paymentDetails = marketplace.requestAnalysis(req.params.id, buyerWallet);
      // 402 Payment Required
      res.status(402);
      for (const [key, value] of Object.entries(paymentDetails.headers)) {
        res.setHeader(key, value);
      }
      res.json({
        success: false,
        error: 'Payment required',
        paymentRequest: paymentDetails.paymentRequest,
      });
    } catch (err: any) {
      if (err.message === 'Analysis already purchased') {
        // Already paid — return full analysis
        const listings = marketplace.browseAnalyses();
        const listing = listings.find(l => l.analysis.id === req.params.id);
        if (listing) {
          return res.json({ success: true, data: listing.analysis });
        }
      }
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/analyses/:id/purchase', async (req: Request, res: Response) => {
    try {
      const result = await marketplace.purchaseAnalysis({
        analysisId: req.params.id,
        buyerWallet: req.body.buyerWallet,
        buyerAgentId: req.body.buyerAgentId,
        transactionSignature: req.body.transactionSignature,
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/analyses/:id/bet', async (req: Request, res: Response) => {
    try {
      const result = await marketplace.placeBetWithAffiliate({
        buyerWallet: req.body.buyerWallet,
        analysisId: req.params.id,
        amount: req.body.amount,
        side: req.body.side,
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ─── Market Endpoints ───────────────────────────────────────

  app.get('/api/markets', async (_req: Request, res: Response) => {
    try {
      const markets = await marketplace.baoziClient.listMarkets();
      res.json({ success: true, data: markets });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/markets/:pda', async (req: Request, res: Response) => {
    try {
      const market = await marketplace.baoziClient.getMarket(req.params.pda);
      if (!market) {
        return res.status(404).json({ success: false, error: 'Market not found' });
      }
      res.json({ success: true, data: market });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/markets/:pda/resolve', async (req: Request, res: Response) => {
    try {
      const results = await marketplace.resolveMarketAnalyses(req.params.pda);
      res.json({ success: true, data: results });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ─── Leaderboard & Stats ────────────────────────────────────

  app.get('/api/leaderboard', (req: Request, res: Response) => {
    const options = {
      minAnalyses: req.query.minAnalyses ? parseInt(req.query.minAnalyses as string) : undefined,
      sortBy: req.query.sortBy as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    const leaderboard = marketplace.getLeaderboard(options);
    res.json({ success: true, data: leaderboard });
  });

  app.get('/api/stats', (_req: Request, res: Response) => {
    const stats = marketplace.getMarketplaceStats();
    res.json({ success: true, data: stats });
  });

  app.get('/api/events', (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const events = marketplace.getEvents(limit);
    res.json({ success: true, data: events, count: events.length });
  });

  // ─── Health Check ───────────────────────────────────────────

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', version: '1.0.0', service: 'x402-agent-intel-marketplace' });
  });

  return app;
}
