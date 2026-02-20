/**
 * Comprehensive Test Suite for Market Metadata Enricher
 * 30+ tests covering all enrichment modules
 */

import { strict as assert } from 'node:assert';
import type { Market } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { PROGRAM_ID, DISCRIMINATORS, MARKET_STATUS, MARKET_LAYER } from '@baozi.bet/mcp-server/dist/config.js';

// Import enrichers
import { categorizeMarket, getPrimaryCategory, isInCategory } from '../enrichers/categorizer.js';
import {
  analyzeMarketTiming,
  isRecentlyCreated,
  getTimingScore,
} from '../enrichers/timing-analyzer.js';
import {
  generateDescription,
  generateOneLiner,
  generateAgentBookContent,
} from '../enrichers/description-generator.js';
import {
  scoreMarketQuality,
  scoreQuestionClarity,
  scoreLiquidity,
  scoreCategoryRelevance,
} from '../enrichers/quality-scorer.js';
import { enrichMarket, enrichMarkets, DEFAULT_CONFIG } from '../enrichers/index.js';
import { detectNewMarkets } from '../services/market-monitor.js';
import { AgentBookService } from '../services/agentbook.js';

// =====================================================================
// TEST HELPERS
// =====================================================================

let passed = 0;
let failed = 0;
const errors: string[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
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
  })();
}

/**
 * Create a mock market for testing
 */
function createMockMarket(overrides: Partial<Market> = {}): Market {
  const now = Date.now();
  return {
    publicKey: 'TestMarketPDA1111111111111111111111111111111',
    marketId: '42',
    question: 'Will Bitcoin reach $100k by end of 2025?',
    closingTime: new Date(now + 7 * 24 * 3600_000).toISOString(), // 7 days from now
    resolutionTime: new Date(now + 8 * 24 * 3600_000).toISOString(), // 8 days from now
    status: 'Active',
    statusCode: 0,
    winningOutcome: null,
    currencyType: 'Sol',
    yesPoolSol: 5.5,
    noPoolSol: 3.2,
    totalPoolSol: 8.7,
    yesPercent: 63.2,
    noPercent: 36.8,
    platformFeeBps: 300,
    layer: 'Lab',
    layerCode: 1,
    accessGate: 'Public',
    creator: 'CreatorPubKey1111111111111111111111111111111',
    hasBets: true,
    isBettingOpen: true,
    creatorFeeBps: 50,
    ...overrides,
  };
}

// =====================================================================
// TEST SUITE
// =====================================================================

