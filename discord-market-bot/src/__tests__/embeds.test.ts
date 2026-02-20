/**
 * Tests for embeds/market-embed.ts — embed builders and formatting
 */
import { describe, it, expect } from 'vitest';
import { EmbedBuilder } from 'discord.js';
import {
  buildMarketEmbed,
  buildRaceEmbed,
  buildMarketListEmbed,
  buildPortfolioEmbed,
  buildDailyRoundupEmbed,
} from '../embeds/market-embed.js';
import type { Market, RaceMarket, PositionSummary } from '../baozi/types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────
const sampleMarket: Market = {
  publicKey: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  marketId: '42',
  question: 'Will BTC hit $100k by 2026?',
  closingTime: new Date(Date.now() + 86400000).toISOString(), // 24h from now
  resolutionTime: new Date(Date.now() + 172800000).toISOString(),
  status: 'Active',
  statusCode: 0,
  winningOutcome: null,
  yesPoolSol: 50.5,
  noPoolSol: 30.25,
  totalPoolSol: 80.75,
  yesPercent: 62.54,
  noPercent: 37.46,
  platformFeeBps: 250,
  layer: 'Official',
  layerCode: 0,
  creator: '11111111111111111111111111111111',
  hasBets: true,
  isBettingOpen: true,
};

const resolvedMarket: Market = {
  ...sampleMarket,
  status: 'Resolved',
  statusCode: 2,
  winningOutcome: 'Yes',
  isBettingOpen: false,
};

const sampleRaceMarket: RaceMarket = {
  publicKey: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  marketId: '99',
  question: 'Which coin pumps most in Q1?',
  outcomes: [
    { index: 0, label: 'BTC', poolSol: 20, percent: 40 },
    { index: 1, label: 'ETH', poolSol: 15, percent: 30 },
    { index: 2, label: 'SOL', poolSol: 15, percent: 30 },
  ],
  closingTime: new Date(Date.now() + 86400000).toISOString(),
  resolutionTime: new Date(Date.now() + 172800000).toISOString(),
  status: 'Active',
  statusCode: 0,
  winningOutcomeIndex: null,
  totalPoolSol: 50,
  layer: 'Lab',
  layerCode: 1,
  creator: '11111111111111111111111111111111',
  platformFeeBps: 300,
  isBettingOpen: true,
};

