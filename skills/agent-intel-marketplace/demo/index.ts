/**
 * Demo: End-to-End Intel Marketplace Flow
 * 
 * This demonstrates the complete flow:
 * 1. Analyst registers
 * 2. Publishes analysis
 * 3. Buyer discovers and purchases
 * 4. Buyer bets with affiliate code
 * 5. Market resolves
 * 6. Reputation updates
 */

import * as intel from '../src/index';

// Demo wallets
const ANALYST_WALLET = 'DemoAnalystWallet123456789';
const BUYER_WALLET = 'DemoBuyerWallet987654321';

async function runDemo() {
  console.log('='.repeat(60));
  console.log('x402 Agent Intel Marketplace - Demo');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Register Analyst
  console.log('📝 Step 1: Analyst Registration');
  console.log('-'.repeat(40));
  
  const registerResult = await intel.registerAnalyst(
    ANALYST_WALLET,
    'CryptoSage',
    'SAGE01'
  );
  
  if (registerResult.success) {
    console.log('✅ Analyst registered!');
    console.log(`   Name: ${registerResult.analyst?.displayName}`);
    console.log(`   Code: ${registerResult.analyst?.affiliateCode}`);
  }
  console.log();

  // Step 2: Get analyst profile
  console.log('📊 Step 2: Analyst Profile');
  console.log('-'.repeat(40));
  
  const profile = intel.getAnalystProfile(ANALYST_WALLET);
  console.log(JSON.stringify(profile, null, 2));
  console.log();

  // Step 3: Publish analysis
  console.log('📈 Step 3: Publish Market Analysis');
  console.log('-'.repeat(40));
  
  const DEMO_MARKET = 'DemoMarketAddress123';
  const DEMO_QUESTION = 'Will BTC reach $110k by end of 2024?';
  
  const publishResult = await intel.publishAnalysis(
    ANALYST_WALLET,
    DEMO_MARKET,
    DEMO_QUESTION,
    `Based on historical pattern analysis and on-chain metrics:
    
1. BTC has shown consistent 4-year cycle behavior
2. Current accumulation phase aligns with previous cycles
3. ETF inflows providing institutional validation
4. Hash rate continuing to break records
5. Historical data shows 78% probability of reaching target

Recommendation: YES at current 62% price offers value.`,
    'YES',
    78,
    0.01  // 0.01 SOL
  );
  
  if (publishResult.success) {
    console.log('✅ Analysis published!');
    console.log(`   ID: ${publishResult.analysis?.id}`);
    console.log(`   Market: ${publishResult.analysis?.marketQuestion}`);
    console.log(`   Side: ${publishResult.analysis?.recommendedSide}`);
    console.log(`   Confidence: ${publishResult.analysis?.confidence}%`);
    console.log(`   Price: ${publishResult.analysis?.priceSol} SOL`);
  }
  console.log();

  // Step 4: List available intel
  console.log('🔍 Step 4: Discover Available Intel');
  console.log('-'.repeat(40));
  
  const listings = intel.listIntel(DEMO_MARKET);
  console.log(`Found ${listings.length} analyses for this market:`);
  
  listings.forEach((listing, i) => {
    console.log(`\n  [${i + 1}] ${listing.analyst.displayName}`);
    console.log(`      Price: ${listing.priceSol} SOL`);
    console.log(`      Confidence: ${listing.confidence}%`);
    console.log(`      Side: ${listing.recommendedSide}`);
    console.log(`      Stats: ${(listing.stats.accuracy * 100).toFixed(1)}% accuracy (${listing.stats.totalAnalyses} analyses)`);
  });
  console.log();

  // Step 5: Get payment request
  console.log('💰 Step 5: Create Payment Request');
  console.log('-'.repeat(40));
  
  const paymentRequest = await intel.getPaymentRequest(
    publishResult.analysis!.id,
    BUYER_WALLET
  );
  
  if (paymentRequest.success) {
    console.log('✅ Payment request created!');
    console.log(`   To: ${paymentRequest.request?.to}`);
    console.log(`   Amount: ${paymentRequest.request?.amount} ${paymentRequest.request?.asset}`);
    console.log(`   Description: ${paymentRequest.request?.description}`);
  }
  console.log();

  // Step 6: Simulate purchase
  console.log('🛒 Step 6: Purchase Intel');
  console.log('-'.repeat(40));
  
  const purchase = await intel.purchaseIntel(
    paymentRequest.request!,
    BUYER_WALLET,
    'demo_tx_123'
  );
  
  if (purchase.success) {
    console.log('✅ Intel purchased!');
    console.log(`   TX: ${purchase.txId}`);
    console.log(`   Thesis: ${purchase.analysis?.thesis.substring(0, 100)}...`);
    console.log(`   Recommended: ${purchase.analysis?.recommendedSide}`);
    console.log(`   Confidence: ${purchase.analysis?.confidence}%`);
  }
  console.log();

  // Step 7: Bet with affiliate
  console.log('🎯 Step 7: Place Bet with Affiliate');
  console.log('-'.repeat(40));
  
  const bet = await intel.betWithIntel(
    DEMO_MARKET,
    'YES',
    1.0,
    purchase.analysis!.id
  );
  
  if (bet.success) {
    console.log('✅ Bet placed!');
    console.log(`   TX: ${bet.txId}`);
    console.log(`   Affiliate Link: ${bet.affiliateLink}`);
  }
  console.log();

  // Step 8: Check buyer purchases
  console.log('📦 Step 8: View Purchased Intel');
  console.log('-'.repeat(40));
  
  const purchases = intel.getMyPurchases(BUYER_WALLET);
  console.log(`Found ${purchases.length} purchases:`);
  purchases.forEach((p: any) => {
    console.log(`\n   Analysis ID: ${p.analysis_id}`);
    console.log(`   Thesis: ${p.thesis?.substring(0, 80)}...`);
    console.log(`   Recommended: ${p.recommendedSide}`);
    console.log(`   Affiliate: ${p.affiliateCode}`);
  });
  console.log();

  // Step 9: Simulate market resolution
  console.log('🏁 Step 9: Market Resolves');
  console.log('-'.repeat(40));
  
  const resolution = await intel.updateAnalysisResolution(
    publishResult.analysis!.id,
    'YES'  // Market resolved YES
  );
  
  if (resolution.success) {
    console.log('✅ Analysis resolved!');
    console.log(`   Correct: ${resolution.correct ? 'YES ✅' : 'NO ❌'}`);
  }
  console.log();

  // Step 10: Check updated reputation
  console.log('📊 Step 10: Updated Reputation');
  console.log('-'.repeat(40));
  
  const updatedProfile = intel.getAnalystProfile(ANALYST_WALLET);
  console.log(JSON.stringify(updatedProfile, null, 2));
  console.log();

  // Step 11: Check leaderboard
  console.log('🏆 Step 11: Leaderboard');
  console.log('-'.repeat(40));
  
  const leaderboard = intel.getLeaderboard(5);
  console.log('Top Analysts:');
  leaderboard.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.analyst} - ${(a.stats.accuracy * 100).toFixed(1)}% accuracy`);
  });
  console.log();

  console.log('='.repeat(60));
  console.log('Demo Complete! 🎉');
  console.log('='.repeat(60));
}

// Run demo
runDemo().catch(console.error);
