/**
 * RSS/News Feed Source
 * 
 * Monitors RSS feeds from crypto, tech, and sports sources
 * to detect prediction-worthy events. Parses RSS/Atom XML
 * without external dependencies.
 */

import type { DetectedEvent, EventSource } from '../types.js';
import type { MarketCategory } from '../config.js';

// =============================================================================
// Feed Configuration
// =============================================================================

interface FeedConfig {
  url: string;
  source: EventSource;
  category: MarketCategory;
  name: string;
}

const RSS_FEEDS: FeedConfig[] = [
  // Crypto
  {
    url: 'https://cointelegraph.com/rss',
    source: 'rss-crypto',
    category: 'crypto',
    name: 'CoinTelegraph',
  },
  {
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    source: 'rss-crypto',
    category: 'crypto',
    name: 'CoinDesk',
  },
  // Tech / AI
  {
    url: 'https://techcrunch.com/feed/',
    source: 'rss-tech',
    category: 'ai-tech',
    name: 'TechCrunch',
  },
  {
    url: 'https://www.theverge.com/rss/index.xml',
    source: 'rss-tech',
    category: 'ai-tech',
    name: 'The Verge',
  },
  // Sports
  {
    url: 'https://www.espn.com/espn/rss/news',
    source: 'rss-sports',
    category: 'sports',
    name: 'ESPN',
  },
];

// =============================================================================
// Event Pattern Detection
// =============================================================================

/** Patterns that suggest prediction-worthy events */
const EVENT_PATTERNS: EventPattern[] = [
  // Crypto milestones & launches
  { regex: /\b(bitcoin|btc)\b.*\b(ath|all.time.high|record|milestone|\$\d+[km]?)\b/i, category: 'crypto', confidence: 0.8 },
  { regex: /\b(ethereum|eth)\b.*\b(upgrade|merge|fork|etf|milestone)\b/i, category: 'crypto', confidence: 0.8 },
  { regex: /\b(solana|sol)\b.*\b(launch|upgrade|milestone|record|tps)\b/i, category: 'crypto', confidence: 0.85 },
  { regex: /\b(etf|sec)\b.*\b(approv|reject|deadline|decision)\b/i, category: 'crypto', confidence: 0.9 },
  { regex: /\b(token|coin)\b.*\b(launch|listing|airdrop)\b/i, category: 'crypto', confidence: 0.6 },
  { regex: /\b(halving|halvening)\b/i, category: 'crypto', confidence: 0.95 },

  // AI & Tech
  { regex: /\b(gpt|claude|gemini|llama|openai|anthropic|google)\b.*\b(launch|releas|announc|model|update)\b/i, category: 'ai-tech', confidence: 0.8 },
  { regex: /\b(apple|iphone|ipad|mac|wwdc|ios)\b.*\b(launch|releas|announc|event|keynote)\b/i, category: 'ai-tech', confidence: 0.85 },
  { regex: /\b(nvidia|amd|intel)\b.*\b(launch|chip|gpu|earnings)\b/i, category: 'ai-tech', confidence: 0.7 },
  { regex: /\b(spacex|nasa)\b.*\b(launch|mission|starship)\b/i, category: 'ai-tech', confidence: 0.9 },

  // Sports
  { regex: /\b(ufc|fight.night|main.event)\b.*\b(vs|versus|fight|card|bout)\b/i, category: 'sports', confidence: 0.9 },
  { regex: /\b(nba|nfl|mlb|nhl)\b.*\b(final|playoff|championship|super.bowl|world.series)\b/i, category: 'sports', confidence: 0.9 },
  { regex: /\b(world.cup|olympics|grand.prix|f1)\b/i, category: 'sports', confidence: 0.9 },

  // Esports
  { regex: /\b(cs2|counter.strike|valorant|dota|league.of.legends|lol)\b.*\b(major|final|tournament|championship)\b/i, category: 'esports', confidence: 0.85 },

  // Entertainment
  { regex: /\b(netflix|disney|hbo|spotify)\b.*\b(launch|premier|releas|record|milestone)\b/i, category: 'entertainment', confidence: 0.7 },
  { regex: /\b(oscar|grammy|emmy|billboard|box.office)\b/i, category: 'entertainment', confidence: 0.85 },
];

interface EventPattern {
  regex: RegExp;
  category: MarketCategory;
  confidence: number;
}

// =============================================================================
// RSS Parser (dependency-free)
// =============================================================================

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

function parseRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // RSS 2.0 <item> elements
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = extractTag(content, 'title');
    const description = extractTag(content, 'description') || extractTag(content, 'summary');
    const link = extractTag(content, 'link') || extractAttrTag(content, 'link', 'href');
    const pubDate = extractTag(content, 'pubDate') || extractTag(content, 'published') || extractTag(content, 'updated');

    if (title) {
      items.push({
        title: stripHtml(title),
        description: stripHtml(description || ''),
        link: link || '',
        pubDate: pubDate || '',
      });
    }
  }

  // Atom <entry> elements
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((match = entryRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = extractTag(content, 'title');
    const summary = extractTag(content, 'summary') || extractTag(content, 'content');
    const link = extractAttrTag(content, 'link', 'href') || extractTag(content, 'link');
    const pubDate = extractTag(content, 'published') || extractTag(content, 'updated');

    if (title) {
      items.push({
        title: stripHtml(title),
        description: stripHtml(summary || ''),
        link: link || '',
        pubDate: pubDate || '',
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function extractAttrTag(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*/?>`, 'i');
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

// =============================================================================
// Question Generation
// =============================================================================

function generateQuestion(item: RSSItem, pattern: EventPattern): string | null {
  const text = `${item.title} ${item.description}`.toLowerCase();

  // Extract key entities and create objective questions
  // Crypto price questions
  const priceMatch = text.match(/\b(bitcoin|btc|ethereum|eth|solana|sol)\b.*?\$([0-9,]+)/i);
  if (priceMatch) {
    const token = priceMatch[1].toUpperCase().replace('BITCOIN', 'BTC').replace('ETHEREUM', 'ETH').replace('SOLANA', 'SOL');
    const price = priceMatch[2].replace(/,/g, '');
    const target = Math.ceil(parseInt(price) / 1000) * 1000;
    return `Will ${token} reach $${target.toLocaleString()} by end of this week?`;
  }

  // ETF/regulatory decisions
  const etfMatch = text.match(/\b(sec|etf)\b.*\b(approv|reject|decision|deadline)\b/i);
  if (etfMatch) {
    // Extract the subject
    const cryptoMatch = text.match(/\b(bitcoin|ethereum|solana|xrp|litecoin)\b/i);
    if (cryptoMatch) {
      return `Will the ${cryptoMatch[1]} ETF be approved this month?`;
    }
  }

  // UFC/MMA
  const ufcMatch = text.match(/\b(ufc\s*\d+)\b/i);
  if (ufcMatch) {
    const vsMatch = text.match(/(\w+(?:\s\w+)?)\s+vs\.?\s+(\w+(?:\s\w+)?)/i);
    if (vsMatch) {
      return `Will ${vsMatch[1].trim()} win at ${ufcMatch[1]}?`;
    }
  }

  // Product launches
  const launchMatch = text.match(/\b(launch|releas|announc)\w*\b.*?\b(this|next|in)\s+(week|month|quarter|year|january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  if (launchMatch) {
    // Clean up title for question
    const subject = item.title.replace(/[^\w\s]/g, '').slice(0, 100);
    return `Will this happen by next week: ${subject}?`;
  }

  // Generic: turn headline into yes/no question if it describes a future event
  const futureIndicators = /\b(will|expected|planning|set to|aims to|targets|forecast|predicted|upcoming|announces|scheduled)\b/i;
  if (futureIndicators.test(item.title)) {
    let question = item.title
      .replace(/^(breaking|update|report|exclusive|just in)[\s:]+/i, '')
      .trim();

    // Ensure it ends with ?
    if (!question.endsWith('?')) {
      // Try to convert statement to question
      if (question.length < 180) {
        question = `Will this happen: ${question}?`;
      }
    }

    if (question.length >= 10 && question.length <= 200) {
      return question;
    }
  }

  return null;
}

// =============================================================================
// Public API
// =============================================================================

export async function scanRSSFeeds(): Promise<DetectedEvent[]> {
  const events: DetectedEvent[] = [];
  const now = new Date();
  const maxAge = 6 * 60 * 60 * 1000; // 6 hours

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`[RSSSource] Scanning ${feed.name}...`);
      const resp = await fetch(feed.url, {
        headers: {
          'User-Agent': 'BaoziMarketFactory/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!resp.ok) {
        console.warn(`[RSSSource] ${feed.name} returned ${resp.status}`);
        continue;
      }

      const xml = await resp.text();
      const items = parseRSS(xml);
      console.log(`[RSSSource] ${feed.name}: ${items.length} items`);

      for (const item of items.slice(0, 20)) { // Process top 20 items
        // Skip old items
        if (item.pubDate) {
          const pubDate = new Date(item.pubDate);
          if (now.getTime() - pubDate.getTime() > maxAge) continue;
        }

        // Check against event patterns
        const text = `${item.title} ${item.description}`;
        for (const pattern of EVENT_PATTERNS) {
          if (pattern.regex.test(text)) {
            const question = generateQuestion(item, pattern);
            if (!question) continue;

            // Set event time: 48h from now for news-based events
            const eventTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
            const eventId = `rss:${feed.source}:${hashString(item.title + item.link)}`;

            events.push({
              eventId,
              title: item.title,
              source: feed.source,
              category: pattern.category,
              eventTime,
              suggestedQuestion: question,
              marketType: 'boolean',
              confidence: pattern.confidence,
              resolutionSource: `News source: ${item.link}`,
              metadata: {
                feedName: feed.name,
                link: item.link,
                pubDate: item.pubDate,
              },
            });
            break; // One market per item
          }
        }
      }
    } catch (err) {
      console.warn(`[RSSSource] Failed to scan ${feed.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[RSSSource] Total detected: ${events.length} potential markets`);
  return events;
}

/** Simple string hash for dedup IDs */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
