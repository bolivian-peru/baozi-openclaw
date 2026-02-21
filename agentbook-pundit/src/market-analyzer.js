export class BaoziMarketAnalyzer {
  constructor(openaiApiKey) {
    this.openaiApiKey = openaiApiKey;
    this.apiBase = 'https://api.openai.com/v1';
  }

  async analyzeMarkets(markets) {
    const marketSummaries = markets.map(market => ({
      title: market.title,
      odds: market.odds ? `${market.odds.side} ${market.odds.percentage}%` : 'Unknown odds',
      pool: `${market.poolSize} SOL`,
      category: market.category,
      pda: market.pda.substring(0, 8) + '...'
    }));

    const prompt = `You are a sharp prediction market analyst posting on AgentBook for Baozi.bet. 

Analyze these active markets and provide a punchy take (10-2000 characters):

${JSON.stringify(marketSummaries, null, 2)}

Write like a seasoned trader who spots mispriced markets and arbitrage opportunities. Be opinionated but back it up with reasoning. Include:
- Which markets look mispriced and why  
- Arbitrage or value opportunities
- Contrarian takes where appropriate
- Brief technical analysis of odds vs fundamentals

Keep it engaging and actionable. Traders should learn something or find alpha from your analysis. End with "All markets live at baozi.bet 🥟"

Response should be 200-800 characters for optimal engagement.`;

    try {
      if (this.openaiApiKey && this.openaiApiKey !== 'your_openai_api_key_here') {
        return await this.callOpenAI(prompt);
      } else {
        // Fallback to rule-based analysis when no API key
        return this.generateRuleBasedAnalysis(markets);
      }
    } catch (error) {
      console.warn('⚠️  OpenAI call failed, using rule-based analysis:', error.message);
      return this.generateRuleBasedAnalysis(markets);
    }
  }

  async generateMarketComment(market) {
    const prompt = `Write a brief, insightful comment (10-500 characters) for this prediction market:

Title: ${market.title}
Current odds: ${market.odds ? `${market.odds.side} ${market.odds.percentage}%` : 'Unknown'}
Pool size: ${market.poolSize} SOL
Category: ${market.category}

Be analytical but concise. Point out if odds seem right/wrong, mention key factors, or suggest contrarian views.`;

    try {
      if (this.openaiApiKey && this.openaiApiKey !== 'your_openai_api_key_here') {
        const response = await this.callOpenAI(prompt);
        return response.substring(0, 500); // Ensure under 500 char limit
      } else {
        return this.generateRuleBasedComment(market);
      }
    } catch (error) {
      console.warn('⚠️  OpenAI call failed for comment, using rule-based');
      return this.generateRuleBasedComment(market);
    }
  }

  async callOpenAI(prompt) {
    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system', 
            content: 'You are a witty, analytical prediction market trader who spots mispriced bets and shares alpha.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  generateRuleBasedAnalysis(markets) {
    const insights = [];
    
    // Look for extreme odds (potential mispricing)
    const extremeMarkets = markets.filter(m => 
      m.odds && (m.odds.percentage >= 90 || m.odds.percentage <= 10)
    );
    
    if (extremeMarkets.length > 0) {
      const market = extremeMarkets[0];
      if (market.odds.percentage >= 90) {
        insights.push(`🔥 ${market.title.split('?')[0]}? Market screaming ${market.odds.percentage}% ${market.odds.side} - potential fade opportunity if fundamentals don't support it.`);
      } else {
        insights.push(`🎯 Contrarian alert: ${market.title.split('?')[0]}? Only ${market.odds.percentage}% ${market.odds.side} - could be undervalued.`);
      }
    }
    
    // Look for zero/low liquidity markets
    const zeroPoolMarkets = markets.filter(m => m.poolSize === 0);
    if (zeroPoolMarkets.length > 0) {
      insights.push(`⚠️  ${zeroPoolMarkets.length} markets with 0 SOL pools - early movers get better odds before liquidity arrives.`);
    }
    
    // Crypto market analysis
    const cryptoMarkets = markets.filter(m => 
      m.category === 'crypto' || m.title.toLowerCase().includes('btc') || 
      m.title.toLowerCase().includes('eth') || m.title.toLowerCase().includes('sol')
    );
    
    if (cryptoMarkets.length > 0) {
      const btcMarket = cryptoMarkets.find(m => m.title.toLowerCase().includes('btc'));
      if (btcMarket && btcMarket.title.includes('$100K')) {
        insights.push(`📈 BTC $100K by Feb '26 sitting at ${btcMarket.odds?.percentage || 50}% - halving cycle suggests this could be underpriced.`);
      }
    }
    
    // Social/meme markets
    const socialMarkets = markets.filter(m => 
      m.category === 'social' || m.title.includes('tweet') || m.title.includes('emoji')
    );
    
    if (socialMarkets.length > 0) {
      const pizzaMarket = socialMarkets.find(m => m.title.includes('pizza'));
      if (pizzaMarket) {
        insights.push(`🍕 Pizza emoji market at ${pizzaMarket.odds?.percentage || 50}% - ${pizzaMarket.poolSize} SOL pool means high volatility potential.`);
      }
    }
    
    if (insights.length === 0) {
      insights.push("📊 Markets looking balanced today. Watching for volume and sentiment shifts to identify next alpha opportunity.");
    }
    
    return insights.join(' ') + ' All markets live at baozi.bet 🥟';
  }

  generateRuleBasedComment(market) {
    const { title, odds, poolSize, category } = market;
    
    // Pizza emoji market
    if (title.includes('pizza') && title.includes('emoji')) {
      if (odds?.percentage === 100) {
        return "100% YES with tiny pool = obvious but risky. Someone needs to provide the NO liquidity.";
      }
      return "Social media prediction - engagement patterns matter more than fundamentals here.";
    }
    
    // Crypto price predictions
    if (title.includes('BTC') && title.includes('$100K')) {
      return odds?.percentage && odds.percentage < 60 ? 
        "Undervalued. Halving cycle + institutional adoption = likely moon mission." :
        "Priced in? $100K BTC is ambitious but not impossible given macro tailwinds.";
    }
    
    if (title.includes('ETH') && title.includes('$2800')) {
      return "ETH $2800 depends heavily on staking yields and L2 adoption trends. Watch for upgrades.";
    }
    
    if (title.includes('SOL') && title.includes('$170')) {
      return poolSize === 0 ? 
        "Zero liquidity = early bird pricing. SOL ecosystem growth supports upside." :
        "Solana's memecoin casino effect could drive price volatility either direction.";
    }
    
    // Film/entertainment
    if (category === 'entertainment' || title.includes('BAFTA') || title.includes('Oscar')) {
      return "Award shows are pure narrative trading. Early positioning before nominations is key.";
    }
    
    // Default analysis based on odds and pool
    if (odds?.percentage === 50 && poolSize === 0) {
      return "Coin flip odds with no volume = pure speculation. Wait for info edge or volume.";
    }
    
    if (odds?.percentage >= 80) {
      return `${odds.percentage}% confidence seems high. Contrarian ${odds.side === 'YES' ? 'NO' : 'YES'} bet could have value.`;
    }
    
    if (poolSize < 0.1) {
      return "Low liquidity market - early positions get better pricing but higher slippage risk.";
    }
    
    return "Monitoring for volume and sentiment shifts. Good fundamentals need market timing.";
  }
}