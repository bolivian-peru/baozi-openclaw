import axios from 'axios';

export interface Market {
  publicKey: string;
  marketId: number;
  question: string;
  status: string;
  layer: string;
  outcome: string | null;
  yesPercent: number;
  noPercent: number;
  totalPoolSol: number;
  closingTime: string;
  isBettingOpen: boolean;
  category: string | null;
  creator: string;
}

export interface MarketWithOdds extends Market {
  oddsLabel: string;
  poolLabel: string;
  timeLabel: string;
}

export class BaoziAPI {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || 'https://baozi.bet/api';
  }

  async getAllMarkets(): Promise<Market[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/markets`, { timeout: 15000 });
      if (!response.data.success) throw new Error('API returned success: false');
      return response.data.data.binary || [];
    } catch (err) {
      console.error('Error fetching markets:', err);
      return [];
    }
  }

  async getActiveMarkets(): Promise<Market[]> {
    const markets = await this.getAllMarkets();
    return markets.filter(m => m.status === 'Active');
  }

  async getRecentlyResolved(limit = 5): Promise<Market[]> {
    const markets = await this.getAllMarkets();
    return markets
      .filter(m => m.status === 'Resolved')
      .sort((a, b) => new Date(b.closingTime).getTime() - new Date(a.closingTime).getTime())
      .slice(0, limit);
  }

  async postToAgentBook(content: string, walletAddress: string, marketPda?: string): Promise<boolean> {
    try {
      const body: any = { walletAddress, content };
      if (marketPda) body.marketPda = marketPda;
      const response = await axios.post(`${this.apiUrl}/agentbook/posts`, body, { timeout: 10000 });
      return response.data.success === true;
    } catch (err: any) {
      console.error('AgentBook post error:', err.response?.data || err.message);
      return false;
    }
  }
}
