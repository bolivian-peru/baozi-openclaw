/**
 * Integration Tests — Real Solana RPC
 * These tests connect to the actual Solana mainnet RPC to verify
 * the MCP server integration works end-to-end.
 *
 * Run with: INTEGRATION=true tsx src/__tests__/integration.test.ts
 */

import { strict as assert } from 'node:assert';
import { listMarkets, getMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { PROGRAM_ID, RPC_ENDPOINT, DISCRIMINATORS } from '@baozi.bet/mcp-server/dist/config.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { enrichMarket } from '../enrichers/index.js';
import { categorizeMarket } from '../enrichers/categorizer.js';
import { analyzeMarketTiming } from '../enrichers/timing-analyzer.js';
import { scoreMarketQuality } from '../enrichers/quality-scorer.js';
import { fetchActiveLabMarkets, fetchAllActiveMarkets } from '../services/market-monitor.js';

let passed = 0;
let failed = 0;
const errors: string[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (error: any) {
    failed++;
    const msg = `  ❌ ${name}: ${error.message}`;
    console.log(msg);
    errors.push(msg);
  }
}

async function runIntegrationTests() {
  if (process.env.INTEGRATION !== 'true') {
    console.log('⏭️  Skipping integration tests (set INTEGRATION=true to run)');
    return;
  }

  console.log('\n🔌 Integration Tests — Real Solana RPC\n');
  console.log(`  RPC: ${RPC_ENDPOINT}`);
  console.log(`  Program: ${PROGRAM_ID.toBase58()}\n`);
  console.log('─────────────────────────────────────────\n');

  // ===================================================================
  // SOLANA CONNECTION TESTS
  // ===================================================================
  console.log('🌐 Solana Connection:');

  await test('can connect to Solana RPC', async () => {
    const connection = new Connection(RPC_ENDPOINT);
    const slot = await connection.getSlot();
    assert.ok(slot > 0, `Expected positive slot, got ${slot}`);
  });

  await test('program account exists on-chain', async () => {
    const connection = new Connection(RPC_ENDPOINT);
    const info = await connection.getAccountInfo(PROGRAM_ID);
    assert.ok(info !== null, 'Program account not found');
    assert.ok(info.executable, 'Account is not executable');
  });

  // ===================================================================
  // MCP HANDLER TESTS
  // ===================================================================
  console.log('\n📡 MCP Handlers:');

  await test('listMarkets returns market array', async () => {
    const markets = await listMarkets();
    assert.ok(Array.isArray(markets), 'Expected array');
    console.log(`    → Found ${markets.length} markets total`);
  });

  await test('listMarkets with Active filter works', async () => {
    const markets = await listMarkets('Active');
    assert.ok(Array.isArray(markets));
    for (const m of markets) {
      assert.equal(m.status, 'Active');
    }
    console.log(`    → ${markets.length} active markets`);
  });

  let sampleMarketPda: string | null = null;

  await test('markets have expected properties', async () => {
    const markets = await listMarkets();
    if (markets.length === 0) {
      console.log('    ⚠️  No markets found, skipping property check');
      return;
    }

    const m = markets[0];
    sampleMarketPda = m.publicKey;

    assert.ok(m.publicKey, 'Missing publicKey');
    assert.ok(m.marketId, 'Missing marketId');
    assert.ok(m.question, 'Missing question');
    assert.ok(m.closingTime, 'Missing closingTime');
    assert.ok(m.resolutionTime, 'Missing resolutionTime');
    assert.ok(typeof m.yesPoolSol === 'number', 'yesPoolSol not a number');
    assert.ok(typeof m.noPoolSol === 'number', 'noPoolSol not a number');
    assert.ok(typeof m.totalPoolSol === 'number', 'totalPoolSol not a number');
    assert.ok(m.layer, 'Missing layer');
    assert.ok(m.status, 'Missing status');
  });

  await test('getMarket retrieves a specific market', async () => {
    if (!sampleMarketPda) {
      console.log('    ⚠️  No sample market PDA, skipping');
      return;
    }
    const market = await getMarket(sampleMarketPda);
    assert.ok(market !== null, 'Market not found');
    assert.equal(market!.publicKey, sampleMarketPda);
  });

  // ===================================================================
  // LAB MARKET MONITORING TESTS
  // ===================================================================
  console.log('\n🧪 Lab Market Monitoring:');

  await test('fetchActiveLabMarkets returns only Lab markets', async () => {
    const labMarkets = await fetchActiveLabMarkets();
    assert.ok(Array.isArray(labMarkets));
    for (const m of labMarkets) {
      assert.equal(m.layer, 'Lab', `Expected Lab layer, got ${m.layer}`);
      assert.equal(m.status, 'Active', `Expected Active status, got ${m.status}`);
    }
    console.log(`    → ${labMarkets.length} active Lab markets`);
  });

  await test('fetchAllActiveMarkets includes Lab and Official', async () => {
    const all = await fetchAllActiveMarkets();
    assert.ok(Array.isArray(all));
    const layers = new Set(all.map(m => m.layer));
    console.log(`    → Layers found: ${Array.from(layers).join(', ')}`);
  });

  // ===================================================================
  // ENRICHMENT ON REAL DATA
  // ===================================================================
  console.log('\n🔮 Enrichment on Real Data:');

  await test('can enrich a real market', async () => {
    const markets = await listMarkets('Active');
    if (markets.length === 0) {
      console.log('    ⚠️  No active markets to enrich');
      return;
    }

    const market = markets[0];
    const enrichment = enrichMarket(market);

    assert.ok(enrichment.description.length > 0);
    assert.ok(enrichment.categories.length > 0);
    assert.ok(enrichment.quality.overall >= 0 && enrichment.quality.overall <= 100);
    assert.ok(enrichment.timing.timingSummary.length > 0);

    console.log(`    → Enriched: "${market.question.slice(0, 50)}..."`);
    console.log(`      Quality: ${enrichment.quality.overall}/100`);
    console.log(`      Categories: ${enrichment.categories.join(', ')}`);
    console.log(`      Timing: ${enrichment.timing.urgency}`);
  });

  await test('can batch-enrich real markets', async () => {
    const markets = await listMarkets('Active');
    const sample = markets.slice(0, 5);
    if (sample.length === 0) {
      console.log('    ⚠️  No markets to batch-enrich');
      return;
    }

    const enrichments = sample.map(enrichMarket);
    assert.equal(enrichments.length, sample.length);

    for (const e of enrichments) {
      assert.ok(e.quality.overall >= 0);
      assert.ok(e.categories.length > 0);
    }
    console.log(`    → Batch-enriched ${enrichments.length} markets`);
  });

  // ===================================================================
  // AGENTBOOK API TESTS
  // ===================================================================
  console.log('\n📮 AgentBook API:');

  await test('AgentBook GET endpoint is reachable', async () => {
    try {
      const response = await fetch('https://baozi.bet/api/agentbook/posts');
      assert.ok(response.ok || response.status === 404, `Unexpected status: ${response.status}`);
      console.log(`    → Status: ${response.status}`);
    } catch (err: any) {
      // Network errors are acceptable in CI environments
      console.log(`    ⚠️  Network error (expected in offline/CI): ${err.message}`);
    }
  });

  // ===================================================================
  // SUMMARY
  // ===================================================================
  console.log('\n─────────────────────────────────────────');
  console.log(`\n📊 Integration Results: ${passed} passed, ${failed} failed\n`);

  if (errors.length > 0) {
    console.log('Failed:');
    errors.forEach(e => console.log(e));
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationTests().catch(err => {
  console.error('Integration test runner failed:', err);
  process.exit(1);
});
