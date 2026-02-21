/**
 * 夜厨房 — Integration Tests
 *
 * These tests hit real Solana RPC to verify the MCP server integration works.
 * They depend on network availability and may be slow.
 */
import { describe, it, expect } from 'vitest';
import { listMarkets, getMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { getQuote } from '@baozi.bet/mcp-server/dist/handlers/quote.js';
import { PROGRAM_ID, DISCRIMINATORS } from '@baozi.bet/mcp-server/dist/config.js';
import type { Market } from '@baozi.bet/mcp-server/dist/handlers/markets.js';

// =============================================================================
// MCP SERVER CONFIG TESTS
// =============================================================================

describe('MCP Server Configuration', () => {
  it('should have the correct program ID', () => {
    expect(PROGRAM_ID.toBase58()).toBe('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
  });

  it('should have market discriminator defined', () => {
    expect(DISCRIMINATORS.MARKET).toBeDefined();
    expect(DISCRIMINATORS.MARKET_BASE58).toBe('FcJn7zePJQ1');
  });

  it('should have user position discriminator defined', () => {
    expect(DISCRIMINATORS.USER_POSITION).toBeDefined();
    expect(DISCRIMINATORS.USER_POSITION_BASE58).toBe('j9SjDYAWesU');
  });
});

// =============================================================================
// LIVE MARKET FETCH TESTS (require Solana RPC)
// =============================================================================

describe('Live Market Fetching', () => {
  let markets: Market[] = [];

  it('should fetch markets from Solana RPC', async () => {
    markets = await listMarkets();
    expect(Array.isArray(markets)).toBe(true);
    // There should be at least some markets on mainnet
    expect(markets.length).toBeGreaterThan(0);
  }, 30000);

  it('each market should have required fields', async () => {
    if (markets.length === 0) {
      markets = await listMarkets();
    }

    for (const market of markets.slice(0, 5)) {
      expect(market.publicKey).toBeTruthy();
      expect(market.marketId).toBeTruthy();
      expect(market.question).toBeTruthy();
      expect(market.closingTime).toBeTruthy();
      expect(market.status).toBeTruthy();
      expect(typeof market.yesPercent).toBe('number');
      expect(typeof market.noPercent).toBe('number');
      expect(typeof market.totalPoolSol).toBe('number');
      expect(market.yesPercent + market.noPercent).toBeCloseTo(100, 0);
    }
  }, 30000);

  it('should fetch a specific market by public key', async () => {
    if (markets.length === 0) {
      markets = await listMarkets();
    }

    if (markets.length > 0) {
      const firstMarket = markets[0];
      const fetched = await getMarket(firstMarket.publicKey);
      expect(fetched).toBeDefined();
      expect(fetched!.publicKey).toBe(firstMarket.publicKey);
      expect(fetched!.question).toBe(firstMarket.question);
    }
  }, 30000);

  it('should return null for non-existent market', async () => {
    const result = await getMarket('11111111111111111111111111111111');
    expect(result).toBeNull();
  }, 30000);

  it('should filter markets by status', async () => {
    const activeMarkets = await listMarkets('active');
    for (const m of activeMarkets) {
      expect(m.status).toBe('Active');
    }
  }, 30000);
});

// =============================================================================
// LIVE QUOTE TESTS (require Solana RPC + active markets)
// =============================================================================

describe('Live Quote Fetching', () => {
  it('should get a quote for an active market', async () => {
    try {
      const markets = await listMarkets('active');
      const activeWithPool = markets.find(m => m.totalPoolSol > 0 && m.isBettingOpen);

      if (!activeWithPool) {
        console.log('No active markets with pool found — skipping quote test');
        return;
      }

      const quote = await getQuote(activeWithPool.publicKey, 'Yes', 0.1);
      expect(quote).toBeDefined();
      expect(typeof quote.valid).toBe('boolean');

      if (quote.valid) {
        expect(quote.betAmountSol).toBe(0.1);
        expect(quote.side).toBe('Yes');
        expect(quote.expectedPayoutSol).toBeGreaterThan(0);
        expect(typeof quote.impliedOdds).toBe('number');
        expect(typeof quote.feeSol).toBe('number');
      }
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.message?.includes('Too Many Requests')) {
        console.log('RPC rate limited — skipping quote test');
        return;
      }
      throw err;
    }
  }, 30000);
});

// =============================================================================
// END-TO-END INTEGRATION TESTS
// =============================================================================

describe('End-to-End Report Generation', () => {
  it('should generate a full report from live data', async () => {
    try {
      const { analyzeMarket } = await import('../market-analyzer.js');
      const { generateMarketReport } = await import('../report-generator.js');

      const markets = await listMarkets('active');
      if (markets.length === 0) {
        console.log('No active markets — skipping e2e test');
        return;
      }

      const analysis = await analyzeMarket(markets[0].publicKey);
      expect(analysis).toBeDefined();

      if (analysis) {
        const report = generateMarketReport(analysis, { format: 'full' });
        expect(report.content).toContain('夜厨房');
        expect(report.content).toContain('Night Kitchen');
        expect(report.content).toContain(markets[0].question);
        expect(report.marketPda).toBe(markets[0].publicKey);
        expect(report.wordCount).toBeGreaterThan(50);
      }
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.message?.includes('Too Many Requests')) {
        console.log('RPC rate limited — skipping e2e full report test');
        return;
      }
      throw err;
    }
  }, 30000);

  it('should generate a compact report from live data', async () => {
    try {
      const { analyzeMarket } = await import('../market-analyzer.js');
      const { generateMarketReport } = await import('../report-generator.js');

      const markets = await listMarkets('active');
      if (markets.length === 0) return;

      const analysis = await analyzeMarket(markets[0].publicKey);
      if (!analysis) return;

      const report = generateMarketReport(analysis, { format: 'compact' });
      expect(report.content).toContain('🏮');
      expect(report.content.length).toBeGreaterThan(0);
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.message?.includes('Too Many Requests')) {
        console.log('RPC rate limited — skipping compact report test');
        return;
      }
      throw err;
    }
  }, 30000);

  it('should generate a summary report from live data', async () => {
    try {
      const { analyzeActiveMarkets } = await import('../market-analyzer.js');
      const { generateSummaryReport } = await import('../report-generator.js');

      const analyses = await analyzeActiveMarkets();
      if (analyses.length === 0) {
        console.log('No active analyses — skipping summary test');
        return;
      }

      const summary = generateSummaryReport(analyses);
      expect(summary).toContain('Daily Digest');
      expect(summary).toContain('Total Markets');
      expect(summary.length).toBeGreaterThan(100);
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.message?.includes('Too Many Requests')) {
        console.log('RPC rate limited — skipping summary report test');
        return;
      }
      throw err;
    }
  }, 60000);
});
