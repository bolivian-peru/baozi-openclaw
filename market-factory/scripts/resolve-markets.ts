#!/usr/bin/env -S npx ts-node --esm
/**
 * resolve-markets — Check and resolve markets whose events have concluded
 * 
 * Pipeline:
 * 1. Load tracked markets from memory
 * 2. Filter for markets past their closing time
 * 3. For each, attempt to determine outcome from resolution source
 * 4. Call close-market (permissionless)
 * 5. Call propose-resolution with outcome
 * 6. Track resolution in memory
 * 
 * Usage:
 *   scripts/resolve-markets            # Check and resolve all eligible
 *   scripts/resolve-markets --dry-run  # Show what would be resolved
 *   scripts/resolve-markets --json     # Output as JSON
 */

import { loadState, saveState, markResolved } from '../lib/memory.js';
import { closeMarket, resolveMarket } from '../lib/baozi-client.js';
import type { MarketRecord, ResolutionResult } from '../lib/types.js';

// =============================================================================
// Resolution Logic by Category
// =============================================================================

async function determineOutcome(market: MarketRecord): Promise<{
  outcome: 'yes' | 'no' | null;
  evidence: string;
  source: string;
}> {
  const question = market.question.toLowerCase();

  // Crypto price resolution
  if (market.category === 'crypto') {
    return await resolveCryptoMarket(market);
  }

  // Sports resolution via ESPN
  if (market.category === 'sports') {
    return await resolveSportsMarket(market);
  }

  // Default: cannot auto-resolve
  return {
    outcome: null,
    evidence: 'Auto-resolution not available for this category',
    source: market.resolutionSource,
  };
}

async function resolveCryptoMarket(market: MarketRecord): Promise<{
  outcome: 'yes' | 'no' | null;
  evidence: string;
  source: string;
}> {
  const question = market.question;

  // Parse "Will X be above $Y at Z?"
  const priceMatch = question.match(/will\s+(\w+)\s+(?:be\s+)?above\s+\$([0-9,.]+)/i);
  if (!priceMatch) {
    return { outcome: null, evidence: 'Could not parse price target from question', source: market.resolutionSource };
  }

  const symbol = priceMatch[1].toUpperCase();
  const target = parseFloat(priceMatch[2].replace(/,/g, ''));

  // Map symbol to CoinGecko ID
  const symbolToId: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'DOGE': 'dogecoin',
    'SUI': 'sui',
  };

  const tokenId = symbolToId[symbol];
  if (!tokenId) {
    return { outcome: null, evidence: `Unknown token symbol: ${symbol}`, source: market.resolutionSource };
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) {
      return { outcome: null, evidence: `CoinGecko API error: ${resp.status}`, source: 'CoinGecko' };
    }

    const data = await resp.json() as Record<string, { usd: number }>;
    const currentPrice = data[tokenId]?.usd;
    if (!currentPrice) {
      return { outcome: null, evidence: 'No price data from CoinGecko', source: 'CoinGecko' };
    }

    const isAbove = currentPrice > target;
    return {
      outcome: isAbove ? 'yes' : 'no',
      evidence: `${symbol} price at resolution: $${currentPrice.toFixed(2)} (target: $${target.toFixed(2)}) → ${isAbove ? 'ABOVE' : 'BELOW'}`,
      source: `CoinGecko ${symbol}/USD`,
    };
  } catch (err) {
    return { outcome: null, evidence: `Price fetch failed: ${err}`, source: 'CoinGecko' };
  }
}

