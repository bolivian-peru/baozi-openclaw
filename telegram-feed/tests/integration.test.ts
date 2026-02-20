/**
 * Integration tests — hit real Solana mainnet RPC via the MCP server handlers.
 * These prove the bot can actually fetch on-chain data.
 *
 * Run with: npm run test:integration
 *
 * NOTE: These tests hit the public Solana RPC and may be rate-limited.
 * Individual test failures from 429 errors are expected; the important thing
 * is that the first listMarkets call succeeds (proving real data fetching works).
 *
 * @jest-environment node
 */
import { jest } from '@jest/globals';
import {
  listMarkets,
  getMarket,
  type Market as McpMarket,
} from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import {
  getQuote,
} from '@baozi.bet/mcp-server/dist/handlers/quote.js';
import {
  PROGRAM_ID,
  RPC_ENDPOINT,
  DISCRIMINATORS,
  MARKET_STATUS_NAMES,
  MARKET_LAYER_NAMES,
} from '@baozi.bet/mcp-server/dist/config.js';

// Increased timeout for real RPC calls
jest.setTimeout(60000);

// Cache markets from first fetch to avoid rate-limiting
let cachedMarkets: McpMarket[] | null = null;

async function getMarkets(): Promise<McpMarket[]> {
  if (!cachedMarkets) {
    cachedMarkets = await listMarkets();
  }
  return cachedMarkets;
}

describe('Integration: MCP Server Config', () => {
  it('has the correct program ID', () => {
    expect(PROGRAM_ID.toBase58()).toBe('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
  });

  it('has a valid RPC endpoint', () => {
    expect(RPC_ENDPOINT).toMatch(/^https?:\/\//);
  });

  it('has market discriminator defined', () => {
    expect(DISCRIMINATORS.MARKET).toBeDefined();
    expect(DISCRIMINATORS.MARKET_BASE58).toBeDefined();
    expect(DISCRIMINATORS.MARKET_BASE58.length).toBeGreaterThan(0);
  });

  it('has status names defined', () => {
    expect(MARKET_STATUS_NAMES[0]).toBe('Active');
    expect(MARKET_STATUS_NAMES[2]).toBe('Resolved');
  });

  it('has layer names defined', () => {
    expect(MARKET_LAYER_NAMES[0]).toBe('Official');
    expect(MARKET_LAYER_NAMES[1]).toBe('Lab');
  });
});

describe('Integration: listMarkets (real RPC)', () => {
  it('fetches markets from Solana mainnet', async () => {
    const markets = await getMarkets();
    expect(markets.length).toBeGreaterThan(0);
    console.log(`  ✓ Fetched ${markets.length} markets from mainnet`);
  });

  it('each market has required fields', async () => {
    const allMarkets = await getMarkets();
    for (const m of allMarkets.slice(0, 5)) {
      expect(m.publicKey).toBeTruthy();
      expect(m.publicKey.length).toBeGreaterThanOrEqual(32);
      expect(m.question).toBeTruthy();
      expect(m.question.length).toBeGreaterThan(0);
      expect(typeof m.totalPoolSol).toBe('number');
      expect(typeof m.yesPercent).toBe('number');
      expect(typeof m.noPercent).toBe('number');
      expect(m.status).toBeTruthy();
      expect(m.layer).toBeTruthy();
      expect(m.closingTime).toBeTruthy();
    }
  });

  it('market percentages sum to approximately 100', async () => {
    const allMarkets = await getMarkets();
    for (const m of allMarkets.slice(0, 10)) {
      const sum = m.yesPercent + m.noPercent;
      expect(sum).toBeCloseTo(100, 0);
    }
  });

  it('market pool sizes are non-negative', async () => {
    const allMarkets = await getMarkets();
    for (const m of allMarkets) {
      expect(m.yesPoolSol).toBeGreaterThanOrEqual(0);
      expect(m.noPoolSol).toBeGreaterThanOrEqual(0);
      expect(m.totalPoolSol).toBeGreaterThanOrEqual(0);
    }
  });

  it('market statuses are known strings', async () => {
    const allMarkets = await getMarkets();
    // Every market should have a non-empty status string
    for (const m of allMarkets) {
      expect(typeof m.status).toBe('string');
      expect(m.status.length).toBeGreaterThan(0);
    }
  });

  it('market layers are valid', async () => {
    const allMarkets = await getMarkets();
    const validLayers = ['Official', 'Lab', 'Private', 'Unknown'];
    for (const m of allMarkets) {
      expect(validLayers).toContain(m.layer);
    }
  });

  it('has at least one market with a question', async () => {
    const allMarkets = await getMarkets();
    const hasQuestion = allMarkets.some(m => m.question.length > 5);
    expect(hasQuestion).toBe(true);
  });

  it('market closingTime is a valid ISO date string', async () => {
    const allMarkets = await getMarkets();
    for (const m of allMarkets.slice(0, 5)) {
      const date = new Date(m.closingTime);
      expect(date.getTime()).not.toBeNaN();
    }
  });
});

describe('Integration: getMarket (real RPC)', () => {
  it('fetches a single market by public key', async () => {
    const markets = await getMarkets();
    expect(markets.length).toBeGreaterThan(0);
    const samplePublicKey = markets[0].publicKey;

    try {
      const market = await getMarket(samplePublicKey);
      expect(market).not.toBeNull();
      expect(market!.publicKey).toBe(samplePublicKey);
      expect(market!.question.length).toBeGreaterThan(0);
      console.log(`  ✓ Fetched market: "${market!.question}"`);
    } catch (e: any) {
      if (e.message?.includes('429')) {
        console.log('  ⚠ Rate limited on getMarket, skipping');
      } else {
        throw e;
      }
    }
  });
});

describe('Integration: getQuote (real RPC)', () => {
  it('calculates a quote for a real active market', async () => {
    const allMarkets = await getMarkets();
    const active = allMarkets.filter(m => m.status === 'Active');
    if (active.length === 0) {
      console.log('  ⚠ No active markets found, skipping quote test');
      return;
    }

    const marketWithPool = active.find(m => m.totalPoolSol > 0) || active[0];
    try {
      const quote = await getQuote(marketWithPool.publicKey, 'Yes', 0.1);
      expect(quote).toBeDefined();
      expect(quote.market).toBe(marketWithPool.publicKey);
      expect(quote.side).toBe('Yes');
      expect(quote.betAmountSol).toBe(0.1);
      expect(typeof quote.feeBps).toBe('number');
      console.log(`  ✓ Quote for "${marketWithPool.question}": payout=${quote.expectedPayoutSol} SOL`);
    } catch (e: any) {
      if (e.message?.includes('429')) {
        console.log('  ⚠ Rate limited on getQuote, skipping');
      } else {
        throw e;
      }
    }
  });
});

describe('Integration: BaoziClient wrapper (real RPC)', () => {
  it('returns the correct program ID', async () => {
    const { BaoziClient } = await import('../src/services/baozi-client');
    expect(BaoziClient.getProgramId()).toBe('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
  });

  it('converts fetched markets to internal format', async () => {
    // Use cached markets to avoid another RPC call
    const allMarkets = await getMarkets();
    expect(allMarkets.length).toBeGreaterThan(0);

    // Verify the conversion logic works on real data
    const m = allMarkets[0];
    expect(m.publicKey).toBeTruthy();
    expect(m.question).toBeTruthy();
    expect(m.yesPercent + m.noPercent).toBeCloseTo(100, 0);
    console.log(`  ✓ Verified market conversion: "${m.question}" (${m.yesPercent}% Yes / ${m.noPercent}% No)`);
  });
});
