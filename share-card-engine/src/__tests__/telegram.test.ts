/**
 * Tests for Telegram distribution formatter
 */
import { describe, it, expect } from 'vitest';
import {
  formatMarketTelegramHtml,
  formatTelegramMarkdown,
  generateTelegramKeyboard,
  formatTelegramMarketList,
  createTelegramDistribution,
} from '../distributors/telegram.js';
import { generateShareCard } from '../generators/html-card.js';
import type { MarketCardData } from '../types/index.js';

const mockMarket: MarketCardData = {
  publicKey: 'TelegramTestKey',
  marketId: '55',
  question: 'Will Apple release AR glasses in 2026?',
  yesPercent: 72.0,
  noPercent: 28.0,
  yesPoolSol: 200.0,
  noPoolSol: 77.8,
  totalPoolSol: 277.8,
  status: 'Active',
  closingTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  layer: 'Lab',
  currencyType: 'Sol',
  hasBets: true,
  isBettingOpen: true,
  creator: 'TGCreator',
};

describe('formatMarketTelegramHtml', () => {
  it('uses HTML bold tags', () => {
    const html = formatMarketTelegramHtml(mockMarket);
    expect(html).toContain('<b>');
    expect(html).toContain('</b>');
  });

  it('includes question', () => {
    const html = formatMarketTelegramHtml(mockMarket);
    expect(html).toContain('Apple');
    expect(html).toContain('AR glasses');
  });

  it('includes odds', () => {
    const html = formatMarketTelegramHtml(mockMarket);
    expect(html).toContain('72.0%');
    expect(html).toContain('28.0%');
  });

  it('includes baozi.bet link', () => {
    const html = formatMarketTelegramHtml(mockMarket);
    expect(html).toContain('baozi.bet');
    expect(html).toContain('<a href=');
  });

  it('includes pool size', () => {
    const html = formatMarketTelegramHtml(mockMarket);
    expect(html).toContain('277.80 SOL');
  });
});

describe('formatTelegramMarkdown', () => {
  it('uses markdown bold', () => {
    const md = formatTelegramMarkdown(mockMarket);
    expect(md).toContain('*');
  });

  it('includes question', () => {
    const md = formatTelegramMarkdown(mockMarket);
    expect(md).toContain('Apple');
  });

  it('includes link', () => {
    const md = formatTelegramMarkdown(mockMarket);
    expect(md).toContain('baozi');
  });
});

describe('generateTelegramKeyboard', () => {
  it('creates inline keyboard with bet buttons', () => {
    const kb = generateTelegramKeyboard('https://baozi.bet/market/test');
    expect(kb.inline_keyboard).toHaveLength(2);
    expect(kb.inline_keyboard[0]).toHaveLength(2);
    expect(kb.inline_keyboard[0][0].text).toContain('YES');
    expect(kb.inline_keyboard[0][1].text).toContain('NO');
  });

  it('includes view market button', () => {
    const kb = generateTelegramKeyboard('https://baozi.bet/market/test');
    expect(kb.inline_keyboard[1][0].text).toContain('View Market');
    expect(kb.inline_keyboard[1][0].url).toBe('https://baozi.bet/market/test');
  });

  it('appends side parameter to bet URLs', () => {
    const kb = generateTelegramKeyboard('https://baozi.bet/market/test');
    expect(kb.inline_keyboard[0][0].url).toContain('?side=yes');
    expect(kb.inline_keyboard[0][1].url).toContain('?side=no');
  });
});

describe('formatTelegramMarketList', () => {
  it('formats list with numbered items', () => {
    const markets = [mockMarket, { ...mockMarket, question: 'Market 2' }];
    const list = formatTelegramMarketList(markets);
    expect(list).toContain('1\\.');
    expect(list).toContain('2\\.');
  });

  it('includes baozi.bet footer', () => {
    const list = formatTelegramMarketList([mockMarket]);
    expect(list).toContain('baozi.bet');
  });
});

describe('createTelegramDistribution', () => {
  it('creates successful distribution', () => {
    const card = generateShareCard(mockMarket, { platform: 'telegram' });
    const result = createTelegramDistribution(card);
    expect(result.platform).toBe('telegram');
    expect(result.success).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
  });
});
