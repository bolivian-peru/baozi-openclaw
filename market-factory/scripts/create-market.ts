#!/usr/bin/env -S npx ts-node --esm
/**
 * create-market — Manually create a single prediction market
 * 
 * Usage:
 *   scripts/create-market --question "Will SOL be above $200 by March 1?" \
 *     --closing-time "2026-03-01T00:00:00Z" \
 *     --category crypto \
 *     --resolution-source "CoinGecko SOL/USD price"
 * 
 *   scripts/create-market --question "Will Lakers beat Celtics on Feb 25?" \
 *     --closing-time "2026-02-25T01:00:00Z" \
 *     --category sports \
 *     --resolution-source "ESPN NBA game results" \
 *     --dry-run
 */

import { createLabMarket, previewMarketCreation } from '../lib/baozi-client.js';
import { loadState, saveState, addMarketRecord } from '../lib/memory.js';
import { MARKET_DEFAULTS } from '../lib/config.js';
import type { MarketCreateParams, MarketRecord } from '../lib/types.js';
import type { MarketCategory } from '../lib/config.js';

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      result[args[i].slice(2)] = args[i + 1];
      i++;
    } else if (args[i].startsWith('--')) {
      result[args[i].slice(2)] = 'true';
    }
  }
  return result;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.question) {
    console.error('Usage: create-market --question "..." --closing-time "ISO8601" [--category crypto] [--resolution-source "..."] [--dry-run]');
    process.exit(1);
  }

  const question = opts.question;
  const closingTime = opts['closing-time']
    ? new Date(opts['closing-time'])
    : new Date(Date.now() + 48 * 60 * 60 * 1000); // Default: 48h from now
  const category = (opts.category || 'crypto') as MarketCategory;
  const resolutionSource = opts['resolution-source'] || 'Manual verification';
  const dryRun = opts['dry-run'] === 'true';

  const resolutionTime = new Date(
    closingTime.getTime() + MARKET_DEFAULTS.RESOLUTION_BUFFER_HOURS * 60 * 60 * 1000
  );

  const params: MarketCreateParams = {
    question,
    closingTime,
    resolutionTime,
    category,
    eventId: `manual:${Date.now()}`,
    marketType: 'boolean',
    resolutionSource,
  };

  console.log('\n📊 Market Preview');
  console.log('─────────────────────────────────');
  console.log(`Question:     ${params.question}`);
  console.log(`Category:     ${params.category}`);
  console.log(`Closing:      ${params.closingTime.toISOString()}`);
  console.log(`Resolution:   ${params.resolutionTime.toISOString()}`);
  console.log(`Source:        ${params.resolutionSource}`);

  // Validate
  const preview = await previewMarketCreation(params);
  console.log(`\nValidation: ${preview.valid ? '✅ Valid' : '❌ Invalid'}`);
  if (preview.errors.length > 0) {
    console.log('Errors:', preview.errors.join(', '));
  }
  if (preview.warnings.length > 0) {
    console.log('Warnings:', preview.warnings.join(', '));
  }
  console.log(`Estimated cost: ${preview.estimatedCostSol} SOL`);

  if (!preview.valid) {
    console.error('\n❌ Market validation failed. Fix errors and retry.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN — no market created.');
    return;
  }

  console.log('\n🔨 Creating market...');
  const result = await createLabMarket(params);

  if (result.success) {
    console.log('\n✅ Market created!');
    console.log(`  Market ID:     ${result.marketId}`);
    console.log(`  Address:       ${result.marketAddress}`);
    console.log(`  TX Signature:  ${result.txSignature}`);

    // Track in memory
    const state = loadState();
    const record: MarketRecord = {
      eventId: params.eventId,
      marketId: result.marketId || 'unknown',
      marketAddress: result.marketAddress || 'unknown',
      question: params.question,
      category: params.category,
      createdAt: new Date().toISOString(),
      closingTime: params.closingTime.toISOString(),
      resolutionTime: params.resolutionTime.toISOString(),
      resolutionSource: params.resolutionSource,
      txSignature: result.txSignature || '',
      status: 'active',
      volumeSol: 0,
      feesEarnedSol: 0,
    };
    addMarketRecord(state, record);
    saveState(state);
  } else {
    console.error('\n❌ Failed to create market:', result.error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
