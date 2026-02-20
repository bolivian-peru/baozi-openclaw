/**
 * Keyword dictionaries for market categorization
 */

import type { MarketCategory } from '../types/index.js';

export const CATEGORY_KEYWORDS: Record<MarketCategory, string[]> = {
  crypto: [
    'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'crypto', 'token',
    'blockchain', 'defi', 'nft', 'web3', 'dex', 'cex', 'binance', 'coinbase',
    'price', 'market cap', 'altcoin', 'memecoin', 'dogecoin', 'doge', 'shib',
    'airdrop', 'staking', 'mining', 'halving', 'pump', 'dump', 'moon',
    'lambo', 'hodl', 'rug', 'tvl', 'yield', 'swap', 'bridge', 'layer 2',
    'l2', 'rollup', 'usdc', 'usdt', 'stablecoin', 'dao', 'governance',
    'bonk', 'jup', 'jupiter', 'raydium', 'orca', 'wif', 'pepe',
  ],
  politics: [
    'president', 'election', 'vote', 'congress', 'senate', 'democrat',
    'republican', 'trump', 'biden', 'policy', 'government', 'political',
    'legislation', 'bill', 'law', 'supreme court', 'governor', 'mayor',
    'campaign', 'primary', 'caucus', 'impeach', 'resign', 'cabinet',
    'parliament', 'minister', 'chancellor', 'eu', 'nato', 'un',
  ],
  sports: [
    'nba', 'nfl', 'mlb', 'nhl', 'soccer', 'football', 'basketball',
    'baseball', 'hockey', 'tennis', 'golf', 'ufc', 'mma', 'boxing',
    'world cup', 'olympics', 'super bowl', 'championship', 'playoff',
    'finals', 'mvp', 'win', 'lose', 'score', 'team', 'player',
    'league', 'season', 'match', 'game', 'tournament', 'copa',
    'premier league', 'la liga', 'serie a', 'bundesliga', 'f1', 'formula',
  ],
  entertainment: [
    'movie', 'film', 'tv', 'show', 'netflix', 'disney', 'marvel',
    'oscar', 'grammy', 'emmy', 'celebrity', 'actor', 'actress', 'singer',
    'album', 'song', 'concert', 'tour', 'box office', 'streaming',
    'youtube', 'tiktok', 'instagram', 'viral', 'trending', 'influencer',
    'taylor swift', 'drake', 'kanye', 'beyonce', 'podcast', 'spotify',
  ],
  technology: [
    'ai', 'artificial intelligence', 'chatgpt', 'openai', 'google', 'apple',
    'microsoft', 'meta', 'tesla', 'elon musk', 'spacex', 'launch',
    'iphone', 'android', 'software', 'hardware', 'chip', 'semiconductor',
    'nvidia', 'amd', 'intel', 'cloud', 'saas', 'startup', 'ipo',
    'robot', 'autonomous', 'quantum', 'machine learning', 'gpt', 'llm',
    'claude', 'anthropic', 'copilot', 'github', 'coding', 'developer',
  ],
  finance: [
    'stock', 'market', 's&p', 'nasdaq', 'dow', 'fed', 'interest rate',
    'inflation', 'recession', 'gdp', 'unemployment', 'bonds', 'treasury',
    'forex', 'dollar', 'euro', 'yen', 'commodity', 'gold', 'oil',
    'earnings', 'revenue', 'profit', 'ipo', 'merger', 'acquisition',
    'hedge fund', 'wall street', 'bull', 'bear', 'correction', 'crash',
  ],
  science: [
    'nasa', 'space', 'mars', 'moon landing', 'climate', 'vaccine',
    'research', 'study', 'discovery', 'experiment', 'physics', 'biology',
    'chemistry', 'medicine', 'health', 'disease', 'pandemic', 'virus',
    'dna', 'gene', 'crispr', 'cancer', 'treatment', 'fda', 'drug',
  ],
  'world-events': [
    'war', 'peace', 'treaty', 'conflict', 'sanction', 'earthquake',
    'hurricane', 'disaster', 'refugee', 'immigration', 'border',
    'trade', 'tariff', 'embargo', 'summit', 'g7', 'g20', 'brics',
    'ukraine', 'russia', 'china', 'taiwan', 'iran', 'israel', 'gaza',
  ],
  meme: [
    'meme', 'lol', 'based', 'cope', 'seethe', 'ratio', 'cringe',
    'chad', 'sigma', 'gigachad', 'wojak', 'pepe', 'dank', 'shitpost',
    'yolo', 'fomo', 'jeet', 'degen', 'wen', 'ngmi', 'wagmi', 'gm',
    'probably nothing', 'few understand', 'imagine', 'anon',
  ],
  weather: [
    'weather', 'temperature', 'rain', 'snow', 'storm', 'hurricane',
    'tornado', 'flood', 'drought', 'heat wave', 'cold', 'forecast',
    'celsius', 'fahrenheit', 'wind', 'sunny', 'cloudy',
  ],
  gaming: [
    'game', 'gaming', 'esports', 'twitch', 'steam', 'playstation', 'xbox',
    'nintendo', 'fortnite', 'league of legends', 'valorant', 'cs2', 'csgo',
    'minecraft', 'roblox', 'gta', 'call of duty', 'speedrun', 'streamer',
  ],
  culture: [
    'art', 'music', 'book', 'fashion', 'food', 'travel', 'lifestyle',
    'religion', 'philosophy', 'education', 'university', 'school',
    'social media', 'twitter', 'x.com', 'reddit', '4chan',
  ],
  other: [],
};

/**
 * Words that indicate poor question quality
 */
export const QUALITY_RED_FLAGS = [
  'idk', 'lol', 'test', 'asdf', 'xxx', 'aaa', 'bbb',
  'delete this', 'ignore', 'placeholder',
];

/**
 * Patterns that indicate a well-formed question
 */
export const GOOD_QUESTION_PATTERNS = [
  /^will /i,
  /^can /i,
  /^does /i,
  /^is /i,
  /^are /i,
  /^has /i,
  /^have /i,
  /^do /i,
  /\?$/,
  /by (january|february|march|april|may|june|july|august|september|october|november|december|\d{4})/i,
  /before /i,
  /after /i,
  /reach /i,
  /exceed /i,
  /above /i,
  /below /i,
];
