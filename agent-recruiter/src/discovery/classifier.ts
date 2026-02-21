import type { AgentType } from '../types.js';

/**
 * Classify an agent's type based on name and description.
 * 
 * Uses keyword matching to determine the most likely category
 * for tailored outreach messaging.
 */

const TYPE_KEYWORDS: Record<AgentType, string[]> = {
  'crypto-analyst': [
    'crypto', 'bitcoin', 'btc', 'eth', 'solana', 'sol', 'defi',
    'analysis', 'analyst', 'alpha', 'prediction', 'forecast',
    'chart', 'technical analysis', 'ta', 'price', 'market cap',
    'token', 'onchain', 'on-chain',
  ],
  'trading-bot': [
    'trading', 'trader', 'bot', 'arbitrage', 'arb', 'dex',
    'swap', 'liquidity', 'market maker', 'sniper', 'mev',
    'automated', 'algo', 'algorithmic', 'execution',
    'order', 'position', 'hedge',
  ],
  'social-agent': [
    'social', 'twitter', 'x.com', 'discord', 'telegram',
    'community', 'engage', 'content', 'post', 'influencer',
    'follower', 'audience', 'viral', 'meme', 'nft',
    'creator', 'media',
  ],
  'defi-agent': [
    'defi', 'yield', 'farm', 'stake', 'staking', 'lend',
    'borrow', 'vault', 'protocol', 'tvl', 'apy', 'apr',
    'liquidity pool', 'amm', 'compound', 'aave',
  ],
  'research-agent': [
    'research', 'data', 'scrape', 'crawl', 'report',
    'intelligence', 'insight', 'investigate', 'survey',
    'knowledge', 'rag', 'retrieval', 'database', 'academic',
  ],
  'general-purpose': [
    'general', 'assistant', 'helper', 'ai agent', 'autonomous',
    'multipurpose', 'utility', 'tool',
  ],
  'unknown': [],
};

export function classifyAgentType(name: string, description: string): AgentType {
  const text = `${name} ${description}`.toLowerCase();

  const scores: Record<AgentType, number> = {
    'crypto-analyst': 0,
    'trading-bot': 0,
    'social-agent': 0,
    'defi-agent': 0,
    'research-agent': 0,
    'general-purpose': 0,
    'unknown': 0,
  };

  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        scores[type as AgentType] += 1;
      }
    }
  }

  // Find the type with highest score
  let bestType: AgentType = 'unknown';
  let bestScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as AgentType;
    }
  }

  // Require at least 1 keyword match to classify
  return bestScore > 0 ? bestType : 'unknown';
}
