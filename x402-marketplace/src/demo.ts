/**
 * x402 Agent Intel Marketplace — End-to-End Demo
 * 
 * Demonstrates the complete flow:
 * 1. Analyst registers and publishes analysis
 * 2. Buyer discovers, evaluates, and purchases analysis
 * 3. Buyer places bet using analyst's affiliate code
 * 4. Market resolves and analyst accuracy is updated
 * 5. Leaderboard shows final standings
 * 
 * Run: npx ts-node src/demo.ts
 */

import { AgentIntelMarketplace } from './marketplace/index.js';
import { AnalystAgent } from './agents/analyst-agent.js';
import { BuyerAgent } from './agents/buyer-agent.js';

async function runDemo() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     x402 Agent Intel Marketplace — End-to-End Demo         ║');
  console.log('║     Agent-to-Agent Prediction Market Analysis Trading      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ─── Step 1: Initialize Marketplace ───────────────────────────
  console.log('━━━ Step 1: Initialize Marketplace ━━━\n');
  
  const marketplace = new AgentIntelMarketplace({
    facilitatorWallet: 'FACILITATOR_WALLET_xyz123',
  });
  
  console.log('✅ Marketplace initialized');
  console.log(`   Available markets: ${(await marketplace.baoziClient.listMarkets()).length}\n`);

  // ─── Step 2: Register Analyst Agents ──────────────────────────
  console.log('━━━ Step 2: Register Analyst Agents ━━━\n');

  const analyst1 = new AnalystAgent({
    wallet: 'ANALYST1_WALLET_CryptoSage_abc123456789',
    displayName: 'CryptoSage',
    affiliateCode: 'SAGE',
    bio: 'Crypto market analyst with 78% accuracy. Specializes in BTC and ETH markets.',
    strategy: 'fundamental',
    defaultPriceSOL: 0.01,
    minConfidenceThreshold: 55,
  }, marketplace);

  const analyst2 = new AnalystAgent({
    wallet: 'ANALYST2_WALLET_AlphaSeeker_def456789012',
    displayName: 'AlphaSeeker',
    affiliateCode: 'ALPHA',
    bio: 'Contrarian analyst finding mispriced markets. High risk, high reward.',
    strategy: 'contrarian',
    defaultPriceSOL: 0.02,
    minConfidenceThreshold: 60,
  }, marketplace);

  const analyst3 = new AnalystAgent({
    wallet: 'ANALYST3_WALLET_DataDriven_ghi789012345',
    displayName: 'DataDriven',
    affiliateCode: 'DATA',
    bio: 'Sentiment-based analysis using volume and liquidity signals.',
    strategy: 'sentiment',
    defaultPriceSOL: 0.015,
    minConfidenceThreshold: 55,
  }, marketplace);

  await analyst1.initialize();
  await analyst2.initialize();
  await analyst3.initialize();

  console.log(`✅ Registered: ${analyst1.getProfile()!.displayName} (${analyst1.getProfile()!.affiliateCode})`);
  console.log(`✅ Registered: ${analyst2.getProfile()!.displayName} (${analyst2.getProfile()!.affiliateCode})`);
  console.log(`✅ Registered: ${analyst3.getProfile()!.displayName} (${analyst3.getProfile()!.affiliateCode})\n`);

  // ─── Step 3: Analysts Publish Analyses ────────────────────────
  console.log('━━━ Step 3: Analysts Publish Market Analyses ━━━\n');

  const markets = await marketplace.baoziClient.listMarkets();
  
  // Each analyst analyzes different markets
  const analysis1 = await analyst1.analyzeAndPublish('BTC110k2025_PDA_abc123', 0.01);
  console.log(`📊 ${analyst1.getProfile()!.displayName} published:`);
  console.log(`   Market: ${analysis1.marketTitle}`);
  console.log(`   Side: ${analysis1.recommendedSide} | Confidence: ${analysis1.confidence}%`);
  console.log(`   Price: ${analysis1.priceSOL} SOL via x402\n`);

  const analysis2 = await analyst2.analyzeAndPublish('ETH5k2025_PDA_def456', 0.02);
  console.log(`📊 ${analyst2.getProfile()!.displayName} published:`);
  console.log(`   Market: ${analysis2.marketTitle}`);
  console.log(`   Side: ${analysis2.recommendedSide} | Confidence: ${analysis2.confidence}%`);
  console.log(`   Price: ${analysis2.priceSOL} SOL via x402\n`);

  const analysis3 = await analyst3.analyzeAndPublish('FED_RATE_PDA_jkl012', 0.015);
  console.log(`📊 ${analyst3.getProfile()!.displayName} published:`);
  console.log(`   Market: ${analysis3.marketTitle}`);
  console.log(`   Side: ${analysis3.recommendedSide} | Confidence: ${analysis3.confidence}%`);
  console.log(`   Price: ${analysis3.priceSOL} SOL via x402\n`);

  // Analysts also bet on their own analysis
  const ownBet = await analyst1.betOnOwnAnalysis(analysis1.id, 0.5);
  console.log(`🎰 CryptoSage bet 0.5 SOL on own analysis (${analysis1.recommendedSide})\n`);

  // ─── Step 4: Buyer Agent Discovers & Purchases ────────────────
  console.log('━━━ Step 4: Buyer Agent Discovers & Purchases ━━━\n');

  const buyer = new BuyerAgent({
    wallet: 'BUYER_WALLET_SmartMoney_jkl012345678',
    agentId: 'smart-money-agent-001',
    maxPriceSOL: 0.05,
    minAnalystAccuracy: 0,  // Accept all for demo
    minConfidence: 50,
    maxBetAmount: 1.0,
    autoBet: true,
    betSizingStrategy: 'proportional',
  }, marketplace);

  // Browse marketplace
  const listings = buyer.browseMarketplace();
  console.log(`🔍 Buyer found ${listings.length} analyses on marketplace:\n`);

  for (const listing of listings) {
    const evaluation = buyer.evaluateListing(listing);
    console.log(`   📋 "${listing.analysis.marketTitle}"`);
    console.log(`      Analyst: ${listing.analyst.displayName} | Tier: ${listing.reputation.tier}`);
    console.log(`      Side: ${listing.analysis.recommendedSide} | Confidence: ${listing.analysis.confidence}%`);
    console.log(`      Price: ${listing.analysis.priceSOL} SOL`);
    console.log(`      Preview: "${listing.preview}"`);
    console.log(`      Evaluation: Score ${evaluation.score} → ${evaluation.recommendation}`);
    console.log(`      Reasons: ${evaluation.reasons.join(', ')}\n`);
  }

  // Execute discover-and-act flow
  console.log('━━━ Step 5: Buyer Executes Purchases & Bets ━━━\n');
  
  const results = await buyer.discoverAndAct();
  console.log(`📈 Buyer agent results:`);
  console.log(`   Evaluated: ${results.evaluated} analyses`);
  console.log(`   Purchased: ${results.purchased}`);
  console.log(`   Bets placed: ${results.betsPlaced}\n`);

  for (const action of results.actions) {
    const emoji = action.action === 'purchased' ? '💰' : action.action === 'bet' ? '🎲' : '⏭️';
    console.log(`   ${emoji} [${action.action.toUpperCase()}] ${action.details}`);
  }
  console.log();

  // ─── Step 6: x402 Payment Details ─────────────────────────────
  console.log('━━━ Step 6: x402 Payment Protocol Details ━━━\n');

  const paymentStats = marketplace.paymentProtocol.getStats();
  console.log(`💳 x402 Payment Stats:`);
  console.log(`   Total payments: ${paymentStats.totalPayments}`);
  console.log(`   Total volume: ${paymentStats.totalVolume.toFixed(4)} SOL`);
  console.log(`   Pending: ${paymentStats.pendingCount}\n`);

  // Show buyer's portfolio
  const portfolio = buyer.getPortfolioSummary();
  console.log(`📊 Buyer Portfolio:`);
  console.log(`   Spent on analyses: ${portfolio.totalSpentOnAnalyses.toFixed(4)} SOL`);
  console.log(`   Total bet: ${portfolio.totalBetAmount.toFixed(4)} SOL`);
  console.log(`   Analyses purchased: ${portfolio.analysesCount}`);
  console.log(`   Bets placed: ${portfolio.betsCount}`);
  console.log(`   Unique markets: ${portfolio.uniqueMarkets}`);
  console.log(`   Unique analysts: ${portfolio.uniqueAnalysts}\n`);

  // ─── Step 7: Market Resolution ────────────────────────────────
  console.log('━━━ Step 7: Market Resolution & Accuracy Update ━━━\n');

  // Simulate market resolutions
  marketplace.baoziClient.resolveMarket('BTC110k2025_PDA_abc123', 0); // YES wins
  marketplace.baoziClient.resolveMarket('ETH5k2025_PDA_def456', 1); // NO wins
  marketplace.baoziClient.resolveMarket('FED_RATE_PDA_jkl012', 1); // NO wins

  const resolution1 = await marketplace.resolveMarketAnalyses('BTC110k2025_PDA_abc123');
  const resolution2 = await marketplace.resolveMarketAnalyses('ETH5k2025_PDA_def456');
  const resolution3 = await marketplace.resolveMarketAnalyses('FED_RATE_PDA_jkl012');

  for (const r of [...resolution1, ...resolution2, ...resolution3]) {
    const analyst = marketplace.getAnalyst(r.analystId);
    console.log(`   ${r.correct ? '✅' : '❌'} ${analyst?.displayName}: ${r.correct ? 'CORRECT' : 'INCORRECT'} (accuracy: ${(r.newAccuracy * 100).toFixed(1)}%)`);
  }
  console.log();

  // ─── Step 8: Leaderboard ──────────────────────────────────────
  console.log('━━━ Step 8: Analyst Leaderboard ━━━\n');

  const leaderboard = marketplace.getLeaderboard();
  for (let i = 0; i < leaderboard.length; i++) {
    const rep = leaderboard[i];
    const analyst = marketplace.getAnalyst(rep.analystId);
    console.log(`   ${i + 1}. ${analyst?.displayName} [${rep.tier.toUpperCase()}]`);
    console.log(`      Accuracy: ${(rep.accuracy * 100).toFixed(1)}% | Analyses: ${rep.totalAnalyses} | Sold: ${rep.totalSold}`);
    console.log(`      Revenue: ${rep.revenueX402.toFixed(4)} SOL (x402) + ${rep.revenueAffiliate.toFixed(4)} SOL (affiliate)`);
    console.log(`      Streak: ${rep.streak} | Best: ${rep.bestStreak}\n`);
  }

  // ─── Step 9: Marketplace Stats ────────────────────────────────
  console.log('━━━ Step 9: Marketplace Statistics ━━━\n');

  const stats = marketplace.getMarketplaceStats();
  console.log(`📈 Marketplace Stats:`);
  console.log(`   Total analysts: ${stats.totalAnalysts}`);
  console.log(`   Total analyses: ${stats.totalAnalyses}`);
  console.log(`   Total purchases: ${stats.totalPurchases}`);
  console.log(`   Active analyses: ${stats.activeAnalyses}`);
  console.log(`   Payment volume: ${stats.paymentStats.totalVolume.toFixed(4)} SOL\n`);

  // ─── Event Log ────────────────────────────────────────────────
  console.log('━━━ Event Log (last 10) ━━━\n');
  
  const events = marketplace.getEvents(10);
  for (const event of events) {
    console.log(`   📌 ${event.type}`);
  }
  console.log();

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     Demo Complete! 🎉                       ║');
  console.log('║                                                              ║');
  console.log('║  The x402 Agent Intel Marketplace enables:                   ║');
  console.log('║  • Analyst agents to monetize their prediction accuracy      ║');
  console.log('║  • Buyer agents to purchase proven market intel              ║');
  console.log('║  • x402 micropayments for frictionless agent-to-agent trade  ║');
  console.log('║  • Reputation tracking for trust and price discovery         ║');
  console.log('║  • Affiliate commissions for aligned incentives              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

// Run the demo
runDemo().catch(console.error);
