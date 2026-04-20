/**
 * demo.ts — End-to-end demonstration of x402 Agent Intel Marketplace
 *
 * Shows the complete flow:
 *  1. Start marketplace server
 *  2. Analyst registers
 *  3. Analyst publishes analysis behind x402 paywall
 *  4. Buyer discovers available analyses
 *  5. Buyer tries to access analysis → gets 402 with x402 payment requirements
 *  6. Analyst reputation tracking
 *  7. Analysis resolution and accuracy tracking
 */

const BASE = 'http://localhost:3040';

async function json(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const body = await res.json();
  return { status: res.status, body };
}

async function demo() {
  console.log('='.repeat(60));
  console.log('x402 AGENT INTEL MARKETPLACE — END-TO-END DEMO');
  console.log('='.repeat(60));
  console.log();

  // 1. Health check
  console.log('--- STEP 1: Health Check ---');
  const health = await json(BASE);
  console.log(`Status: ${health.status}`);
  console.log(`Name: ${health.body.name}`);
  console.log(`Treasury: ${health.body.treasury}`);
  console.log(`Network: ${health.body.network}`);
  console.log();

  // 2. Register analyst agent
  console.log('--- STEP 2: Analyst Agent Registration ---');
  const analyst = await json(`${BASE}/analysts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet: 'CryptoSageWallet111111111111111111111111111',
      name: 'CryptoSage',
      affiliateCode: 'SAGE',
    }),
  });
  console.log(`Status: ${analyst.status}`);
  console.log(`Analyst:`, JSON.stringify(analyst.body.analyst, null, 2));
  console.log();

  // 3. Analyst publishes analysis behind x402 paywall
  console.log('--- STEP 3: Publish Analysis (x402 paywall) ---');
  const thesis = `Based on comprehensive analysis of BTC $110k prediction market (PDA: BTCmarket111), ` +
    `the YES side at 62% implied probability is significantly mispriced. Historical volatility patterns ` +
    `during Q1 2026 suggest a 78% probability of BTC breaking $110k before expiry. Key catalysts include: ` +
    `1) ETF inflows averaging $500M/day, 2) Post-halving supply squeeze entering peak effect zone, ` +
    `3) Macro environment with declining rates supporting risk assets. Recommended position: YES.`;

  const analysis = await json(`${BASE}/analyses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet: 'CryptoSageWallet111111111111111111111111111',
      marketPda: 'BTCmarket111111111111111111111111111111111',
      thesis,
      recommendedSide: 'YES',
      confidence: 78,
      priceLamports: '10000000', // 0.01 SOL
    }),
  });
  console.log(`Status: ${analysis.status}`);
  console.log(`Analysis ID: ${analysis.body.analysis.id}`);
  console.log(`Affiliate Code: ${analysis.body.affiliateCode}`);
  console.log();

  // 4. Publish a second analysis
  console.log('--- STEP 4: Publish Second Analysis ---');
  const thesis2 = `ETH merge anniversary market (PDA: ETHmerge111) analysis: The market prices NO at 45% ` +
    `implied probability for ETH reaching $5k by March 2026. On-chain data shows accumulation by whales, ` +
    `with 100k+ ETH moving to cold storage in the last 30 days. Layer 2 activity up 340% YoY. ` +
    `However, resistance at $4.2k has been tested 3 times without breakthrough. ` +
    `Recommend NO position — risk/reward favors downside in near term.`;

  const analysis2 = await json(`${BASE}/analyses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet: 'CryptoSageWallet111111111111111111111111111',
      marketPda: 'ETHmerge1111111111111111111111111111111111',
      thesis: thesis2,
      recommendedSide: 'NO',
      confidence: 65,
      priceLamports: '5000000', // 0.005 SOL
    }),
  });
  console.log(`Status: ${analysis2.status}`);
  console.log(`Analysis ID: ${analysis2.body.analysis.id}`);
  console.log();

  // 5. Buyer discovers available analyses
  console.log('--- STEP 5: Buyer Discovers Analyses ---');
  const listings = await json(`${BASE}/analyses`);
  console.log(`Available analyses: ${listings.body.count}`);
  for (const a of listings.body.analyses) {
    console.log(`  [${a.id}] ${a.analyst} (${a.tier}) — ${a.recommendedSide} @ ${a.confidence}% confidence — ${a.priceLamports} lamports`);
  }
  console.log(`NOTE: thesis is hidden — buyer must pay via x402 to access`);
  console.log();

  // 6. Buyer tries to access analysis WITHOUT payment → 402
  console.log('--- STEP 6: Buyer Requests Analysis → HTTP 402 ---');
  const paywall = await json(`${BASE}/analyses/1`);
  console.log(`Status: ${paywall.status} (Payment Required)`);
  console.log(`x402 Response:`);
  console.log(JSON.stringify(paywall.body, null, 2));
  console.log();
  console.log(`The 402 response contains x402 payment requirements:`);
  console.log(`  - x402Version: ${paywall.body.x402Version}`);
  console.log(`  - Network: ${paywall.body.accepts?.[0]?.network || 'solana'}`);
  console.log(`  - Asset: USDC on Solana`);
  console.log(`  - Amount: ${paywall.body.accepts?.[0]?.maxAmountRequired || 'specified'}`);
  console.log();
  console.log(`In production, a buyer agent would:`);
  console.log(`  1. Parse x402 requirements from 402 response`);
  console.log(`  2. Create a signed Solana transaction paying the required USDC amount`);
  console.log(`  3. Encode the transaction and re-request with X-PAYMENT header`);
  console.log(`  4. Server verifies payment via facilitator and returns analysis`);
  console.log();

  // 7. Filter by market
  console.log('--- STEP 7: Filter Analyses by Market ---');
  const filtered = await json(`${BASE}/analyses?market=BTCmarket111111111111111111111111111111111`);
  console.log(`Analyses for BTC market: ${filtered.body.count}`);
  console.log();

  // 8. Resolve predictions and track accuracy
  console.log('--- STEP 8: Resolve Predictions ---');
  const resolve1 = await json(`${BASE}/analyses/1/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome: 'YES' }),
  });
  console.log(`Analysis #1: outcome=${resolve1.body.outcome}, correct=${resolve1.body.correct}`);

  const resolve2 = await json(`${BASE}/analyses/2/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome: 'YES' }),
  });
  console.log(`Analysis #2: outcome=${resolve2.body.outcome}, correct=${resolve2.body.correct}`);
  console.log();

  // 9. Check analyst reputation
  console.log('--- STEP 9: Analyst Reputation ---');
  const rep = await json(`${BASE}/analysts/CryptoSageWallet111111111111111111111111111/stats`);
  console.log(`Analyst: ${rep.body.analyst}`);
  console.log(`Stats:`, JSON.stringify(rep.body, null, 2));
  console.log();

  // 10. Duplicate resolution → 409
  console.log('--- STEP 10: Duplicate Resolution → 409 ---');
  const dup = await json(`${BASE}/analyses/1/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome: 'YES' }),
  });
  console.log(`Status: ${dup.status} (${dup.body.error})`);
  console.log();

  console.log('='.repeat(60));
  console.log('DEMO COMPLETE');
  console.log();
  console.log('Key takeaways:');
  console.log('  1. Real x402-solana library (not custom implementation)');
  console.log('  2. Server returns proper HTTP 402 with x402Version 2 protocol');
  console.log('  3. Payment flow: 402 requirements → signed tx → verify → settle → deliver');
  console.log('  4. SQLite persistence for analysts, analyses, purchases');
  console.log('  5. Reputation tracking with 5-tier system based on prediction accuracy');
  console.log('  6. Affiliate codes embedded for lifetime commission on bets');
  console.log('='.repeat(60));
}

demo().catch(console.error);
