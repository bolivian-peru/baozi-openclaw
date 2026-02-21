import { BaoziMarketAnalyzer } from './market-analyzer.js';
import { AgentBookClient } from './agentbook-client.js';
import { BaoziAPIClient } from './baozi-client.js';

export class BaoziAgentBookPundit {
  constructor(config) {
    this.config = config;
    this.marketAnalyzer = new BaoziMarketAnalyzer(config.openaiApiKey);
    this.agentBookClient = new AgentBookClient(config);
    this.baoziClient = new BaoziAPIClient(config);
    this.lastPostTime = null;
  }

  async run() {
    console.log('🔍 Fetching active markets...');
    
    try {
      // Get active markets from AgentBook posts to understand the data structure
      const agentBookPosts = await this.agentBookClient.getPosts();
      console.log(`📊 Found ${agentBookPosts.length} AgentBook posts`);
      
      // Extract market data from recent posts
      const marketData = this.extractMarketDataFromPosts(agentBookPosts);
      console.log(`🎯 Extracted data for ${marketData.length} markets`);
      
      if (marketData.length === 0) {
        console.log('⚠️  No market data found, creating demo analysis');
        await this.runDemo();
        return;
      }
      
      // Generate market analysis
      const analysis = await this.marketAnalyzer.analyzeMarkets(marketData);
      console.log('🧠 Generated market analysis');
      
      // Check cooldown period
      if (this.shouldWaitForCooldown()) {
        console.log(`⏰ Cooldown active, skipping post (${this.config.cooldownMinutes}min)`);
        console.log('📝 Analysis preview:', analysis.substring(0, 200) + '...');
        return;
      }
      
      // Post to AgentBook (or demo mode)
      if (this.config.isLive) {
        await this.agentBookClient.postAnalysis(analysis);
        this.lastPostTime = Date.now();
        console.log('✅ Posted analysis to AgentBook');
      } else {
        console.log('📝 DEMO MODE - Would post:');
        console.log(analysis);
        console.log(`\n📊 Character count: ${analysis.length}`);
      }
      
      // Optionally comment on individual markets
      await this.commentOnMarkets(marketData);
      
    } catch (error) {
      console.error('❌ Error in main run:', error);
      throw error;
    }
  }

  extractMarketDataFromPosts(posts) {
    const markets = [];
    const seenMarkets = new Set();
    
    for (const post of posts) {
      if (post.marketPda && !seenMarkets.has(post.marketPda)) {
        seenMarkets.add(post.marketPda);
        
        // Extract market info from post content
        const marketInfo = this.parseMarketFromPost(post);
        if (marketInfo) {
          markets.push({
            pda: post.marketPda,
            ...marketInfo,
            recentPosts: posts.filter(p => p.marketPda === post.marketPda)
          });
        }
      }
    }
    
    return markets;
  }

  parseMarketFromPost(post) {
    const content = post.content;
    
    // Look for market titles in quotes
    const titleMatch = content.match(/[""]([^""]+)[""]/) || content.match(/"([^"]+)"/);
    if (!titleMatch) return null;
    
    const title = titleMatch[1];
    
    // Extract odds/percentages
    const oddsMatch = content.match(/(\\d+)%\\s+(YES|NO)/i) || 
                     content.match(/(YES|NO)\\s+(\\d+)%/i) ||
                     content.match(/leading:\\s+(YES|NO)\\s+(\\d+)%/i);
    
    // Extract pool size
    const poolMatch = content.match(/(\\d+\\.?\\d*)\\s+SOL/);
    
    // Extract market category/tags
    const categoryMatch = content.match(/Category:\\s*(\\w+)/i) ||
                         content.match(/Tags:\\s*([^\\n]+)/i);
    
    return {
      title: title.trim(),
      odds: oddsMatch ? { 
        side: oddsMatch[2] || oddsMatch[1], 
        percentage: parseInt(oddsMatch[1] || oddsMatch[2]) 
      } : null,
      poolSize: poolMatch ? parseFloat(poolMatch[1]) : 0,
      category: categoryMatch ? categoryMatch[1].trim() : 'unknown',
      lastUpdate: post.createdAt
    };
  }

  shouldWaitForCooldown() {
    if (!this.lastPostTime) return false;
    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    return (Date.now() - this.lastPostTime) < cooldownMs;
  }

  async commentOnMarkets(marketData) {
    // Only comment on a few select markets to avoid spam
    const marketsToComment = marketData.slice(0, 2);
    
    for (const market of marketsToComment) {
      try {
        const comment = await this.marketAnalyzer.generateMarketComment(market);
        
        if (this.config.isLive) {
          await this.agentBookClient.commentOnMarket(market.pda, comment);
          console.log(`💬 Commented on market ${market.pda.substring(0, 8)}...`);
        } else {
          console.log(`💬 DEMO - Would comment on ${market.title}:`);
          console.log(`   "${comment}"`);
        }
        
        // Small delay between comments
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Error commenting on market ${market.pda}:`, error.message);
      }
    }
  }

  async runDemo() {
    // Create demo market data based on what we see in AgentBook
    const demoMarkets = [
      {
        pda: 'aGv3HyRKrcksPufa7QMWrbK4JdkfuM84q1gobBr9UtA',
        title: 'Will @baozibet tweet a pizza emoji by March 1?',
        odds: { side: 'YES', percentage: 100 },
        poolSize: 0.05,
        category: 'social',
        lastUpdate: new Date().toISOString()
      },
      {
        pda: '9frURmcwHWCnbma7bs2ChfpxpBYmDRvHGJ5HzwNqVrzG',
        title: 'Will BTC be above $100K on 2026-02-25?',
        odds: { side: 'YES', percentage: 50 },
        poolSize: 0,
        category: 'crypto',
        lastUpdate: new Date().toISOString()
      },
      {
        pda: '9SVkyP5RTiLNukCJhp9UiGTxmVwJwBZyrxx2ppX7RcxL',
        title: 'Will ETH be above $2800 on 2026-02-25?',
        odds: { side: 'NO', percentage: 50 },
        poolSize: 0,
        category: 'crypto',
        lastUpdate: new Date().toISOString()
      }
    ];

    console.log('🎭 Running demo with sample markets...');
    const analysis = await this.marketAnalyzer.analyzeMarkets(demoMarkets);
    
    console.log('📝 Generated Analysis:');
    console.log('='.repeat(50));
    console.log(analysis);
    console.log('='.repeat(50));
    console.log(`📊 Character count: ${analysis.length}/2000`);
    
    // Demo comments
    console.log('\\n💬 Demo Market Comments:');
    for (const market of demoMarkets.slice(0, 2)) {
      const comment = await this.marketAnalyzer.generateMarketComment(market);
      console.log(`\\n${market.title}:`);
      console.log(`"${comment}" (${comment.length} chars)`);
    }
  }
}