const samplePortfolio: PositionSummary = {
  wallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  totalPositions: 3,
  totalBetSol: 1.5,
  activePositions: 2,
  winningPositions: 1,
  losingPositions: 0,
  pendingPositions: 2,
  positions: [
    {
      publicKey: 'pos1',
      user: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      marketId: '42',
      yesAmountSol: 0.5,
      noAmountSol: 0,
      totalAmountSol: 0.5,
      side: 'Yes',
      claimed: false,
      marketQuestion: 'Will BTC hit $100k?',
      marketStatus: 'Active',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Boolean market embed
// ─────────────────────────────────────────────────────────────────────────────
describe('buildMarketEmbed', () => {
  it('returns an EmbedBuilder', () => {
    const embed = buildMarketEmbed(sampleMarket);
    expect(embed).toBeInstanceOf(EmbedBuilder);
  });

  it('contains the market question in the title', () => {
    const embed = buildMarketEmbed(sampleMarket);
    const data = embed.toJSON();
    expect(data.title).toContain('Will BTC hit $100k by 2026?');
  });

  it('includes Yes/No percentages in description', () => {
    const embed = buildMarketEmbed(sampleMarket);
    const data = embed.toJSON();
    expect(data.description).toContain('Yes');
    expect(data.description).toContain('No');
    expect(data.description).toContain('62.5');
    expect(data.description).toContain('37.5');
  });

  it('has Pool, Closes, Status, Layer, Time Left fields', () => {
    const embed = buildMarketEmbed(sampleMarket);
    const data = embed.toJSON();
    const fieldNames = data.fields?.map(f => f.name) ?? [];
    expect(fieldNames).toContain('Pool');
    expect(fieldNames).toContain('Closes');
    expect(fieldNames).toContain('Status');
    expect(fieldNames).toContain('Layer');
    expect(fieldNames).toContain('Time Left');
  });

  it('shows pool size in SOL', () => {
    const embed = buildMarketEmbed(sampleMarket);
    const data = embed.toJSON();
    const poolField = data.fields?.find(f => f.name === 'Pool');
    expect(poolField?.value).toContain('80.75');
    expect(poolField?.value).toContain('SOL');
  });

  it('adds Result field for resolved markets', () => {
    const embed = buildMarketEmbed(resolvedMarket);
    const data = embed.toJSON();
    const resultField = data.fields?.find(f => f.name === 'Result');
    expect(resultField).toBeDefined();
    expect(resultField?.value).toContain('Yes');
  });

  it('does not add Result field for active markets', () => {
    const embed = buildMarketEmbed(sampleMarket);
    const data = embed.toJSON();
    const resultField = data.fields?.find(f => f.name === 'Result');
    expect(resultField).toBeUndefined();
  });

  it('links to baozi.bet', () => {
    const embed = buildMarketEmbed(sampleMarket);
    const data = embed.toJSON();
    expect(data.url).toContain('baozi.bet');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Race market embed
// ─────────────────────────────────────────────────────────────────────────────
describe('buildRaceEmbed', () => {
  it('returns an EmbedBuilder', () => {
    const embed = buildRaceEmbed(sampleRaceMarket);
    expect(embed).toBeInstanceOf(EmbedBuilder);
  });

  it('lists all outcome labels', () => {
    const embed = buildRaceEmbed(sampleRaceMarket);
    const data = embed.toJSON();
    expect(data.description).toContain('BTC');
    expect(data.description).toContain('ETH');
    expect(data.description).toContain('SOL');
  });

  it('includes Outcomes count field', () => {
    const embed = buildRaceEmbed(sampleRaceMarket);
    const data = embed.toJSON();
    const outcomesField = data.fields?.find(f => f.name === 'Outcomes');
    expect(outcomesField?.value).toBe('3');
  });

  it('shows Winner field when resolved', () => {
    const resolved: RaceMarket = { ...sampleRaceMarket, winningOutcomeIndex: 0 };
    const embed = buildRaceEmbed(resolved);
    const data = embed.toJSON();
    const winnerField = data.fields?.find(f => f.name === 'Winner');
    expect(winnerField?.value).toContain('BTC');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Market list embed
// ─────────────────────────────────────────────────────────────────────────────
describe('buildMarketListEmbed', () => {
  it('returns an EmbedBuilder with title', () => {
    const embed = buildMarketListEmbed([sampleMarket], '📈 Active Markets');
    const data = embed.toJSON();
    expect(data.title).toBe('📈 Active Markets');
  });

  it('truncates list to 10 markets', () => {
    const markets = Array.from({ length: 15 }, (_, i) => ({
      ...sampleMarket,
      marketId: String(i),
      question: `Market ${i}?`,
    }));
    const embed = buildMarketListEmbed(markets, 'Test');
    const data = embed.toJSON();
    // Footer mentions 10 of 15
    expect(data.footer?.text).toContain('10');
    expect(data.footer?.text).toContain('15');
  });

  it('includes optional description', () => {
    const embed = buildMarketListEmbed([sampleMarket], 'Title', 'Extra info');
    const data = embed.toJSON();
    expect(data.description).toContain('Extra info');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio embed
// ─────────────────────────────────────────────────────────────────────────────
describe('buildPortfolioEmbed', () => {
  it('returns an EmbedBuilder', () => {
    const embed = buildPortfolioEmbed(samplePortfolio);
    expect(embed).toBeInstanceOf(EmbedBuilder);
  });

  it('shows wallet address truncated in title', () => {
    const embed = buildPortfolioEmbed(samplePortfolio);
    const data = embed.toJSON();
    expect(data.title).toContain('7xKX');
    expect(data.title).toContain('gAsU');
  });

  it('displays position stats', () => {
    const embed = buildPortfolioEmbed(samplePortfolio);
    const data = embed.toJSON();
    const fieldNames = data.fields?.map(f => f.name) ?? [];
    expect(fieldNames).toContain('Total Bet');
    expect(fieldNames).toContain('Positions');
    expect(fieldNames).toContain('🏆 Won');
    expect(fieldNames).toContain('❌ Lost');
    expect(fieldNames).toContain('⏳ Pending');
  });

  it('shows recent positions when available', () => {
    const embed = buildPortfolioEmbed(samplePortfolio);
    const data = embed.toJSON();
    const posField = data.fields?.find(f => f.name === 'Recent Positions');
    expect(posField).toBeDefined();
    expect(posField?.value).toContain('Yes');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Daily roundup embed
// ─────────────────────────────────────────────────────────────────────────────
describe('buildDailyRoundupEmbed', () => {
  it('returns an EmbedBuilder', () => {
    const embed = buildDailyRoundupEmbed([sampleMarket], [], []);
    expect(embed).toBeInstanceOf(EmbedBuilder);
  });

  it('includes hot markets section', () => {
    const embed = buildDailyRoundupEmbed([sampleMarket], [], []);
    const data = embed.toJSON();
    const hotField = data.fields?.find(f => f.name === '🔥 Top Markets by Volume');
    expect(hotField).toBeDefined();
  });

  it('handles empty state gracefully', () => {
    const embed = buildDailyRoundupEmbed([], [], []);
    const data = embed.toJSON();
    expect(data.description).toContain('No market activity');
  });

  it('includes resolved markets section', () => {
    const embed = buildDailyRoundupEmbed([], [], [resolvedMarket]);
    const data = embed.toJSON();
    const resField = data.fields?.find(f => f.name === '✅ Resolved');
    expect(resField).toBeDefined();
    expect(resField?.value).toContain('Yes');
  });
});
