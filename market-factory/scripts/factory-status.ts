#!/usr/bin/env -S npx ts-node --esm
/**
 * factory-status — Show Market Factory status and performance metrics
 * 
 * Usage:
 *   scripts/factory-status         # Full status report
 *   scripts/factory-status --json  # JSON output
 */

import { loadState } from '../lib/memory.js';

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const state = loadState();
  const now = new Date();

  if (jsonOutput) {
    console.log(JSON.stringify({
      totalMarketsCreated: state.totalMarketsCreated,
      totalFeesEarnedSol: state.totalFeesEarnedSol,
      activeMarkets: state.markets.filter(m => m.status === 'active').length,
      resolvedMarkets: state.markets.filter(m => m.status === 'resolved').length,
      categoryStats: state.categoryStats,
      lastScans: state.lastScans,
      markets: state.markets,
    }, null, 2));
    return;
  }

  console.log(`\n╔═══════════════════════════════════════════════╗`);
  console.log(`║       Market Factory — Status Dashboard       ║`);
  console.log(`║       ${now.toISOString().slice(0, 19)} UTC           ║`);
  console.log(`╚═══════════════════════════════════════════════╝\n`);

  // Overview
  const active = state.markets.filter(m => m.status === 'active');
  const resolved = state.markets.filter(m => m.status === 'resolved');
  const totalVolume = state.markets.reduce((sum, m) => sum + m.volumeSol, 0);

  console.log(`📊 Overview`);
  console.log(`───────────────────────────────────────────────`);
  console.log(`  Total markets created:  ${state.totalMarketsCreated}`);
  console.log(`  Active markets:         ${active.length}`);
  console.log(`  Resolved markets:       ${resolved.length}`);
  console.log(`  Total volume:           ${totalVolume.toFixed(4)} SOL`);
  console.log(`  Total fees earned:      ${state.totalFeesEarnedSol.toFixed(6)} SOL`);

  // Category breakdown
  console.log(`\n📁 Category Performance`);
  console.log(`───────────────────────────────────────────────`);

  const categories = Object.entries(state.categoryStats)
    .filter(([_, stats]) => stats.marketsCreated > 0)
    .sort((a, b) => b[1].totalVolumeSol - a[1].totalVolumeSol);

  if (categories.length === 0) {
    console.log(`  No markets created yet.`);
  } else {
    for (const [cat, stats] of categories) {
      const accuracy = stats.resolutions.correct + stats.resolutions.incorrect > 0
        ? (stats.resolutions.correct / (stats.resolutions.correct + stats.resolutions.incorrect) * 100).toFixed(0)
        : 'N/A';
      console.log(`  ${cat.toUpperCase()}`);
      console.log(`    Markets: ${stats.marketsCreated} | Volume: ${stats.totalVolumeSol.toFixed(4)} SOL | Fees: ${stats.totalFeesEarnedSol.toFixed(6)} SOL`);
      console.log(`    Avg volume/market: ${stats.avgVolumePerMarket.toFixed(4)} SOL | Resolution accuracy: ${accuracy}%`);
    }
  }

  // Active markets
  if (active.length > 0) {
    console.log(`\n🟢 Active Markets`);
    console.log(`───────────────────────────────────────────────`);
    for (const m of active.slice(0, 10)) {
      const closesIn = Math.max(0, (new Date(m.closingTime).getTime() - now.getTime()) / (60 * 60 * 1000));
      console.log(`  "${m.question}"`);
      console.log(`    Category: ${m.category} | Volume: ${m.volumeSol.toFixed(4)} SOL | Closes in: ${closesIn.toFixed(1)}h`);
    }
    if (active.length > 10) {
      console.log(`  ... and ${active.length - 10} more`);
    }
  }

  // Last scans
  console.log(`\n⏱️ Last Scan Times`);
  console.log(`───────────────────────────────────────────────`);
  if (Object.keys(state.lastScans).length === 0) {
    console.log(`  No scans recorded yet.`);
  } else {
    for (const [source, time] of Object.entries(state.lastScans)) {
      const ago = ((now.getTime() - new Date(time).getTime()) / (60 * 1000)).toFixed(0);
      console.log(`  ${source}: ${time} (${ago} min ago)`);
    }
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