async function runTests() {
  console.log('\n🧪 Market Metadata Enricher — Test Suite\n');
  console.log('─────────────────────────────────────────\n');

  // ===================================================================
  // 1. MCP INTEGRATION TESTS
  // ===================================================================
  console.log('📦 MCP Integration:');

  await test('PROGRAM_ID matches expected value', () => {
    assert.equal(
      PROGRAM_ID.toBase58(),
      'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ',
    );
  });

  await test('DISCRIMINATORS.MARKET is defined and has 8 bytes', () => {
    assert.ok(DISCRIMINATORS.MARKET);
    assert.equal(DISCRIMINATORS.MARKET.length, 8);
  });

  await test('MARKET_STATUS constants are correct', () => {
    assert.equal(MARKET_STATUS.ACTIVE, 0);
    assert.equal(MARKET_STATUS.CLOSED, 1);
    assert.equal(MARKET_STATUS.RESOLVED, 2);
  });

  await test('MARKET_LAYER.LAB equals 1', () => {
    assert.equal(MARKET_LAYER.LAB, 1);
  });

  // ===================================================================
  // 2. CATEGORIZER TESTS
  // ===================================================================
  console.log('\n🏷️  Categorizer:');

  await test('categorizes crypto market correctly', () => {
    const market = createMockMarket({ question: 'Will Bitcoin reach $100k?' });
    const cats = categorizeMarket(market);
    assert.ok(cats.includes('crypto'), `Expected crypto in ${JSON.stringify(cats)}`);
  });

  await test('categorizes politics market correctly', () => {
    const market = createMockMarket({ question: 'Will Trump win the 2024 election?' });
    const cats = categorizeMarket(market);
    assert.ok(cats.includes('politics'), `Expected politics in ${JSON.stringify(cats)}`);
  });

  await test('categorizes sports market correctly', () => {
    const market = createMockMarket({ question: 'Will the Lakers win the NBA championship?' });
    const cats = categorizeMarket(market);
    assert.ok(cats.includes('sports'), `Expected sports in ${JSON.stringify(cats)}`);
  });

  await test('categorizes tech market correctly', () => {
    const market = createMockMarket({ question: 'Will OpenAI release GPT-5 this year?' });
    const cats = categorizeMarket(market);
    assert.ok(cats.includes('technology'), `Expected technology in ${JSON.stringify(cats)}`);
  });

  await test('returns "other" for uncategorizable question', () => {
    const market = createMockMarket({ question: 'Will it happen?' });
    const cats = categorizeMarket(market);
    assert.ok(cats.includes('other'));
  });

  await test('returns max 3 categories', () => {
    const market = createMockMarket({
      question: 'Will Elon Musk tweet about Bitcoin price affecting the stock market during the NBA finals?',
    });
    const cats = categorizeMarket(market);
    assert.ok(cats.length <= 3);
  });

  await test('getPrimaryCategory returns first category', () => {
    const market = createMockMarket({ question: 'Will Solana reach $500?' });
    const primary = getPrimaryCategory(market);
    assert.equal(primary, 'crypto');
  });

  await test('isInCategory returns true for matching category', () => {
    const market = createMockMarket({ question: 'Will the Super Bowl viewership break records?' });
    assert.ok(isInCategory(market, 'sports'));
  });

  // ===================================================================
  // 3. TIMING ANALYZER TESTS
  // ===================================================================
  console.log('\n⏰ Timing Analyzer:');

  await test('analyzes timing for future closing market', () => {
    const market = createMockMarket();
    const timing = analyzeMarketTiming(market);
    assert.ok(timing.hoursUntilClose > 0);
    assert.ok(timing.hoursUntilResolution > 0);
    assert.equal(timing.isClosingSoon, false);
  });

  await test('detects closing soon market (< 24h)', () => {
    const now = Date.now();
    const market = createMockMarket({
      closingTime: new Date(now + 6 * 3600_000).toISOString(), // 6 hours
      resolutionTime: new Date(now + 12 * 3600_000).toISOString(),
    });
    const timing = analyzeMarketTiming(market);
    assert.ok(timing.isClosingSoon);
    assert.equal(timing.urgency, 'high');
  });

  await test('detects long-term market (> 30 days)', () => {
    const now = Date.now();
    const market = createMockMarket({
      closingTime: new Date(now + 60 * 24 * 3600_000).toISOString(), // 60 days
      resolutionTime: new Date(now + 65 * 24 * 3600_000).toISOString(),
    });
    const timing = analyzeMarketTiming(market);
    assert.ok(timing.isLongTerm);
  });

  await test('detects short-term market (< 3 days)', () => {
    const now = Date.now();
    const market = createMockMarket({
      closingTime: new Date(now + 2 * 24 * 3600_000).toISOString(), // 2 days
      resolutionTime: new Date(now + 3 * 24 * 3600_000).toISOString(),
    });
    const timing = analyzeMarketTiming(market);
    assert.ok(timing.isShortTerm);
  });

  await test('detects unreasonable resolution window', () => {
    const now = Date.now();
    const market = createMockMarket({
      closingTime: new Date(now + 7 * 24 * 3600_000).toISOString(),
      resolutionTime: new Date(now + 7 * 24 * 3600_000 + 30 * 60_000).toISOString(), // Only 30 min after close
    });
    const timing = analyzeMarketTiming(market);
    assert.equal(timing.hasReasonableResolution, false);
  });

  await test('getTimingScore returns 0-100 range', () => {
    const market = createMockMarket();
    const score = getTimingScore(market);
    assert.ok(score >= 0 && score <= 100, `Score ${score} out of range`);
  });

  await test('timing summary is a non-empty string', () => {
    const market = createMockMarket();
    const timing = analyzeMarketTiming(market);
    assert.ok(timing.timingSummary.length > 0);
  });

  // ===================================================================
  // 4. DESCRIPTION GENERATOR TESTS
  // ===================================================================
  console.log('\n📝 Description Generator:');

  await test('generateDescription returns non-empty string', () => {
    const market = createMockMarket();
    const desc = generateDescription(market);
    assert.ok(desc.length > 50, 'Description too short');
  });

  await test('generateDescription includes market question', () => {
    const market = createMockMarket({ question: 'Will Ethereum flip Bitcoin?' });
    const desc = generateDescription(market);
    assert.ok(desc.includes('Ethereum flip Bitcoin'));
  });

  await test('generateOneLiner includes sentiment', () => {
    const market = createMockMarket({ yesPercent: 85, noPercent: 15 });
    const liner = generateOneLiner(market);
    assert.ok(liner.includes('Yes sentiment') || liner.includes('85%'));
  });

  await test('generateAgentBookContent includes all sections', () => {
    const market = createMockMarket();
    const categories = categorizeMarket(market);
    const timing = analyzeMarketTiming(market);
    const content = generateAgentBookContent(market, categories, timing, 75);
    assert.ok(content.includes('Market Enrichment'));
    assert.ok(content.includes('Categories'));
    assert.ok(content.includes('Pool'));
    assert.ok(content.includes('Quality Score'));
  });

  // ===================================================================
  // 5. QUALITY SCORER TESTS
  // ===================================================================
  console.log('\n📊 Quality Scorer:');

  await test('scoreQuestionClarity gives high score to clear question', () => {
    const score = scoreQuestionClarity('Will Bitcoin reach $100,000 by December 2025?');
    assert.ok(score >= 60, `Score ${score} too low for clear question`);
  });

  await test('scoreQuestionClarity gives low score to vague question', () => {
    const score = scoreQuestionClarity('test lol');
    assert.ok(score < 40, `Score ${score} too high for vague question`);
  });

  await test('scoreQuestionClarity penalizes ALL CAPS', () => {
    const normal = scoreQuestionClarity('Will Bitcoin reach $100k?');
    const allCaps = scoreQuestionClarity('WILL BITCOIN REACH $100K?');
    assert.ok(allCaps < normal, `ALL CAPS score ${allCaps} >= normal ${normal}`);
  });

  await test('scoreLiquidity returns 10 for zero pool', () => {
    const market = createMockMarket({ totalPoolSol: 0 });
    assert.equal(scoreLiquidity(market), 10);
  });

  await test('scoreLiquidity returns high score for high liquidity', () => {
    const market = createMockMarket({ totalPoolSol: 150 });
    const score = scoreLiquidity(market);
    assert.ok(score >= 90, `Score ${score} too low for high liquidity`);
  });

  await test('scoreCategoryRelevance gives higher score to clear categories', () => {
    const crypto = createMockMarket({ question: 'Will Solana price reach $500 by end of year?' });
    const vague = createMockMarket({ question: 'Will it happen?' });
    const cryptoScore = scoreCategoryRelevance(crypto);
    const vagueScore = scoreCategoryRelevance(vague);
    assert.ok(cryptoScore > vagueScore, `Crypto ${cryptoScore} <= vague ${vagueScore}`);
  });

  await test('scoreMarketQuality returns valid structure', () => {
    const market = createMockMarket();
    const quality = scoreMarketQuality(market);
    assert.ok(quality.overall >= 0 && quality.overall <= 100);
    assert.ok(quality.questionClarity >= 0 && quality.questionClarity <= 100);
    assert.ok(quality.timingScore >= 0 && quality.timingScore <= 100);
    assert.ok(quality.liquidityScore >= 0 && quality.liquidityScore <= 100);
    assert.ok(Array.isArray(quality.issues));
    assert.ok(Array.isArray(quality.suggestions));
    assert.ok(quality.qualitySummary.length > 0);
  });

  await test('scoreMarketQuality identifies issues for bad market', () => {
    const market = createMockMarket({
      question: 'test',
      totalPoolSol: 0,
      yesPoolSol: 0,
      noPoolSol: 0,
    });
    const quality = scoreMarketQuality(market);
    assert.ok(quality.issues.length > 0, 'Expected issues to be identified');
    assert.ok(quality.overall < 50, `Score ${quality.overall} too high for bad market`);
  });

  // ===================================================================
  // 6. ENRICHMENT PIPELINE TESTS
  // ===================================================================
  console.log('\n🔮 Enrichment Pipeline:');

  await test('enrichMarket returns complete enrichment object', () => {
    const market = createMockMarket();
    const enrichment = enrichMarket(market);

    assert.equal(enrichment.marketPda, market.publicKey);
    assert.equal(enrichment.marketId, market.marketId);
    assert.equal(enrichment.question, market.question);
    assert.ok(enrichment.description.length > 0);
    assert.ok(enrichment.categories.length > 0);
    assert.ok(enrichment.timing);
    assert.ok(enrichment.quality);
    assert.ok(enrichment.enrichedAt);
    assert.equal(enrichment.postedToAgentBook, false);
  });

  await test('enrichMarkets handles batch processing', () => {
    const markets = [
      createMockMarket({ question: 'Will BTC reach $200k?', marketId: '1' }),
      createMockMarket({ question: 'Will ETH flip BTC?', marketId: '2' }),
      createMockMarket({ question: 'Will Lakers win NBA?', marketId: '3' }),
    ];

    const enrichments = enrichMarkets(markets);
    assert.equal(enrichments.length, 3);
    assert.equal(enrichments[0].marketId, '1');
    assert.equal(enrichments[1].marketId, '2');
    assert.equal(enrichments[2].marketId, '3');
  });

  // ===================================================================
  // 7. MARKET MONITOR TESTS
  // ===================================================================
  console.log('\n📡 Market Monitor:');

  await test('detectNewMarkets identifies new entries', () => {
    const known = new Set(['pda1', 'pda2']);
    const current = [
      createMockMarket({ publicKey: 'pda1' }),
      createMockMarket({ publicKey: 'pda2' }),
      createMockMarket({ publicKey: 'pda3' }),
    ];
    const newOnes = detectNewMarkets(current, known);
    assert.equal(newOnes.length, 1);
    assert.equal(newOnes[0].publicKey, 'pda3');
  });

  await test('detectNewMarkets returns empty for no changes', () => {
    const known = new Set(['pda1', 'pda2']);
    const current = [
      createMockMarket({ publicKey: 'pda1' }),
      createMockMarket({ publicKey: 'pda2' }),
    ];
    const newOnes = detectNewMarkets(current, known);
    assert.equal(newOnes.length, 0);
  });

  // ===================================================================
  // 8. CONFIG TESTS
  // ===================================================================
  console.log('\n⚙️  Config:');

  await test('DEFAULT_CONFIG has valid wallet address', () => {
    // Solana wallet addresses are base58-encoded, 32-44 chars
    assert.ok(
      DEFAULT_CONFIG.walletAddress.length >= 32 && DEFAULT_CONFIG.walletAddress.length <= 44,
      `Expected Solana base58 address (32-44 chars), got ${DEFAULT_CONFIG.walletAddress.length} chars`,
    );
  });

  await test('DEFAULT_CONFIG has reasonable poll interval', () => {
    assert.ok(DEFAULT_CONFIG.pollIntervalMs >= 10_000);
    assert.ok(DEFAULT_CONFIG.pollIntervalMs <= 600_000);
  });

  await test('DEFAULT_CONFIG has valid quality threshold', () => {
    assert.ok(DEFAULT_CONFIG.minQualityToPost >= 0);
    assert.ok(DEFAULT_CONFIG.minQualityToPost <= 100);
  });

  // ===================================================================
  // 9. AGENTBOOK SERVICE TESTS
  // ===================================================================
  console.log('\n📮 AgentBook Service:');

  await test('AgentBookService can be instantiated with custom URL', () => {
    const service = new AgentBookService('https://custom.api.url/agentbook');
    assert.ok(service);
  });

  await test('AgentBookService can be instantiated with default URL', () => {
    const service = new AgentBookService();
    assert.ok(service);
  });

  // ===================================================================
  // 10. EDGE CASE TESTS
  // ===================================================================
  console.log('\n🔧 Edge Cases:');

  await test('handles empty question gracefully', () => {
    const market = createMockMarket({ question: '' });
    const enrichment = enrichMarket(market);
    assert.ok(enrichment.quality.overall >= 0);
    assert.ok(enrichment.categories.length > 0);
  });

  await test('handles very long question gracefully', () => {
    const market = createMockMarket({ question: 'Will '.repeat(200) + '?' });
    const enrichment = enrichMarket(market);
    assert.ok(enrichment.quality.overall >= 0);
  });

  await test('handles zero pool market', () => {
    const market = createMockMarket({
      totalPoolSol: 0,
      yesPoolSol: 0,
      noPoolSol: 0,
      yesPercent: 0,
      noPercent: 0,
    });
    const enrichment = enrichMarket(market);
    assert.ok(enrichment.description.includes('No bets'));
  });

  await test('handles market with special characters in question', () => {
    const market = createMockMarket({
      question: 'Will $SOL hit 🚀 $1000? #crypto @elonmusk',
    });
    const enrichment = enrichMarket(market);
    assert.ok(enrichment.categories.includes('crypto'));
  });

  // ===================================================================
  // SUMMARY
  // ===================================================================
  console.log('\n─────────────────────────────────────────');
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);

  if (errors.length > 0) {
    console.log('Failed tests:');
    errors.forEach(e => console.log(e));
    console.log('');
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
