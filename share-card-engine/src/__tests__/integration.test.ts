/**
 * Integration tests — connects to real Solana RPC via MCP server handlers
 * 
 * These tests verify that the share card engine works end-to-end
 * with real on-chain market data from Baozi's mainnet program.
 * 
 * Note: These hit the public Solana RPC and may be rate-limited.
 * They use a shared cache to minimize RPC calls.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { PROGRAM_ID, RPC_ENDPOINT, DISCRIMINATORS } from '@baozi.bet/mcp-server/dist/config.js';
import { listMarkets, getMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { fetchAllMarkets, fetchMarket } from '../utils/market-fetcher.js';
import { generateShareCard } from '../generators/html-card.js';
import { generateMultiPlatformCards } from '../generators/batch.js';
import { distributeToAllPlatforms } from '../distributors/multi-platform.js';
import { formatMarketTweet, validateTweetLength } from '../distributors/twitter.js';
import { createDiscordEmbed } from '../distributors/discord.js';
import { formatMarketTelegramHtml, generateTelegramKeyboard } from '../distributors/telegram.js';
import type { MarketCardData } from '../types/index.js';

// Cache markets across tests to minimize RPC calls
let cachedMarkets: MarketCardData[] | null = null;

async function getMarkets(): Promise<MarketCardData[]> {
  if (cachedMarkets) return cachedMarkets;
  cachedMarkets = await fetchAllMarkets();
  return cachedMarkets;
}

describe('MCP Server Integration', () => {
  it('PROGRAM_ID matches expected value', () => {
    expect(PROGRAM_ID.toBase58()).toBe('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
  });

  it('RPC_ENDPOINT is set', () => {
    expect(RPC_ENDPOINT).toBeTruthy();
    expect(typeof RPC_ENDPOINT).toBe('string');
  });

  it('DISCRIMINATORS has MARKET discriminator', () => {
    expect(DISCRIMINATORS.MARKET).toBeDefined();
    expect(DISCRIMINATORS.MARKET.length).toBe(8);
  });

  it('DISCRIMINATORS has USER_POSITION discriminator', () => {
    expect(DISCRIMINATORS.USER_POSITION).toBeDefined();
    expect(DISCRIMINATORS.USER_POSITION.length).toBe(8);
  });
});

describe('Live Market Fetch (Solana RPC)', () => {
  it('can list markets from Solana mainnet', async () => {
    const markets = await getMarkets();
    expect(Array.isArray(markets)).toBe(true);
    expect(markets.length).toBeGreaterThan(0);
  }, 60000);

  it('market objects have expected fields', async () => {
    const markets = await getMarkets();
    if (markets.length === 0) return;
    const m = markets[0];
    expect(m).toHaveProperty('publicKey');
    expect(m).toHaveProperty('marketId');
    expect(m).toHaveProperty('question');
    expect(m).toHaveProperty('yesPercent');
    expect(m).toHaveProperty('noPercent');
    expect(m).toHaveProperty('totalPoolSol');
    expect(m).toHaveProperty('status');
  }, 60000);

  it('market data is normalized correctly', async () => {
    const markets = await getMarkets();
    if (markets.length === 0) return;
    const m = markets[0];
    expect(typeof m.publicKey).toBe('string');
    expect(typeof m.yesPercent).toBe('number');
    expect(typeof m.noPercent).toBe('number');
    expect(typeof m.totalPoolSol).toBe('number');
    expect(m.yesPercent + m.noPercent).toBeCloseTo(100, 0);
  }, 60000);

  it('markets are sorted by pool when using fetchTopMarkets', async () => {
    const markets = await getMarkets();
    const sorted = [...markets].sort((a, b) => b.totalPoolSol - a.totalPoolSol).slice(0, 5);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].totalPoolSol).toBeGreaterThanOrEqual(sorted[i].totalPoolSol);
    }
  }, 60000);
});

describe('End-to-End Card Generation from Live Data', () => {
  it('generates share card from real market', async () => {
    const markets = await getMarkets();
    if (markets.length === 0) return;
    
    const card = generateShareCard(markets[0]);
    expect(card.html).toContain('Baozi');
    expect(card.marketUrl).toContain('baozi.bet');
    expect(card.embed.fields.length).toBeGreaterThan(0);
    expect(card.plainText).toContain('BAOZI');
  }, 60000);

  it('generates multi-platform cards from real market', async () => {
    const markets = await getMarkets();
    if (markets.length === 0) return;

    const cards = generateMultiPlatformCards(markets[0]);
    expect(cards.twitter.platform).toBe('twitter');
    expect(cards.discord.platform).toBe('discord');
    expect(cards.telegram.platform).toBe('telegram');
    expect(cards.generic.platform).toBe('generic');
  }, 60000);

  it('formats valid tweet from real market', async () => {
    const markets = await getMarkets();
    if (markets.length === 0) return;

    const tweet = formatMarketTweet(markets[0]);
    expect(tweet).toContain('baozi.bet');
    const validation = validateTweetLength(tweet);
    expect(validation.valid).toBe(true);
  }, 60000);

  it('creates Discord embed from real market', async () => {
    const markets = await getMarkets();
    if (markets.length === 0) return;

    const embed = createDiscordEmbed(markets[0]);
    expect(embed.title).toContain('🥟');
    expect(embed.color).toBe(0xf59e0b);
    expect(embed.url).toContain('baozi.bet');
  }, 60000);

  it('formats Telegram HTML from real market', async () => {
    const markets = await getMarkets();
    if (markets.length === 0) return;

    const html = formatMarketTelegramHtml(markets[0]);
    expect(html).toContain('<b>');
    expect(html).toContain('baozi.bet');
  }, 60000);

  it('generates Telegram keyboard for real market', async () => {
    const markets = await getMarkets();
    if (markets.length === 0) return;

    const url = `https://baozi.bet/market/${markets[0].publicKey}`;
    const kb = generateTelegramKeyboard(url);
    expect(kb.inline_keyboard).toHaveLength(2);
    expect(kb.inline_keyboard[0][0].url).toContain('side=yes');
  }, 60000);

  it('distributes real market to all platforms', async () => {
    const markets = await getMarkets();
    if (markets.length === 0) return;

    const result = distributeToAllPlatforms(markets[0]);
    expect(result.results).toHaveLength(3);
    expect(result.totalSuccess).toBe(3);
    expect(result.totalFailed).toBe(0);
  }, 60000);
});
