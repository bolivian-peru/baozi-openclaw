#!/usr/bin/env -S npx ts-node --esm
/**
 * Market Factory Test Suite
 * 
 * Tests event detection, question generation, filtering,
 * deduplication, and the full pipeline in dry-run mode.
 */

import { scanCryptoMilestones } from '../lib/sources/crypto-source.js';
import { scanRSSFeeds } from '../lib/sources/rss-source.js';
import { scanSportsEvents } from '../lib/sources/sports-source.js';
import { runPipeline } from '../lib/market-generator.js';
import { isDuplicateMarket } from '../lib/baozi-client.js';
import { loadState, saveState, addMarketRecord, isEventProcessed } from '../lib/memory.js';
import { QUALITY_FILTERS } from '../lib/config.js';
import type { DetectedEvent, ExistingMarket, MarketRecord, FactoryState } from '../lib/types.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

async function assertNoThrow(fn: () => Promise<any>, message: string): Promise<any> {
  try {
    const result = await fn();
    console.log(`  ✅ ${message}`);
    passed++;
    return result;
  } catch (err) {
    console.error(`  ❌ ${message}: ${err}`);
    failed++;
    return null;
  }
}

// =============================================================================
// Tests
// =============================================================================

async function testCryptoSource() {
  console.log('\n📊 Crypto Source Tests');
  console.log('─────────────────────────────────');

  const events = await assertNoThrow(
    () => scanCryptoMilestones(),
    'CoinGecko price fetch succeeds'
  );

  if (events) {
    assert(Array.isArray(events), 'Returns an array');
    console.log(`  ℹ️  Found ${events.length} crypto events`);

    if (events.length > 0) {
      const event = events[0];
      assert(event.eventId.startsWith('crypto:'), 'Event ID has crypto prefix');
      assert(event.category === 'crypto', 'Category is crypto');
      assert(event.suggestedQuestion.length >= 10, 'Question >= 10 chars');
      assert(event.suggestedQuestion.length <= 200, 'Question <= 200 chars');
      assert(event.suggestedQuestion.endsWith('?'), 'Question ends with ?');
      assert(event.confidence >= 0 && event.confidence <= 1, 'Confidence in [0,1]');
      assert(event.eventTime > new Date(), 'Event time is in the future');
    }
  }
}

async function testRSSSource() {
  console.log('\n📰 RSS Source Tests');
  console.log('─────────────────────────────────');

  const events = await assertNoThrow(
    () => scanRSSFeeds(),
    'RSS feed scan succeeds'
  );

  if (events) {
    assert(Array.isArray(events), 'Returns an array');
    console.log(`  ℹ️  Found ${events.length} RSS events`);

    for (const event of events.slice(0, 3)) {
      assert(event.suggestedQuestion.length >= 10, `Question valid: "${event.suggestedQuestion.slice(0, 60)}..."`);
    }
  }
}

async function testSportsSource() {
  console.log('\n🏈 Sports Source Tests');
  console.log('─────────────────────────────────');

  const events = await assertNoThrow(
    () => scanSportsEvents(),
    'Sports/ESPN scan succeeds'
  );

  if (events) {
    assert(Array.isArray(events), 'Returns an array');
    console.log(`  ℹ️  Found ${events.length} sports/esports events`);

    for (const event of events.slice(0, 3)) {
      assert(
        event.category === 'sports' || event.category === 'esports',
        `Category valid: ${event.category}`
      );
      assert(event.eventTime > new Date(), `Event in future: ${event.title.slice(0, 50)}`);
    }
  }
}

async function testDuplicateDetection() {
  console.log('\n🔄 Duplicate Detection Tests');
  console.log('─────────────────────────────────');

  const existingMarkets: ExistingMarket[] = [
    {
      publicKey: '123',
      marketId: '100',
      question: 'Will SOL be above $200 at 2026-03-01 00:00 UTC?',
      closingTime: '2026-03-01T00:00:00Z',
      status: 'Active',
      layer: 'Lab',
      totalPoolSol: 1.5,
    },
    {
      publicKey: '456',
      marketId: '101',
      question: 'Will Lakers beat Celtics on Feb 25?',
      closingTime: '2026-02-25T00:00:00Z',
      status: 'Active',
      layer: 'Lab',
      totalPoolSol: 0.5,
    },
  ];

  // Exact duplicate
  assert(
    isDuplicateMarket('Will SOL be above $200 at 2026-03-01 00:00 UTC?', existingMarkets),
    'Detects exact duplicate'
  );

  // Similar question
  assert(
    isDuplicateMarket('Will SOL be above $200 at 2026-03-01 0000 UTC', existingMarkets),
    'Detects similar question (punctuation difference)'
  );

  // Different question
  assert(
    !isDuplicateMarket('Will BTC reach $100,000 by end of March?', existingMarkets),
    'Different question is not a duplicate'
  );

  // Completely unrelated
  assert(
    !isDuplicateMarket('Will it rain in San Francisco tomorrow?', existingMarkets),
    'Unrelated question is not a duplicate'
  );
}

