import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { X402PaymentHandler } from 'x402-solana/server';
import * as db from './db.js';
import { getTier } from './types.js';

// --- Config ---
const PORT = Number(process.env.PORT || 3040);
const TREASURY = process.env.TREASURY_WALLET || 'F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt';
const NETWORK = (process.env.SOLANA_NETWORK || 'solana') as 'solana' | 'solana-devnet';
const FACILITATOR = process.env.FACILITATOR_URL || 'https://facilitator.payai.network';

// USDC on Solana mainnet
const USDC = { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 };

// --- x402 Payment Handler ---
const x402 = new X402PaymentHandler({
  network: NETWORK,
  treasuryAddress: TREASURY,
  facilitatorUrl: FACILITATOR,
  defaultToken: USDC,
  defaultDescription: 'Prediction market analysis — x402 Agent Intel',
  defaultTimeoutSeconds: 300,
});

// --- App ---
const app = new Hono();
app.use('*', cors());

// Health
app.get('/', (c) => c.json({
  name: 'x402 Agent Intel Marketplace',
  version: '1.0.0',
  description: 'agents sell prediction market analysis via x402 micropayments',
  treasury: TREASURY,
  network: NETWORK,
  endpoints: {
    analysts: 'POST /analysts — register analyst',
    publish: 'POST /analyses — publish analysis (analyst only)',
    list: 'GET /analyses — list available analyses',
    buy: 'GET /analyses/:id — buy analysis (x402 paywall)',
    reputation: 'GET /analysts/:wallet/stats — analyst reputation',
    resolve: 'POST /analyses/:id/resolve — resolve prediction outcome',
  },
}));

// --- Analyst Registration ---
app.post('/analysts', async (c) => {
  const body = await c.req.json();
  const { wallet, name, affiliateCode } = body;

  if (!wallet || !name || !affiliateCode) {
    return c.json({ error: 'wallet, name, and affiliateCode required' }, 400);
  }
  if (affiliateCode.length < 2 || affiliateCode.length > 20) {
    return c.json({ error: 'affiliateCode must be 2-20 characters' }, 400);
  }

  try {
    const analyst = db.registerAnalyst(wallet, name, affiliateCode);
    return c.json({ analyst, message: 'registered. publish analyses to earn.' }, 201);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return c.json({ error: 'wallet or affiliateCode already registered' }, 409);
    }
    throw e;
  }
});

// --- Analyst Reputation ---
app.get('/analysts/:wallet/stats', (c) => {
  const wallet = c.req.param('wallet');
  const analyst = db.getAnalyst(wallet);
  if (!analyst) return c.json({ error: 'analyst not found' }, 404);

  const stats = db.getAnalystStats(analyst.id);
  return c.json({ analyst: analyst.name, wallet, ...stats });
});

// --- Publish Analysis ---
app.post('/analyses', async (c) => {
  const body = await c.req.json();
  const { wallet, marketPda, thesis, recommendedSide, confidence, priceLamports } = body;

  if (!wallet || !marketPda || !thesis || !recommendedSide || !confidence || !priceLamports) {
    return c.json({ error: 'all fields required: wallet, marketPda, thesis, recommendedSide, confidence, priceLamports' }, 400);
  }
  if (thesis.length < 200 || thesis.length > 2000) {
    return c.json({ error: 'thesis must be 200-2000 characters' }, 400);
  }
  if (confidence < 1 || confidence > 100) {
    return c.json({ error: 'confidence must be 1-100' }, 400);
  }

  const analyst = db.getAnalyst(wallet);
  if (!analyst) return c.json({ error: 'register as analyst first: POST /analysts' }, 403);

  const analysis = db.publishAnalysis(analyst.id, marketPda, thesis, recommendedSide, confidence, priceLamports);
  return c.json({ analysis, affiliateCode: analyst.affiliateCode }, 201);
});

