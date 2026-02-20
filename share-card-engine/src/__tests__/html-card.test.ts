/**
 * Tests for HTML card generation
 */
import { describe, it, expect } from 'vitest';
import { generateShareCard } from '../generators/html-card.js';
import type { MarketCardData } from '../types/index.js';

/** Mock market data for testing */
const mockMarket: MarketCardData = {
  publicKey: 'ABC123testpubkey456',
  marketId: '42',
  question: 'Will Bitcoin reach $200k by end of 2026?',
  yesPercent: 65.5,
  noPercent: 34.5,
  yesPoolSol: 150.5,
  noPoolSol: 79.2,
  totalPoolSol: 229.7,
  status: 'Active',
  closingTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  layer: 'Official',
  currencyType: 'Sol',
  hasBets: true,
  isBettingOpen: true,
  creator: 'CreatorPubKey123',
};

describe('generateShareCard', () => {
  it('generates a valid share card object', () => {
    const card = generateShareCard(mockMarket);
    expect(card).toHaveProperty('html');
    expect(card).toHaveProperty('plainText');
    expect(card).toHaveProperty('platform');
    expect(card).toHaveProperty('marketUrl');
    expect(card).toHaveProperty('metaTags');
    expect(card).toHaveProperty('embed');
    expect(card).toHaveProperty('marketData');
    expect(card).toHaveProperty('generatedAt');
  });

  it('includes market URL with baozi.bet', () => {
    const card = generateShareCard(mockMarket);
    expect(card.marketUrl).toContain('baozi.bet');
    expect(card.marketUrl).toContain(mockMarket.publicKey);
  });

  it('includes the question in HTML', () => {
    const card = generateShareCard(mockMarket);
    expect(card.html).toContain('Bitcoin');
    expect(card.html).toContain('200k');
  });

  it('includes odds in HTML', () => {
    const card = generateShareCard(mockMarket);
    expect(card.html).toContain('65.5%');
    expect(card.html).toContain('34.5%');
  });

  it('includes pool size in plain text', () => {
    const card = generateShareCard(mockMarket);
    expect(card.plainText).toContain('229.70 SOL');
  });

  it('includes Baozi branding', () => {
    const card = generateShareCard(mockMarket);
    expect(card.html).toContain('Baozi');
    expect(card.plainText).toContain('BAOZI');
  });

  it('generates valid embed', () => {
    const card = generateShareCard(mockMarket);
    expect(card.embed.title).toContain('🥟');
    expect(card.embed.color).toBe(0xf59e0b);
    expect(card.embed.fields.length).toBeGreaterThan(0);
    expect(card.embed.url).toContain('baozi.bet');
  });

  it('generates meta tags', () => {
    const card = generateShareCard(mockMarket);
    expect(card.metaTags).toContain('og:title');
    expect(card.metaTags).toContain('twitter:card');
    expect(card.metaTags).toContain('Baozi');
  });

  it('preserves market data in card', () => {
    const card = generateShareCard(mockMarket);
    expect(card.marketData).toEqual(mockMarket);
  });

  it('sets generatedAt timestamp', () => {
    const before = Date.now();
    const card = generateShareCard(mockMarket);
    const after = Date.now();
    const generated = new Date(card.generatedAt).getTime();
    expect(generated).toBeGreaterThanOrEqual(before);
    expect(generated).toBeLessThanOrEqual(after);
  });
});

describe('generateShareCard styles', () => {
  it('generates minimal style', () => {
    const card = generateShareCard(mockMarket, { style: 'minimal' });
    expect(card.html).toContain('BAOZI MARKET');
    expect(card.html.length).toBeLessThan(2000);
  });

  it('generates compact style', () => {
    const card = generateShareCard(mockMarket, { style: 'compact' });
    expect(card.html).toContain('Place Your Bet');
  });

  it('generates detailed style', () => {
    const card = generateShareCard(mockMarket, { style: 'detailed' });
    expect(card.html).toContain('Market #42');
    expect(card.html).toContain('grid-template-columns');
  });

  it('supports custom CTA text', () => {
    const card = generateShareCard(mockMarket, { ctaText: 'Go Go Go!' });
    expect(card.html).toContain('Go Go Go!');
  });

  it('respects showVolume=false', () => {
    const card = generateShareCard(mockMarket, { showVolume: false });
    expect(card.plainText).not.toContain('Pool:');
  });

  it('respects showCountdown=false', () => {
    const card = generateShareCard(mockMarket, { showCountdown: false });
    // Countdown should not appear in plain text
    const lines = card.plainText.split('\n');
    const clockLines = lines.filter(l => l.includes('⏰'));
    expect(clockLines.length).toBe(0);
  });
});

describe('generateShareCard platforms', () => {
  it('sets twitter platform', () => {
    const card = generateShareCard(mockMarket, { platform: 'twitter' });
    expect(card.platform).toBe('twitter');
  });

  it('sets discord platform', () => {
    const card = generateShareCard(mockMarket, { platform: 'discord' });
    expect(card.platform).toBe('discord');
  });

  it('sets telegram platform', () => {
    const card = generateShareCard(mockMarket, { platform: 'telegram' });
    expect(card.platform).toBe('telegram');
  });
});

describe('generateShareCard with config', () => {
  it('uses custom base URL', () => {
    const card = generateShareCard(mockMarket, {}, { baseUrl: 'https://test.bet' });
    expect(card.marketUrl).toContain('test.bet');
  });

  it('includes affiliate code in URL', () => {
    const card = generateShareCard(mockMarket, {}, { affiliateCode: 'myref' });
    expect(card.marketUrl).toContain('?ref=myref');
  });

  it('uses custom footer text', () => {
    const card = generateShareCard(mockMarket, {}, { footerText: 'Custom Footer' });
    expect(card.html).toContain('Custom Footer');
  });
});

describe('HTML card escaping', () => {
  it('escapes HTML in question', () => {
    const xssMarket = {
      ...mockMarket,
      question: 'Will <script>alert("xss")</script> happen?',
    };
    const card = generateShareCard(xssMarket);
    expect(card.html).not.toContain('<script>');
    expect(card.html).toContain('&lt;script&gt;');
  });
});
