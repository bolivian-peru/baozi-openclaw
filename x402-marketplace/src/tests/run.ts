#!/usr/bin/env npx tsx
/**
 * x402 Agent Intel Marketplace — Test Suite
 *
 * Replaces jest with a lightweight runner compatible with ESM.
 * Tests marketplace core, x402 payment protocol, reputation, and agents.
 */

import { AgentIntelMarketplace } from '../marketplace/index.js';
import { AnalystAgent } from '../agents/analyst-agent.js';
import { BuyerAgent } from '../agents/buyer-agent.js';
import { X402PaymentProtocol, X402Error, generateMockSignature } from '../x402/index.js';
import { ReputationTracker } from '../reputation/index.js';
import { PROGRAM_ID } from '../mcp/mcp-client.js';

// ─── Minimal test framework ───────────────────────────────────
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: { name: string; error: string }[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${message ? ': ' + message : ''}`);
  }
}

function assertGreaterThan(actual: number, expected: number, message?: string): void {
  if (!(actual > expected)) {
    throw new Error(`Expected ${actual} > ${expected}${message ? ': ' + message : ''}`);
  }
}

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    failedTests++;
    failures.push({ name, error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

async function assertThrows(fn: () => Promise<any>, expectedMessage?: string): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (err: any) {
    if (err.message === 'Expected function to throw, but it did not') throw err;
    if (expectedMessage && !err.message.includes(expectedMessage)) {
      throw new Error(`Expected error containing "${expectedMessage}", got "${err.message}"`);
    }
  }
}

// Helper: create a marketplace with test mock markets pre-loaded
function createTestMarketplace(): AgentIntelMarketplace {
  const marketplace = new AgentIntelMarketplace({
    facilitatorWallet: 'TEST_FACILITATOR_WALLET',
  });

  // Add mock markets for testing (override map)
  const testMarkets = [
    {
      pda: 'BTC110k2025_PDA_abc123',
      title: 'Will BTC reach $110,000 by March 2025?',
      description: 'Resolves YES if Bitcoin price reaches $110,000.',
      category: 'crypto',
      outcomes: ['YES', 'NO'],
      currentPrices: [0.62, 0.38],
      volume: 45000,
      liquidity: 12000,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      resolved: false,
    },
    {
      pda: 'ETH5k2025_PDA_def456',
      title: 'Will ETH reach $5,000 by June 2025?',
      description: 'Resolves YES if Ethereum price reaches $5,000.',
      category: 'crypto',
      outcomes: ['YES', 'NO'],
      currentPrices: [0.35, 0.65],
      volume: 28000,
      liquidity: 8000,
      expiresAt: Date.now() + 120 * 24 * 60 * 60 * 1000,
      resolved: false,
    },
    {
      pda: 'SOL200_PDA_ghi789',
      title: 'Will SOL reach $200 by Q2 2025?',
      description: 'Resolves YES if Solana reaches $200.',
      category: 'crypto',
      outcomes: ['YES', 'NO'],
      currentPrices: [0.45, 0.55],
      volume: 15000,
      liquidity: 5000,
      expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
      resolved: false,
    },
    {
      pda: 'FED_RATE_PDA_jkl012',
      title: 'Will the Fed cut rates in March 2025?',
      description: 'Resolves YES if rate cut announced.',
      category: 'economics',
      outcomes: ['YES', 'NO'],
      currentPrices: [0.22, 0.78],
      volume: 62000,
      liquidity: 20000,
      expiresAt: Date.now() + 20 * 24 * 60 * 60 * 1000,
      resolved: false,
    },
    {
      pda: 'AI_AGI_PDA_mno345',
      title: 'Will a major lab announce AGI by end of 2025?',
      description: 'Resolves YES if AGI announced.',
      category: 'tech',
      outcomes: ['YES', 'NO'],
      currentPrices: [0.08, 0.92],
      volume: 95000,
      liquidity: 30000,
      expiresAt: Date.now() + 300 * 24 * 60 * 60 * 1000,
      resolved: false,
    },
  ];

  for (const m of testMarkets) {
    marketplace.baoziClient.addMarket(m);
  }

  return marketplace;
}

// ─── Test Suites ──────────────────────────────────────────────

console.log('\n🧪 x402 Agent Intel Marketplace — Test Suite');
console.log('='.repeat(55));

// --- Program ID ---
console.log('\n📌 Program ID');
await test('PROGRAM_ID is Baozi mainnet program', () => {
  assertEqual(PROGRAM_ID.toBase58(), 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
});

// --- Analyst Registration ---
console.log('\n📋 Analyst Registration');

await test('should register a new analyst', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({
    wallet: 'ANALYST_WALLET_12345678901234567890',
    displayName: 'TestAnalyst',
    affiliateCode: 'TEST',
    bio: 'Test analyst bio',
  });
  assert(!!profile.id, 'id should be defined');
  assertEqual(profile.displayName, 'TestAnalyst');
  assertEqual(profile.affiliateCode, 'TEST');
});

await test('should reject duplicate wallet registration', async () => {
  const mp = createTestMarketplace();
  await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'A1', affiliateCode: 'CODE1' });
  await assertThrows(
    () => mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'A2', affiliateCode: 'CODE2' }),
    'Wallet already registered'
  );
});

await test('should reject duplicate affiliate codes', async () => {
  const mp = createTestMarketplace();
  await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_AAAAAAAAAAAAAAAAAAAAAA', displayName: 'A1', affiliateCode: 'SAME_CODE' });
  await assertThrows(
    () => mp.registerAnalyst({ wallet: 'ANALYST_WALLET_BBBBBBBBBBBBBBBBBBBBBB', displayName: 'A2', affiliateCode: 'SAME_CODE' }),
    'Affiliate code already taken'
  );
});

await test('should validate analyst input', async () => {
  const mp = createTestMarketplace();
  await assertThrows(() => mp.registerAnalyst({ wallet: 'short', displayName: 'A', affiliateCode: 'TEST' }));
});

// --- Analysis Publishing ---
console.log('\n📊 Analysis Publishing');

await test('should publish a market analysis', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  const analysis = await mp.publishAnalysis({
    analystId: profile.id,
    marketPda: 'BTC110k2025_PDA_abc123',
    thesis: 'A'.repeat(200),
    recommendedSide: 'YES',
    confidence: 75,
    priceSOL: 0.01,
  });
  assert(!!analysis.id, 'id should be defined');
  assertEqual(analysis.marketPda, 'BTC110k2025_PDA_abc123');
  assertEqual(analysis.recommendedSide, 'YES');
  assertEqual(analysis.confidence, 75);
  assertEqual(analysis.status, 'active');
});

await test('should reject analysis for non-existent market', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  await assertThrows(
    () => mp.publishAnalysis({ analystId: profile.id, marketPda: 'NONEXISTENT', thesis: 'A'.repeat(200), recommendedSide: 'YES', confidence: 75, priceSOL: 0.01 }),
    'Market not found'
  );
});

await test('should reject duplicate active analysis for same market', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  await mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'A'.repeat(200), recommendedSide: 'YES', confidence: 75, priceSOL: 0.01 });
  await assertThrows(
    () => mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'B'.repeat(200), recommendedSide: 'NO', confidence: 80, priceSOL: 0.02 }),
    'Active analysis already exists'
  );
});

// --- Marketplace Browsing ---
console.log('\n🔍 Marketplace Browsing');

await test('should list available analyses', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  await mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'BTC thesis. '.repeat(20), recommendedSide: 'YES', confidence: 75, priceSOL: 0.01 });
  await mp.publishAnalysis({ analystId: profile.id, marketPda: 'ETH5k2025_PDA_def456', thesis: 'ETH thesis. '.repeat(20), recommendedSide: 'NO', confidence: 85, priceSOL: 0.02 });
  const listings = mp.browseAnalyses();
  assertEqual(listings.length, 2);
  assert(listings[0].preview.length <= 103, 'preview should be truncated');
});

await test('should filter by market PDA', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  await mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'A'.repeat(200), recommendedSide: 'YES', confidence: 75, priceSOL: 0.01 });
  await mp.publishAnalysis({ analystId: profile.id, marketPda: 'ETH5k2025_PDA_def456', thesis: 'B'.repeat(200), recommendedSide: 'NO', confidence: 85, priceSOL: 0.02 });
  const listings = mp.browseAnalyses({ marketPda: 'BTC110k2025_PDA_abc123' });
  assertEqual(listings.length, 1);
});

await test('should filter by maximum price', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  await mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'A'.repeat(200), recommendedSide: 'YES', confidence: 75, priceSOL: 0.01 });
  await mp.publishAnalysis({ analystId: profile.id, marketPda: 'ETH5k2025_PDA_def456', thesis: 'B'.repeat(200), recommendedSide: 'NO', confidence: 85, priceSOL: 0.02 });
  const listings = mp.browseAnalyses({ maxPrice: 0.015 });
  assertEqual(listings.length, 1);
});

// --- Purchase Flow (x402) ---
console.log('\n💳 Purchase Flow (x402)');

await test('should return 402 payment request', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  const analysis = await mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'A'.repeat(200), recommendedSide: 'YES', confidence: 80, priceSOL: 0.01 });
  const response = mp.requestAnalysis(analysis.id, 'BUYER_WALLET_xyz');
  assertEqual(response.status, 402);
  assertEqual(response.headers['X-Payment-Required'], 'true');
  assertEqual(response.paymentRequest.amount, 0.01);
});

await test('should complete purchase with valid payment', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  const analysis = await mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'A'.repeat(200), recommendedSide: 'YES', confidence: 80, priceSOL: 0.01 });
  mp.requestAnalysis(analysis.id, 'BUYER_WALLET_xyz');
  const result = await mp.purchaseAnalysis({
    analysisId: analysis.id,
    buyerWallet: 'BUYER_WALLET_xyz',
    buyerAgentId: 'buyer-001',
    transactionSignature: generateMockSignature(),
  });
  assert(!!result.analysis.thesis, 'thesis should be revealed');
  assertGreaterThan(result.analysis.thesis.length, 100);
  assert(result.affiliateLink.includes('TEST'), 'affiliate link should contain code');
});

// --- Affiliate Betting ---
console.log('\n🎰 Affiliate Betting');

await test('should place bet with affiliate code', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  const analysis = await mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'A'.repeat(200), recommendedSide: 'YES', confidence: 80, priceSOL: 0.01 });
  mp.requestAnalysis(analysis.id, 'BUYER_WALLET_xyz');
  await mp.purchaseAnalysis({ analysisId: analysis.id, buyerWallet: 'BUYER_WALLET_xyz', buyerAgentId: 'buyer-001', transactionSignature: generateMockSignature() });
  const result = await mp.placeBetWithAffiliate({ buyerWallet: 'BUYER_WALLET_xyz', analysisId: analysis.id, amount: 1.0 });
  assertEqual(result.success, true);
  assertEqual(result.affiliateCode, 'TEST');
});

await test('should reject bet without purchase', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  const analysis = await mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'A'.repeat(200), recommendedSide: 'YES', confidence: 80, priceSOL: 0.01 });
  await assertThrows(
    () => mp.placeBetWithAffiliate({ buyerWallet: 'UNPAID_BUYER', analysisId: analysis.id, amount: 1.0 }),
    'Must purchase analysis'
  );
});

await test('should track affiliate commission', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  const analysis = await mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'A'.repeat(200), recommendedSide: 'YES', confidence: 80, priceSOL: 0.01 });
  mp.requestAnalysis(analysis.id, 'BUYER_WALLET_xyz');
  await mp.purchaseAnalysis({ analysisId: analysis.id, buyerWallet: 'BUYER_WALLET_xyz', buyerAgentId: 'buyer-001', transactionSignature: generateMockSignature() });
  await mp.placeBetWithAffiliate({ buyerWallet: 'BUYER_WALLET_xyz', analysisId: analysis.id, amount: 10.0 });
  const rep = mp.reputationTracker.getReputation(profile.id);
  assertEqual(rep?.revenueAffiliate, 0.1); // 1% of 10 SOL
});

// --- Market Resolution ---
console.log('\n📈 Market Resolution');

await test('should resolve analyses and update accuracy', async () => {
  const mp = createTestMarketplace();
  const p1 = await mp.registerAnalyst({ wallet: 'ANALYST1_WALLET_1234567890123456789', displayName: 'A1', affiliateCode: 'A1' });
  const p2 = await mp.registerAnalyst({ wallet: 'ANALYST2_WALLET_9876543210987654321', displayName: 'A2', affiliateCode: 'A2' });
  await mp.publishAnalysis({ analystId: p1.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'Bull. '.repeat(40), recommendedSide: 'YES', confidence: 80, priceSOL: 0.01 });
  await mp.publishAnalysis({ analystId: p2.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'Bear. '.repeat(40), recommendedSide: 'NO', confidence: 70, priceSOL: 0.01 });
  mp.baoziClient.resolveMarket('BTC110k2025_PDA_abc123', 0); // YES wins
  const results = await mp.resolveMarketAnalyses('BTC110k2025_PDA_abc123');
  assertEqual(results.length, 2);
  const r1 = results.find(r => r.analystId === p1.id);
  const r2 = results.find(r => r.analystId === p2.id);
  assertEqual(r1?.correct, true);
  assertEqual(r2?.correct, false);
});

// --- X402 Payment Protocol ---
console.log('\n💰 X402 Payment Protocol');

await test('should calculate facilitator fees', () => {
  const protocol = new X402PaymentProtocol('FACILITATOR_WALLET');
  const { fee, netAmount } = protocol.calculateFee(1.0);
  assertEqual(fee, 0.01);
  assertEqual(netAmount, 0.99);
});

await test('should generate valid mock signatures', () => {
  const sig = generateMockSignature();
  assertEqual(sig.length, 88);
});

// --- Reputation Tracker ---
console.log('\n⭐ Reputation Tracker');

await test('should initialize reputation for new analyst', () => {
  const tracker = new ReputationTracker();
  const rep = tracker.initializeReputation('analyst-1');
  assertEqual(rep.tier, 'newcomer');
  assertEqual(rep.accuracy, 0);
});

await test('should track correct predictions', () => {
  const tracker = new ReputationTracker();
  tracker.initializeReputation('analyst-1');
  const analysis = { id: 'a1', recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 80 } as any;
  tracker.recordAnalysis('analyst-1', analysis);
  const result = tracker.resolveAnalysis('analyst-1', 'a1', 'YES');
  assertEqual(result.correct, true);
  assertEqual(result.newAccuracy, 1.0);
});

await test('should track streaks', () => {
  const tracker = new ReputationTracker();
  tracker.initializeReputation('analyst-1');
  for (let i = 0; i < 5; i++) {
    const a = { id: `a${i}`, recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 80 } as any;
    tracker.recordAnalysis('analyst-1', a);
    tracker.resolveAnalysis('analyst-1', `a${i}`, 'YES');
  }
  const rep = tracker.getReputation('analyst-1');
  assertEqual(rep?.streak, 5);
  assertEqual(rep?.bestStreak, 5);
});

await test('should generate leaderboard sorted by accuracy', () => {
  const tracker = new ReputationTracker();
  tracker.initializeReputation('analyst-1');
  tracker.initializeReputation('analyst-2');

  const a1 = { id: 'a1', recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 80 } as any;
  const a2 = { id: 'a2', recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 70 } as any;
  tracker.recordAnalysis('analyst-1', a1);
  tracker.recordAnalysis('analyst-1', a2);
  tracker.resolveAnalysis('analyst-1', 'a1', 'YES');
  tracker.resolveAnalysis('analyst-1', 'a2', 'YES');

  const b1 = { id: 'b1', recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 90 } as any;
  const b2 = { id: 'b2', recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 60 } as any;
  tracker.recordAnalysis('analyst-2', b1);
  tracker.recordAnalysis('analyst-2', b2);
  tracker.resolveAnalysis('analyst-2', 'b1', 'YES');
  tracker.resolveAnalysis('analyst-2', 'b2', 'NO');

  const lb = tracker.getLeaderboard();
  assertEqual(lb[0].analystId, 'analyst-1');
  assertEqual(lb[0].accuracy, 1.0);
  assertEqual(lb[1].analystId, 'analyst-2');
  assertEqual(lb[1].accuracy, 0.5);
});

// --- Analyst Agent ---
console.log('\n🤖 Analyst Agent');

await test('should initialize and register', async () => {
  const mp = createTestMarketplace();
  const agent = new AnalystAgent({
    wallet: 'ANALYST_WALLET_12345678901234567890',
    displayName: 'TestAnalyst',
    affiliateCode: 'TEST',
    strategy: 'fundamental',
    defaultPriceSOL: 0.01,
    minConfidenceThreshold: 50,
  }, mp);
  const profile = await agent.initialize();
  assertEqual(profile.displayName, 'TestAnalyst');
  assert(!!agent.getProfile(), 'profile should be defined');
});

await test('should analyze a market', async () => {
  const mp = createTestMarketplace();
  const agent = new AnalystAgent({
    wallet: 'ANALYST_WALLET_12345678901234567890',
    displayName: 'TestAnalyst',
    affiliateCode: 'TEST',
    strategy: 'fundamental',
    defaultPriceSOL: 0.01,
    minConfidenceThreshold: 50,
  }, mp);
  await agent.initialize();
  const analysis = await agent.analyzeMarket('BTC110k2025_PDA_abc123');
  assert(!!analysis.side, 'side should be defined');
  assertGreaterThan(analysis.confidence, 0);
  assertGreaterThan(analysis.thesis.length, 0);
});

await test('should analyze and publish', async () => {
  const mp = createTestMarketplace();
  const agent = new AnalystAgent({
    wallet: 'ANALYST_WALLET_12345678901234567890',
    displayName: 'TestAnalyst',
    affiliateCode: 'TEST',
    strategy: 'fundamental',
    defaultPriceSOL: 0.01,
    minConfidenceThreshold: 50,
  }, mp);
  await agent.initialize();
  const published = await agent.analyzeAndPublish('BTC110k2025_PDA_abc123');
  assert(!!published.id, 'id should be defined');
  assertEqual(published.status, 'active');
});

// --- Buyer Agent ---
console.log('\n🛒 Buyer Agent');

await test('should browse marketplace', async () => {
  const mp = createTestMarketplace();
  const analyst = new AnalystAgent({
    wallet: 'ANALYST_WALLET_12345678901234567890',
    displayName: 'TestAnalyst',
    affiliateCode: 'TEST',
    strategy: 'fundamental',
    defaultPriceSOL: 0.01,
    minConfidenceThreshold: 50,
  }, mp);
  await analyst.initialize();
  await analyst.analyzeAndPublish('BTC110k2025_PDA_abc123');

  const buyer = new BuyerAgent({
    wallet: 'BUYER_WALLET_98765432109876543210',
    agentId: 'buyer-test-001',
    maxPriceSOL: 0.05,
    minAnalystAccuracy: 0,
    minConfidence: 50,
    autoBet: true,
    maxBetAmount: 1.0,
  }, mp);

  const listings = buyer.browseMarketplace();
  assertGreaterThan(listings.length, 0);
});

await test('should evaluate listings', async () => {
  const mp = createTestMarketplace();
  const analyst = new AnalystAgent({
    wallet: 'ANALYST_WALLET_12345678901234567890',
    displayName: 'TestAnalyst',
    affiliateCode: 'TEST',
    strategy: 'fundamental',
    defaultPriceSOL: 0.01,
    minConfidenceThreshold: 50,
  }, mp);
  await analyst.initialize();
  await analyst.analyzeAndPublish('BTC110k2025_PDA_abc123');

  const buyer = new BuyerAgent({
    wallet: 'BUYER_WALLET_98765432109876543210',
    agentId: 'buyer-test-001',
    maxPriceSOL: 0.05,
    minAnalystAccuracy: 0,
    minConfidence: 50,
  }, mp);

  const listings = buyer.browseMarketplace();
  const evaluation = buyer.evaluateListing(listings[0]);
  assertGreaterThan(evaluation.score, 0);
  assert(['buy', 'skip', 'watchlist'].includes(evaluation.recommendation), 'valid recommendation');
  assertGreaterThan(evaluation.reasons.length, 0);
});

// --- Marketplace Stats ---
console.log('\n📈 Marketplace Stats');

await test('should track marketplace statistics', async () => {
  const mp = createTestMarketplace();
  const profile = await mp.registerAnalyst({ wallet: 'ANALYST_WALLET_12345678901234567890', displayName: 'TA', affiliateCode: 'TEST' });
  await mp.publishAnalysis({ analystId: profile.id, marketPda: 'BTC110k2025_PDA_abc123', thesis: 'A'.repeat(200), recommendedSide: 'YES', confidence: 80, priceSOL: 0.01 });
  const stats = mp.getMarketplaceStats();
  assertEqual(stats.totalAnalysts, 1);
  assertEqual(stats.totalAnalyses, 1);
  assertEqual(stats.activeAnalyses, 1);
});

// ─── Summary ──────────────────────────────────────────────────
console.log('\n' + '='.repeat(55));
console.log(`📊 RESULTS: ${passedTests}/${totalTests} passed, ${failedTests} failed`);

if (failures.length > 0) {
  console.log('\nFailed tests:');
  for (const f of failures) {
    console.log(`  ❌ ${f.name}: ${f.error}`);
  }
}

console.log();
process.exit(failedTests > 0 ? 1 : 0);