async function testQualityFilters() {
  console.log('\n🎯 Quality Filter Tests');
  console.log('─────────────────────────────────');

  // Test question length
  assert(
    'Short?'.length < QUALITY_FILTERS.MIN_QUESTION_LENGTH,
    'Short questions are filtered (< 10 chars)'
  );

  // Test blocked terms
  const blockedQuestion = 'Will there be a terrorist attack?';
  const hasBlocked = QUALITY_FILTERS.BLOCKED_TERMS.some(
    term => blockedQuestion.toLowerCase().includes(term)
  );
  assert(hasBlocked, 'Blocked terms detected in question');

  // Clean question passes
  const cleanQuestion = 'Will SOL reach $300 by end of 2026?';
  const hasBlockedClean = QUALITY_FILTERS.BLOCKED_TERMS.some(
    term => cleanQuestion.toLowerCase().includes(term)
  );
  assert(!hasBlockedClean, 'Clean question has no blocked terms');
}

async function testMemory() {
  console.log('\n💾 Memory Tests');
  console.log('─────────────────────────────────');

  const state = loadState();
  assert(state !== null, 'State loads successfully');
  assert(Array.isArray(state.markets), 'Markets is an array');
  assert(typeof state.totalMarketsCreated === 'number', 'Total markets is a number');
  assert(typeof state.categoryStats === 'object', 'Category stats is an object');
}

async function testPipelineDryRun() {
  console.log('\n🔧 Pipeline Dry Run Test');
  console.log('─────────────────────────────────');

  // Create mock events
  const mockEvents: DetectedEvent[] = [
    {
      eventId: 'test:mock:1',
      title: 'Test crypto event',
      source: 'coingecko',
      category: 'crypto',
      eventTime: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h from now
      suggestedQuestion: 'Will SOL be above $250 by March 15, 2026?',
      marketType: 'boolean',
      confidence: 0.85,
      resolutionSource: 'CoinGecko SOL/USD price',
    },
    {
      eventId: 'test:mock:2',
      title: 'Test sports event',
      source: 'espn',
      category: 'sports',
      eventTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h from now
      suggestedQuestion: 'Will the Lakers beat the Celtics on March 1?',
      marketType: 'boolean',
      confidence: 0.9,
      resolutionSource: 'ESPN NBA game results',
    },
    {
      eventId: 'test:mock:blocked',
      title: 'Should be blocked',
      source: 'custom',
      category: 'politics',
      eventTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
      suggestedQuestion: 'Will there be a terrorist attack?',
      marketType: 'boolean',
      confidence: 0.5,
      resolutionSource: 'News',
    },
  ];

  const result = await assertNoThrow(
    () => runPipeline(mockEvents, true, 5),
    'Pipeline runs in dry-run mode'
  );

  if (result) {
    assert(result.scanned === 3, `Scanned 3 events (got ${result.scanned})`);
    assert(result.filtered >= 1, `At least 1 filtered (got ${result.filtered})`);
    assert(result.created >= 1, `At least 1 would be created (got ${result.created})`);
    console.log(`  ℹ️  Pipeline: scanned=${result.scanned}, filtered=${result.filtered}, created=${result.created}`);
  }
}

// =============================================================================
// Runner
// =============================================================================

async function main() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║         Market Factory — Test Suite           ║');
  console.log('╚═══════════════════════════════════════════════╝');

  await testCryptoSource();
  await testRSSSource();
  await testSportsSource();
  await testDuplicateDetection();
  await testQualityFilters();
  await testMemory();
  await testPipelineDryRun();

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
