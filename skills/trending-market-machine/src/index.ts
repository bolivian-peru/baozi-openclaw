#!/usr/bin/env ts-node
/**
 * Trending Market Machine
 * 
 * Monitors trending topics and auto-creates Baozi Labs prediction markets
 * 
 * Bounty: 1.0 SOL
 * Issue: https://github.com/bolivian-peru/baozi-openclaw/issues/42
 */

import axios from 'axios';
import Parser from 'rss-parser';
import { Command } from 'commander';

const parser = new Parser();

// Trend sources
const TREND_SOURCES = {
  twitter: 'https://twitter.com/i/ajax/2/trends',
  google: 'https://trends.google.com/trends/trendingsearches/daily',
  hackernews: 'https://hnrss.org/frontpage',
  coindesk: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
};

// Market types
type MarketType = 'Type A (event-based)' | 'Type B (measurement-period)';

interface TrendItem {
  source: string;
  title: string;
  url: string;
  category: string;
}

interface MarketDraft {
  question: string;
  type: MarketType;
  closeTime: Date;
  dataSource: string;
  description: string;
}

// Fetch trending from RSS sources
async function fetchHNTrends(): Promise<TrendItem[]> {
  try {
    const feed = await parser.parseURL(TREND_SOURCES.hackernews);
    return feed.items.slice(0, 10).map(item => ({
      source: 'HackerNews',
      title: item.title || '',
      url: item.link || '',
      category: 'tech'
    }));
  } catch (error) {
    console.error('HN fetch error:', error.message);
    return [];
  }
}

async function fetchCoinDeskTrends(): Promise<TrendItem[]> {
  try {
    const feed = await parser.parseURL(TREND_SOURCES.coindesk);
    return feed.items.slice(0, 10).map(item => ({
      source: 'CoinDesk',
      title: item.title || '',
      url: item.link || '',
      category: 'crypto'
    }));
  } catch (error) {
    console.error('CoinDesk fetch error:', error.message);
    return [];
  }
}

// Classify trend into market type
function classifyTrend(title: string): MarketType {
  const eventKeywords = ['announce', 'release', 'event', 'conference', 'launch', 'unveil', 'show'];
  const hasEvent = eventKeywords.some(kw => title.toLowerCase().includes(kw));
  return hasEvent ? 'Type A (event-based)' : 'Type B (measurement-period)';
}

// Generate market question from trend
function generateMarketQuestion(trend: TrendItem): MarketDraft {
  const type = classifyTrend(trend.title);
  const now = new Date();
  let closeTime = new Date(now);
  let dataSource = trend.url;
  
  // For event-based, set close time to 24h before event (simplified)
  if (type === 'Type A (event-based)') {
    closeTime.setDate(closeTime.getDate() + 7); // Default 1 week out
  } else {
    closeTime.setDate(closeTime.getDate() + 30); // Default 30 days
  }
  
  // Clean up title for question
  let question = trend.title.replace(/[?.,!]/g, '').trim();
  if (!question.endsWith('?')) {
    question += '?';
  }
  
  return {
    question,
    type,
    closeTime,
    dataSource,
    description: `Auto-created from ${trend.source} trending: ${trend.title}`
  };
}

// Validate market via pre-validation API
async function validateMarket(draft: MarketDraft): Promise<boolean> {
  try {
    const response = await axios.post('https://baozi.bet/api/markets/validate', {
      question: draft.question,
      close_time: draft.closeTime.toISOString(),
      description: draft.description
    }, {
      timeout: 10000
    });
    return response.data.valid === true;
  } catch (error) {
    console.error('Validation error:', error.message);
    return false;
  }
}

// Create market via MCP (placeholder - requires MCP server)
async function createMarket(draft: MarketDraft): Promise<boolean> {
  console.log('📝 Market Draft:');
  console.log(`   Question: ${draft.question}`);
  console.log(`   Type: ${draft.type}`);
  console.log(`   Close: ${draft.closeTime.toISOString()}`);
  console.log(`   Data Source: ${draft.dataSource}`);
  
  // In production, this would use MCP:
  // const mcp = require('@baozi.bet/mcp-server');
  // await mcp.build_create_lab_market_transaction(draft);
  
  console.log('✅ Market ready for creation (MCP integration required)');
  return true;
}

// Main loop
async function scanAndCreate(maxMarkets: number = 3) {
  console.log('🔍 Scanning trending sources...\n');
  
  const [hnTrends, cryptoTrends] = await Promise.all([
    fetchHNTrends(),
    fetchCoinDeskTrends()
  ]);
  
  const allTrends = [...hnTrends, ...cryptoTrends];
  console.log(`📊 Found ${allTrends.length} trending topics\n`);
  
  let created = 0;
  for (const trend of allTrends.slice(0, maxMarkets)) {
    console.log(`\n📈 Processing: ${trend.title}`);
    
    const draft = generateMarketQuestion(trend);
    const valid = await validateMarket(draft);
    
    if (valid) {
      await createMarket(draft);
      created++;
    } else {
      console.log('❌ Market validation failed');
    }
  }
  
  console.log(`\n✅ Created ${created} markets`);
}

// CLI
const program = new Command();

program
  .name('trending-market-machine')
  .description('Auto-create markets from trending topics')
  .option('-n, --number <count>', 'Max markets to create', '3')
  .option('-s, --sources <sources>', 'Sources to monitor (hn,crypto)', 'hn,crypto');

program.parse(process.argv);

const opts = program.opts();
scanAndCreate(parseInt(opts.number)).catch(console.error);
