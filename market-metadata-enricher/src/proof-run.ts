/**
 * Proof Run — Demonstrates the Market Metadata Enricher working against
 * real Solana mainnet data from the Baozi prediction market program.
 *
 * This script:
 * 1. Connects to Solana mainnet via the MCP server's RPC endpoint
 * 2. Fetches all markets from the on-chain program
 * 3. Enriches each active market with metadata (categories, timing, quality, descriptions)
 * 4. Outputs full enrichment results as structured proof
 */

import { listMarkets } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { PROGRAM_ID, RPC_ENDPOINT } from '@baozi.bet/mcp-server/dist/config.js';
import { Connection } from '@solana/web3.js';
import { enrichMarket } from './enrichers/index.js';
import type { MarketEnrichment } from './types/index.js';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🔍 Market Metadata Enricher — PROOF RUN');
  console.log(`  📡 Program: ${PROGRAM_ID.toBase58()}`);
  console.log(`  🌐 RPC: ${RPC_ENDPOINT}`);
  console.log(`  📅 Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Step 1: Verify Solana connection
  console.log('Step 1: Verifying Solana RPC connection...');
  const connection = new Connection(RPC_ENDPOINT);
  const slot = await connection.getSlot();
  console.log(`  ✅ Connected to Solana mainnet (slot: ${slot})\n`);

  // Step 2: Fetch all markets (single RPC call)
  console.log('Step 2: Fetching all markets from on-chain program...');
  const allMarkets = await listMarkets();
  console.log(`  ✅ Found ${allMarkets.length} total markets\n`);

  // Count by status
  const statusCounts: Record<string, number> = {};
  for (const m of allMarkets) {
    statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
  }
  console.log('  Market status breakdown:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`    ${status}: ${count}`);
  }

  // Count by layer
  const layerCounts: Record<string, number> = {};
  for (const m of allMarkets) {
    layerCounts[m.layer] = (layerCounts[m.layer] || 0) + 1;
  }
  console.log('\n  Market layer breakdown:');
  for (const [layer, count] of Object.entries(layerCounts)) {
    console.log(`    ${layer}: ${count}`);
  }

  // Step 3: Filter to active markets only
  const activeMarkets = allMarkets.filter(m => m.status === 'Active');
  console.log(`\n  Active markets to enrich: ${activeMarkets.length}\n`);

  // Step 4: Enrich each active market
  console.log('Step 3: Enriching active markets with metadata...\n');
  console.log('─────────────────────────────────────────────────────────────────\n');

  const enrichments: MarketEnrichment[] = [];

  for (let i = 0; i < activeMarkets.length; i++) {
    const market = activeMarkets[i];
    const enrichment = enrichMarket(market);
    enrichments.push(enrichment);

    console.log(`Market ${i + 1}/${activeMarkets.length}:`);
    console.log(`  📋 Question: "${market.question}"`);
    console.log(`  🔑 PDA: ${market.publicKey}`);
    console.log(`  🆔 Market ID: ${market.marketId}`);
    console.log(`  🏗️  Layer: ${market.layer}`);
    console.log(`  💰 Pool: ${market.totalPoolSol.toFixed(4)} SOL (Yes: ${market.yesPoolSol.toFixed(4)}, No: ${market.noPoolSol.toFixed(4)})`);
    console.log(`  📊 Quality Score: ${enrichment.quality.overall}/100`);
    console.log(`    - Question Clarity: ${enrichment.quality.questionClarity}/100`);
    console.log(`    - Timing Score: ${enrichment.quality.timingScore}/100`);
    console.log(`    - Liquidity Score: ${enrichment.quality.liquidityScore}/100`);
    console.log(`    - Category Relevance: ${enrichment.quality.categoryRelevance}/100`);
    console.log(`  🏷️  Categories: ${enrichment.categories.join(', ')}`);
    console.log(`  ⏰ Timing: ${enrichment.timing.urgency} urgency`);
    console.log(`    - ${enrichment.timing.timingSummary}`);
    console.log(`    - Hours until close: ${enrichment.timing.hoursUntilClose.toFixed(1)}`);
    console.log(`    - Hours until resolution: ${enrichment.timing.hoursUntilResolution.toFixed(1)}`);
    console.log(`    - Closing soon: ${enrichment.timing.isClosingSoon}`);
    console.log(`    - Short-term: ${enrichment.timing.isShortTerm}`);
    console.log(`    - Long-term: ${enrichment.timing.isLongTerm}`);
    console.log(`  📝 Description: ${enrichment.description}`);
    if (enrichment.quality.issues.length > 0) {
      console.log(`  ⚠️  Issues: ${enrichment.quality.issues.join('; ')}`);
    }
    if (enrichment.quality.suggestions.length > 0) {
      console.log(`  💡 Suggestions: ${enrichment.quality.suggestions.join('; ')}`);
    }
    console.log(`  📊 Quality Summary: ${enrichment.quality.qualitySummary}`);
    console.log('');
  }

  // Step 5: Summary statistics
  console.log('─────────────────────────────────────────────────────────────────\n');
  console.log('Step 4: Summary Statistics\n');

  const avgQuality = enrichments.reduce((sum, e) => sum + e.quality.overall, 0) / enrichments.length;
  console.log(`  📊 Average quality score: ${avgQuality.toFixed(1)}/100`);

  const categoryCounts: Record<string, number> = {};
  for (const e of enrichments) {
    for (const cat of e.categories) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }
  console.log('\n  🏷️  Category distribution:');
  const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedCats) {
    console.log(`    ${cat}: ${count} market(s)`);
  }

  const urgencyCounts: Record<string, number> = {};
  for (const e of enrichments) {
    urgencyCounts[e.timing.urgency] = (urgencyCounts[e.timing.urgency] || 0) + 1;
  }
  console.log('\n  ⏰ Urgency distribution:');
  for (const [urgency, count] of Object.entries(urgencyCounts)) {
    console.log(`    ${urgency}: ${count} market(s)`);
  }

  const highQuality = enrichments.filter(e => e.quality.overall >= 60);
  const medQuality = enrichments.filter(e => e.quality.overall >= 30 && e.quality.overall < 60);
  const lowQuality = enrichments.filter(e => e.quality.overall < 30);
  console.log('\n  📈 Quality tiers:');
  console.log(`    High (≥60): ${highQuality.length} market(s)`);
  console.log(`    Medium (30-59): ${medQuality.length} market(s)`);
  console.log(`    Low (<30): ${lowQuality.length} market(s)`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  ✅ Enrichment complete: ${enrichments.length} markets processed`);
  console.log(`  📅 ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Output JSON for machine-readable proof
  console.log('--- JSON OUTPUT ---');
  console.log(JSON.stringify(enrichments, null, 2));
}

main().catch(err => {
  console.error('Proof run failed:', err);
  process.exit(1);
});
