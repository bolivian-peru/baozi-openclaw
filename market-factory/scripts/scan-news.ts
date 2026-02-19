#!/usr/bin/env -S npx ts-node --esm
/**
 * scan-news — Scan all news/event sources for potential markets
 * 
 * Usage:
 *   scripts/scan-news                      # Scan all sources, create markets
 *   scripts/scan-news --dry-run            # Scan and validate, don't create
 *   scripts/scan-news --source crypto      # Only scan crypto source
 *   scripts/scan-news --source rss         # Only scan RSS feeds
 *   scripts/scan-news --source sports      # Only scan sports/esports
 *   scripts/scan-news --max 3              # Create at most 3 markets
 *   scripts/scan-news --json               # Output as JSON
 */

import { scanAllSources, scanCryptoMilestones, scanRSSFeeds, scanSportsEvents } from '../lib/sources/index.js';
import { runPipeline } from '../lib/market-generator.js';
import { updateLastScan, loadState, saveState } from '../lib/memory.js';
import type { DetectedEvent } from '../lib/types.js';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const jsonOutput = args.includes('--json');
  const sourceIdx = args.indexOf('--source');
  const source = sourceIdx >= 0 ? args[sourceIdx + 1] : 'all';
  const maxIdx = args.indexOf('--max');
  const maxMarkets = maxIdx >= 0 ? parseInt(args[maxIdx + 1]) : 5;

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  if (!jsonOutput) {
    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`  Market Factory — Scan  ${timestamp}`);
    console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'} | Source: ${source} | Max: ${maxMarkets}`);
    console.log(`═══════════════════════════════════════════════\n`);
  }

  // Scan sources
  let events: DetectedEvent[] = [];

  switch (source) {
    case 'crypto':
      events = await scanCryptoMilestones();
      break;
    case 'rss':
      events = await scanRSSFeeds();
      break;
    case 'sports':
      events = await scanSportsEvents();
      break;
    case 'all':
    default:
      events = await scanAllSources();
      break;
  }

  // Update last scan time
  const state = loadState();
  updateLastScan(state, source);
  saveState(state);

  if (events.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ scanned: 0, created: 0, events: [] }));
    } else {
      console.log('\nNo prediction-worthy events detected this scan.');
    }
    return;
  }

  // Run pipeline
  const result = await runPipeline(events, dryRun, maxMarkets);

  if (jsonOutput) {
    console.log(JSON.stringify({
      scanned: result.scanned,
      filtered: result.filtered,
      duplicates: result.duplicates,
      created: result.created,
      failed: result.failed,
      markets: result.markets.map(m => ({
        question: m.question,
        category: m.category,
        closingTime: m.closingTime,
        marketId: m.marketId,
        marketAddress: m.marketAddress,
      })),
      errors: result.errors,
    }, null, 2));
  } else {
    console.log('\n───────────────────────────────────────────────');
    console.log('  Scan Results');
    console.log('───────────────────────────────────────────────');
    console.log(`  Events scanned:  ${result.scanned}`);
    console.log(`  Filtered out:    ${result.filtered}`);
    console.log(`  Duplicates:      ${result.duplicates}`);
    console.log(`  Markets created: ${result.created}`);
    console.log(`  Failures:        ${result.failed}`);

    if (result.markets.length > 0) {
      console.log('\n  Created Markets:');
      for (const m of result.markets) {
        console.log(`    • "${m.question}"`);
        console.log(`      Category: ${m.category} | ID: ${m.marketId}`);
      }
    }

    if (result.errors.length > 0) {
      console.log('\n  Errors:');
      for (const err of result.errors) {
        console.log(`    ⚠ ${err}`);
      }
    }
    console.log('');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
