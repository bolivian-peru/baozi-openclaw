/**
 * Trend Detector — Identifies viral topics for market creation
 *
 * Sources:
 * - Google Trends (Daily Search Trends)
 * - CoinDesk (Crypto News)
 * - TechCrunch (Tech News)
 */
import Parser from 'rss-parser';
import axios from 'axios';
import { config } from './config';

const parser = new Parser();

export interface Trend {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  contentSnippet?: string;
  category?: string;
}

export interface MarketProposal {
  question: string;
  category: string;
  source: string;
  sourceUrl: string;
  closingTime: Date;
  confidence: number;
}

const FEEDS = [
  { url: 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=US', source: 'Google Trends', category: 'general' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk', category: 'crypto' },
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', category: 'tech' },
];

export async function fetchTrends(): Promise<Trend[]> {
  const trends: Trend[] = [];

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      console.log(`Fetched ${parsed.items.length} items from ${feed.source}`);
      
      for (const item of parsed.items.slice(0, 10)) { // Top 10 only
        if (item.title && item.link) {
          trends.push({
            title: item.title,
            link: item.link,
            source: feed.source,
            pubDate: item.pubDate || new Date().toISOString(),
            contentSnippet: item.contentSnippet,
            category: feed.category
          });
        }
      }
    } catch (e: any) {
      console.error(`Error fetching ${feed.source}: ${e.message}`);
    }
  }

  return trends;
}

/**
 * Generate a market proposal from a trend using LLM.
 */
export async function generateProposal(trend: Trend): Promise<MarketProposal | null> {
  if (!config.openaiApiKey) {
    console.warn('Skipping proposal generation: No OpenAI API key');
    return null;
  }

  const prompt = `Analyze this trending topic and generate a prediction market proposal for Baozi (Solana prediction markets).

Trend: "${trend.title}"
Source: ${trend.source}
Snippet: "${trend.contentSnippet || ''}"

Requirements:
1. Question must be binary (Yes/No).
2. Must be an EVENT, not a price prediction (Price/Value markets are BANNED).
3. Must be objectively resolvable within 14 days.
4. Closing time must be at least 24h before the event (Type A rule).
5. If it's not suitable for a market (subjective, past event, price prediction), return null.

Return JSON:
{
  "question": "Will X happen by [Date]?",
  "category": "crypto|sports|tech|politics|entertainment",
  "closingTimeISO": "2026-03-01T12:00:00Z",
  "confidence": 0.0-1.0,
  "reasoning": "Why this is a good market"
}`;

  try {
    const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'You are a prediction market architect. Strict v7.0 compliance (no price markets).' }, { role: 'user', content: prompt }],
      temperature: 0.3,
    }, {
      headers: { 'Authorization': `Bearer ${config.openaiApiKey}` }
    });

    const content = resp.data.choices[0].message.content;
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    if (cleanJson === 'null' || cleanJson.includes('null')) return null;

    const data = JSON.parse(cleanJson);
    
    if (data.confidence < 0.8) return null;

    return {
      question: data.question,
      category: data.category,
      source: trend.source,
      sourceUrl: trend.link,
      closingTime: new Date(data.closingTimeISO),
      confidence: data.confidence
    };

  } catch (e: any) {
    console.error(`LLM generation failed for "${trend.title}": ${e.message}`);
    return null;
  }
}