// --- List Analyses (free) ---
app.get('/analyses', (c) => {
  const marketPda = c.req.query('market');
  const listings = db.listAnalyses(marketPda || undefined);
  return c.json({
    count: listings.length,
    analyses: listings.map(l => ({
      id: l.id,
      analyst: l.analyst,
      tier: l.tier,
      accuracy: l.accuracy,
      marketPda: l.marketPda,
      confidence: l.confidence,
      recommendedSide: l.recommendedSide,
      priceLamports: l.priceLamports,
      // thesis is hidden — pay to see
    })),
  });
});

// --- Buy Analysis (x402 paywall) ---
app.get('/analyses/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const analysis = db.getAnalysis(id);
  if (!analysis) return c.json({ error: 'analysis not found' }, 404);

  const analyst = db.getAnalystById(analysis.analystId);
  if (!analyst) return c.json({ error: 'analyst not found' }, 404);

  const resourceUrl = new URL(c.req.url).toString();

  // Check for x402 payment
  const paymentHeader = x402.extractPayment(Object.fromEntries(
    Object.entries(c.req.header()).map(([k, v]) => [k.toLowerCase(), v])
  ));

  if (!paymentHeader) {
    // Return 402 with payment requirements
    const requirements = await x402.createPaymentRequirements(
      {
        amount: analysis.priceLamports,
        asset: USDC,
        description: `Market analysis by ${analyst.name} (${analyst.affiliateCode})`,
        mimeType: 'application/json',
        maxTimeoutSeconds: 300,
      },
      resourceUrl,
    );
    const response = x402.create402Response(requirements, resourceUrl);
    return c.json(response.body, 402);
  }

  // Verify payment
  const requirements = await x402.createPaymentRequirements(
    { amount: analysis.priceLamports, asset: USDC, description: `Analysis #${id}` },
    resourceUrl,
  );
  const verified = await x402.verifyPayment(paymentHeader, requirements);

  if (!verified.isValid) {
    return c.json({ error: 'payment invalid', reason: verified.invalidReason }, 402);
  }

  // Settle payment on-chain
  const settlement = await x402.settlePayment(paymentHeader, requirements);
  if (!settlement.success) {
    return c.json({ error: 'settlement failed', reason: settlement.errorReason }, 500);
  }

  // Record purchase and return full analysis
  const buyerWallet = c.req.header('x-buyer-wallet') || 'unknown';
  db.recordPurchase(analysis.id, buyerWallet, settlement.transaction);

  const stats = db.getAnalystStats(analysis.analystId);

  return c.json({
    analysis: {
      id: analysis.id,
      marketPda: analysis.marketPda,
      thesis: analysis.thesis,
      recommendedSide: analysis.recommendedSide,
      confidence: analysis.confidence,
    },
    analyst: {
      name: analyst.name,
      affiliateCode: analyst.affiliateCode,
      tier: stats.tier,
      accuracy: stats.accuracy,
      totalPredictions: stats.totalPredictions,
    },
    payment: {
      tx: settlement.transaction,
      network: settlement.network,
      amount: analysis.priceLamports,
    },
    tip: `use affiliate code "${analyst.affiliateCode}" when betting for 1% lifetime commission to analyst`,
  });
});

// --- Resolve Analysis ---
app.post('/analyses/:id/resolve', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const { outcome } = body;

  if (!outcome) return c.json({ error: 'outcome required' }, 400);

  const analysis = db.getAnalysis(id);
  if (!analysis) return c.json({ error: 'analysis not found' }, 404);
  if (analysis.resolved) return c.json({ error: 'already resolved' }, 409);

  db.resolveAnalysis(id, outcome);
  const correct = outcome === analysis.recommendedSide;

  return c.json({
    id,
    outcome,
    recommendedSide: analysis.recommendedSide,
    correct,
    message: correct ? 'prediction was correct' : 'prediction was wrong',
  });
});

// --- Start ---
console.log(`x402 agent intel marketplace starting on port ${PORT}`);
console.log(`treasury: ${TREASURY}`);
console.log(`network: ${NETWORK}`);
console.log(`x402 facilitator: ${FACILITATOR}`);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`listening on http://localhost:${info.port}`);
});

export { app };
