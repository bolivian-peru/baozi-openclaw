import axios from 'axios';

interface Market {
  id: string;
  question: string;
  YES: number;
  NO: number;
  poolSize: number;
  endsAt: string;
  createdAt: string;
  resolved: boolean;
}

interface ShareCard {
  imageUrl: string;
  marketUrl: string;
}

interface Config {
  affiliateCode: string;
  walletAddress: string;
  pollInterval: number;
  largeBetThreshold: number;
  oddsSwingThreshold: number;
}

const DEFAULT_CONFIG: Config = {
  affiliateCode: process.env.AFFILIATE_CODE || '',
  walletAddress: process.env.WALLET_ADDRESS || '',
  pollInterval: parseInt(process.env.POLL_INTERVAL || '60000'),
  largeBetThreshold: parseFloat(process.env.LARGE_BET_THRESHOLD || '5'),
  oddsSwingThreshold: parseFloat(process.env.ODDS_SWING_THRESHOLD || '0.10'),
};

class ShareCardViralEngine {
  private markets: Map<string, Market> = new Map();
  private config: Config;
  private lastOdds: Map<string, { YES: number; NO: number }> = new Map();

  constructor(config: Partial<Config> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    console.log('� starting Share Card Viral Engine...');
    console.log(`📋 Config: poll=${this.config.pollInterval}ms, largeBet=${this.config.largeBetThreshold}SOL`);

    // Initial fetch
    await this.checkMarkets();

    // Start polling
    setInterval(() => this.checkMarkets(), this.config.pollInterval);
  }

  private async checkMarkets(): Promise<void> {
    try {
      console.log(`\n${new Date().toISOString()} 🔍 Checking markets...`);
      const markets = await this.fetchMarkets();
      
      for (const market of markets) {
        await this.processMarket(market);
      }
      
      console.log(`✅ Processed ${markets.length} markets`);
    } catch (error) {
      console.error('❌ Error checking markets:', error);
    }
  }

  private async fetchMarkets(): Promise<Market[]> {
    // In production, use MCP server. For demo, use API directly.
    try {
      const response = await axios.get('https://baozi.bet/api/markets', {
        params: { limit: 50, status: 'open' }
      });
      return response.data.markets || [];
    } catch (error) {
      console.log('📝 Using mock markets for demo');
      return this.getMockMarkets();
    }
  }

  private async processMarket(market: Market): Promise<void> {
    const isNew = this.isNewMarket(market);
    const isClosingSoon = this.isClosingSoon(market);
    const oddsSwing = this.checkOddsSwing(market);

    if (isNew) {
      console.log(`🆕 New market: ${market.question}`);
      await this.generateAndPost(market, 'new_market');
    }

    if (isClosingSoon) {
      console.log(`⏰ Closing soon: ${market.question}`);
      await this.generateAndPost(market, 'closing_soon');
    }

    if (oddsSwing > this.config.oddsSwingThreshold) {
      console.log(`📊 Odds swing: ${(oddsSwing * 100).toFixed(1)}% - ${market.question}`);
      await this.generateAndPost(market, 'odds_swing');
    }

    // Update last odds
    this.lastOdds.set(market.id, { YES: market.YES, NO: market.NO });
  }

  private isNewMarket(market: Market): boolean {
    const created = new Date(market.createdAt);
    const now = new Date();
    const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursOld < 1;
  }

  private isClosingSoon(market: Market): boolean {
    const ends = new Date(market.endsAt);
    const now = new Date();
    const hoursLeft = (ends.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft < 24;
  }

  private checkOddsSwing(market: Market): number {
    const last = this.lastOdds.get(market.id);
    if (!last) return 0;

    const yesSwing = Math.abs(market.YES - last.YES);
    return yesSwing;
  }

  async generateAndPost(market: Market, eventType: string): Promise<void> {
    try {
      // Generate share card
      const card = await this.generateShareCard(market);
      console.log(`🎴 Generated card: ${card.imageUrl}`);

      // Craft caption
      const caption = this.craftCaption(market, eventType);
      console.log(`📝 Caption: ${caption.substring(0, 100)}...`);

      // Post to platform (mock for now)
      // In production: post to AgentBook/Twitter/Telegram
      console.log(`🚀 Would post to ${process.env.POST_PLATFORM || 'agentbook'}`);
      
    } catch (error) {
      console.error('❌ Error generating/posting:', error);
    }
  }

  private async generateShareCard(market: Market): Promise<ShareCard> {
    // Use Baozi API
    const url = `https://baozi.bet/api/share/card?market=${market.id}&wallet=${this.config.walletAddress}&ref=${this.config.affiliateCode}`;
    
    try {
      const response = await axios.get(url);
      return response.data;
    } catch {
      // Return mock for demo
      return {
        imageUrl: `https://baozi.bet/cards/${market.id}.png`,
        marketUrl: `https://baozi.bet/market/${market.id}?ref=${this.config.affiliateCode}`
      };
    }
  }

  private craftCaption(market: Market, eventType: string): string {
    const eventEmoji: Record<string, string> = {
      new_market: '🆕 fresh from the steamer',
      closing_soon: '⏰ closing soon',
      odds_swing: '📊 odds are shifting',
      resolved: '✅ market resolved'
    };

    const yesPercent = (market.YES * 100).toFixed(0);
    const noPercent = (market.NO * 100).toFixed(0);
    const poolSOL = market.poolSize.toFixed(1);
    
    const ends = new Date(market.endsAt);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.round((ends.getTime() - now.getTime()) / (1000 * 60 * 60)));
    const daysLeft = Math.round(hoursLeft / 24);

    const timeStr = daysLeft > 0 ? `${daysLeft} days` : `${hoursLeft} hours`;

    return `${eventEmoji[eventType]} 🥟

"${market.question}"

YES: ${yesPercent}% | NO: ${noPercent}% | Pool: ${poolSOL} SOL
${hoursLeft > 0 ? `closing in ${timeStr}` : 'closed'}

place your bet → ${this.getMarketUrl(market)}

运气在蒸，别急掀盖
"luck is steaming, don't lift the lid"`;
  }

  private getMarketUrl(market: Market): string {
    return `https://baozi.bet/market/${market.id}?ref=${this.config.affiliateCode}`;
  }

  private getMockMarkets(): Market[] {
    return [
      {
        id: 'mock-1',
        question: 'Will BTC hit $110k by March 31, 2026?',
        YES: 0.62,
        NO: 0.38,
        poolSize: 45.2,
        endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        resolved: false
      },
      {
        id: 'mock-2',
        question: 'Will Ethereum hit $5k by Q2 2026?',
        YES: 0.55,
        NO: 0.45,
        poolSize: 28.7,
        endsAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolved: false
      },
      {
        id: 'mock-3',
        question: 'Will GPT-5 be announced by April 2026?',
        YES: 0.48,
        NO: 0.52,
        poolSize: 15.3,
        endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        resolved: false
      }
    ];
  }
}

// Run if executed directly
const engine = new ShareCardViralEngine();
engine.start().catch(console.error);