async function resolveSportsMarket(market: MarketRecord): Promise<{
  outcome: 'yes' | 'no' | null;
  evidence: string;
  source: string;
}> {
  // For sports markets, we need the ESPN event ID from metadata
  // This would be stored in the market's eventId
  const espnMatch = market.eventId.match(/sports:(\w+):(\w+):(\w+)/);
  if (!espnMatch) {
    return { outcome: null, evidence: 'No ESPN event ID available', source: market.resolutionSource };
  }

  const [, sport, league, eventId] = espnMatch;

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard/${eventId}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) {
      return { outcome: null, evidence: `ESPN API error: ${resp.status}`, source: 'ESPN' };
    }

    const data = await resp.json() as any;
    const competition = data?.competitions?.[0];
    if (!competition || !competition.status?.type?.completed) {
      return { outcome: null, evidence: 'Game not yet completed', source: 'ESPN' };
    }

    // Check if first listed competitor won
    const competitors = competition.competitors || [];
    if (competitors.length < 2) {
      return { outcome: null, evidence: 'Competitor data missing', source: 'ESPN' };
    }

    const isFirstWinner = competitors[0].winner === true;
    const score = `${competitors[0].score}-${competitors[1].score}`;

    return {
      outcome: isFirstWinner ? 'yes' : 'no',
      evidence: `Final score: ${score}. ${competitors[0].team?.displayName || 'Team A'} ${isFirstWinner ? 'won' : 'lost'}.`,
      source: 'ESPN',
    };
  } catch (err) {
    return { outcome: null, evidence: `ESPN fetch failed: ${err}`, source: 'ESPN' };
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const jsonOutput = args.includes('--json');

  const state = loadState();
  const now = new Date();

  // Find markets past their closing time that haven't been resolved
  const eligible = state.markets.filter(m =>
    m.status === 'active' &&
    new Date(m.closingTime) < now
  );

  if (!jsonOutput) {
    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`  Market Factory — Resolution Check`);
    console.log(`  ${now.toISOString()}`);
    console.log(`═══════════════════════════════════════════════\n`);
    console.log(`Total tracked markets: ${state.markets.length}`);
    console.log(`Eligible for resolution: ${eligible.length}\n`);
  }

  const results: ResolutionResult[] = [];

  for (const market of eligible) {
    if (!jsonOutput) {
      console.log(`\n📊 Checking: "${market.question}"`);
    }

    // Determine outcome
    const { outcome, evidence, source } = await determineOutcome(market);

    if (outcome === null) {
      if (!jsonOutput) {
        console.log(`  ⏳ Cannot determine outcome yet: ${evidence}`);
      }
      results.push({
        marketId: market.marketId,
        marketAddress: market.marketAddress,
        outcome: 'no', // placeholder
        evidence,
        source,
        resolved: false,
      });
      continue;
    }

    if (!jsonOutput) {
      console.log(`  📋 Outcome: ${outcome.toUpperCase()}`);
      console.log(`  📝 Evidence: ${evidence}`);
    }

    if (dryRun) {
      if (!jsonOutput) {
        console.log(`  🔍 DRY RUN — would resolve as ${outcome}`);
      }
      results.push({
        marketId: market.marketId,
        marketAddress: market.marketAddress,
        outcome,
        evidence,
        source,
        resolved: false,
      });
      continue;
    }

    // Step 1: Close market
    if (!jsonOutput) console.log(`  🔒 Closing market...`);
    const closeResult = await closeMarket(market.marketAddress);
    if (!closeResult.success) {
      if (!jsonOutput) console.log(`  ⚠ Close failed: ${closeResult.error} (may already be closed)`);
    }

    // Step 2: Propose resolution
    if (!jsonOutput) console.log(`  🗳️ Proposing resolution: ${outcome}...`);
    const resolveResult = await resolveMarket(market.marketAddress, outcome);
    if (resolveResult.success) {
      markResolved(state, market.marketId, outcome, true);
      if (!jsonOutput) console.log(`  ✅ Resolved as ${outcome}`);
      results.push({
        marketId: market.marketId,
        marketAddress: market.marketAddress,
        outcome,
        evidence,
        source,
        resolved: true,
      });
    } else {
      if (!jsonOutput) console.log(`  ❌ Resolution failed: ${resolveResult.error}`);
      results.push({
        marketId: market.marketId,
        marketAddress: market.marketAddress,
        outcome,
        evidence,
        source,
        resolved: false,
        error: resolveResult.error,
      });
    }
  }

  saveState(state);

  if (jsonOutput) {
    console.log(JSON.stringify({
      eligible: eligible.length,
      resolved: results.filter(r => r.resolved).length,
      pending: results.filter(r => !r.resolved).length,
      results,
    }, null, 2));
  } else {
    const resolved = results.filter(r => r.resolved).length;
    console.log(`\n───────────────────────────────────────────────`);
    console.log(`  Summary: ${resolved}/${eligible.length} resolved`);
    console.log(`───────────────────────────────────────────────\n`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
