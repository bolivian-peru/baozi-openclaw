/**
 * Tests for Discord distribution formatter
 */
import { describe, it, expect } from 'vitest';
import {
  createDiscordEmbed,
  formatDiscordMarkdown,
  formatDiscordMarketList,
  createDiscordDistribution,
} from '../distributors/discord.js';
import { generateShareCard } from '../generators/html-card.js';
import type { MarketCardData } from '../types/index.js';

const mockMarket: MarketCardData = {
  publicKey: 'DiscordTestPubKey',
  marketId: '99',
  question: 'Will Solana have 1B daily transactions by 2026?',
  yesPercent: 38.2,
  noPercent: 61.8,
  yesPoolSol: 55.0,
  noPoolSol: 89.0,
  totalPoolSol: 144.0,
  status: 'Active',
  closingTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  layer: 'Official',
  currencyType: 'Sol',
  hasBets: true,
  isBettingOpen: true,
  creator: 'Creator456',
};

describe('createDiscordEmbed', () => {
  it('creates embed with correct structure', () => {
    const embed = createDiscordEmbed(mockMarket);
    expect(embed).toHaveProperty('title');
    expect(embed).toHaveProperty('description');
    expect(embed).toHaveProperty('color');
    expect(embed).toHaveProperty('fields');
    expect(embed).toHaveProperty('footer');
    expect(embed).toHaveProperty('url');
  });

  it('includes baozi emoji in title', () => {
    const embed = createDiscordEmbed(mockMarket);
    expect(embed.title).toContain('🥟');
    expect(embed.title).toContain('Solana');
  });

  it('uses amber color', () => {
    const embed = createDiscordEmbed(mockMarket);
    expect(embed.color).toBe(0xf59e0b);
  });

  it('has correct number of fields', () => {
    const embed = createDiscordEmbed(mockMarket);
    expect(embed.fields.length).toBe(6);
  });

  it('includes pool info in fields', () => {
    const embed = createDiscordEmbed(mockMarket);
    const poolField = embed.fields.find(f => f.name.includes('Total Pool'));
    expect(poolField).toBeDefined();
    expect(poolField?.value).toContain('144.00 SOL');
  });

  it('includes baozi.bet URL', () => {
    const embed = createDiscordEmbed(mockMarket);
    expect(embed.url).toContain('baozi.bet');
  });
});

describe('formatDiscordMarkdown', () => {
  it('includes question as heading', () => {
    const md = formatDiscordMarkdown(mockMarket);
    expect(md).toContain('## ');
    expect(md).toContain('Solana');
  });

  it('includes odds in bold', () => {
    const md = formatDiscordMarkdown(mockMarket);
    expect(md).toContain('**YES**');
    expect(md).toContain('**NO**');
  });

  it('includes bet now link', () => {
    const md = formatDiscordMarkdown(mockMarket);
    expect(md).toContain('Bet Now');
    expect(md).toContain('baozi.bet');
  });
});

describe('formatDiscordMarketList', () => {
  it('creates a list embed', () => {
    const markets = [mockMarket, { ...mockMarket, question: 'Market 2' }];
    const embed = formatDiscordMarketList(markets);
    expect(embed.title).toContain('Hot');
    expect(embed.fields.length).toBe(2);
  });

  it('limits to 10 markets', () => {
    const markets = Array.from({ length: 15 }, (_, i) => ({
      ...mockMarket,
      question: `Market ${i}`,
    }));
    const embed = formatDiscordMarketList(markets);
    expect(embed.fields.length).toBe(10);
  });
});

describe('createDiscordDistribution', () => {
  it('creates successful distribution result', () => {
    const card = generateShareCard(mockMarket, { platform: 'discord' });
    const result = createDiscordDistribution(card);
    expect(result.platform).toBe('discord');
    expect(result.success).toBe(true);
    expect(result.content).toContain('🥟');
  });
});
