export class BaoziAPIClient {
  constructor(config) {
    this.config = config;
    this.apiBase = config.baoziApiBase;
  }

  async getActiveMarkets() {
    // In a real implementation, this would call the Baozi API
    // For now, we'll simulate or use the MCP server approach
    try {
      const response = await fetch(`${this.apiBase}/markets`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch markets: ${response.status}`);
      }
      
      const data = await response.json();
      return data.markets || [];
      
    } catch (error) {
      console.warn('⚠️  Direct API access failed, using fallback data extraction');
      return [];
    }
  }

  async getMarketQuote(marketPda) {
    try {
      const response = await fetch(`${this.apiBase}/markets/${marketPda}/quote`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch quote for ${marketPda}: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.warn(`⚠️  Failed to get quote for ${marketPda}:`, error.message);
      return null;
    }
  }

  async getRaceMarkets() {
    try {
      const response = await fetch(`${this.apiBase}/race-markets`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch race markets: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.warn('⚠️  Failed to fetch race markets:', error.message);
      return [];
    }
  }

  // Fallback method to extract market data from public sources
  async getMarketDataFromAgentBook() {
    // This leverages the fact that AgentBook posts contain market information
    // and is accessible without authentication
    const agentBookResponse = await fetch(`${this.apiBase}/agentbook/posts`);
    
    if (!agentBookResponse.ok) {
      throw new Error('Failed to fetch AgentBook posts for market data');
    }
    
    const agentBookData = await agentBookResponse.json();
    return this.extractMarketDataFromPosts(agentBookData.posts || []);
  }

  extractMarketDataFromPosts(posts) {
    const markets = new Map();
    
    for (const post of posts) {
      if (post.marketPda) {
        // Extract market info from post content
        const marketInfo = this.parseMarketInfo(post.content);
        
        if (marketInfo) {
          markets.set(post.marketPda, {
            pda: post.marketPda,
            ...marketInfo,
            lastSeen: post.createdAt,
            agentPosts: markets.has(post.marketPda) 
              ? markets.get(post.marketPda).agentPosts + 1 
              : 1
          });
        }
      }
    }
    
    return Array.from(markets.values());
  }

  parseMarketInfo(content) {
    // Extract market title from quotes
    const titleMatch = content.match(/[""]([^""]+)[""]/) || content.match(/"([^"]+)"/);
    if (!titleMatch) return null;

    const title = titleMatch[1];

    // Extract odds information
    const oddsPatterns = [
      /(\d+)%\s+(YES|NO)/i,
      /(YES|NO)\s+(\d+)%/i,
      /leading:\s+(YES|NO)\s+(\d+)%/i,
      /(YES|NO)\s+at\s+(\d+)%/i
    ];

    let odds = null;
    for (const pattern of oddsPatterns) {
      const match = content.match(pattern);
      if (match) {
        odds = {
          side: match[2] || match[1],
          percentage: parseInt(match[1] || match[2])
        };
        break;
      }
    }

    // Extract pool size
    const poolMatch = content.match(/(\d+\.?\d*)\s+SOL/i);
    const poolSize = poolMatch ? parseFloat(poolMatch[1]) : 0;

    // Extract category from content patterns
    let category = 'unknown';
    const categoryPatterns = {
      crypto: /bitcoin|btc|ethereum|eth|solana|sol|crypto/i,
      social: /tweet|emoji|social|twitter/i,
      entertainment: /film|movie|oscar|bafta|award/i,
      sports: /sport|game|match|championship/i,
      finance: /market|stock|etf|sec|price/i
    };

    for (const [cat, pattern] of Object.entries(categoryPatterns)) {
      if (pattern.test(content)) {
        category = cat;
        break;
      }
    }

    return {
      title: title.trim(),
      odds,
      poolSize,
      category,
      sentiment: this.analyzeSentiment(content)
    };
  }

  analyzeSentiment(content) {
    // Simple sentiment analysis based on keywords
    const bullishWords = ['undervalued', 'opportunity', 'alpha', 'buy', 'bullish', 'moon'];
    const bearishWords = ['overpriced', 'mispriced', 'fade', 'short', 'bearish', 'dump'];
    
    const text = content.toLowerCase();
    const bullishCount = bullishWords.filter(word => text.includes(word)).length;
    const bearishCount = bearishWords.filter(word => text.includes(word)).length;
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }
}