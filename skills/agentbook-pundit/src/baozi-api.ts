import axios from 'axios';
import { config } from './config';

export interface Market {
  publicKey: string;
  marketId: number;
  question: string;
  status: string;
  layer: string;
  outcome: string;
  yesPercent: number;
  noPercent: number;
  totalPoolSol: number;
  closingTime: string;
  isBettingOpen: boolean;
  category: string | null;
  creator: string;
  platformFeeBps: number;
}

export interface RaceMarket {
  publicKey: string;
  marketId: number;
  question: string;
  status: string;
  layer: string;
  totalPoolSol: number;
  closingTime: string;
  outcomes: Array<{ label: string; percent: number; poolSol: number }>;
}

export class BaoziAPI {
  private apiUrl: string;

  constructor() {
    this.apiUrl = config.apiUrl;
  }

  async getMarkets(): Promise<{ binary: Market[]; race: RaceMarket[] }> {
    try {
      const response = await axios.get(`${this.apiUrl}/markets`);
      if (!response.data.success) throw new Error('API returned success: false');
      return {
        binary: response.data.data.binary || [],
        race: response.data.data.race || [],
      };
    } catch (err) {
      console.error('Error fetching markets:', err);
      return { binary: [], race: [] };
    }
  }

  async getActiveMarkets(): Promise<Market[]> {
    const { binary } = await this.getMarkets();
    return binary.filter(m => m.status === 'Active' && m.isBettingOpen);
  }

  async getHotMarkets(limit = 5): Promise<Market[]> {
    const active = await this.getActiveMarkets();
    return active.sort((a, b) => b.totalPoolSol - a.totalPoolSol).slice(0, limit);
  }

  async getClosingSoon(hoursThreshold = 24): Promise<Market[]> {
    const active = await this.getActiveMarkets();
    const cutoff = Date.now() + hoursThreshold * 60 * 60 * 1000;
    return active
      .filter(m => new Date(m.closingTime).getTime() < cutoff && new Date(m.closingTime).getTime() > Date.now())
      .sort((a, b) => new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime());
  }

  async getLabMarkets(): Promise<Market[]> {
    const { binary } = await this.getMarkets();
    return binary.filter(m => m.layer === 'Lab');
  }

  async getNewLabMarkets(sinceMinutes = 60): Promise<Market[]> {
    // Get lab markets — since we can't filter by creation time directly,
    // we'll get active lab markets and check their IDs (higher = newer)
    const labs = await this.getLabMarkets();
    return labs.filter(m => m.status === 'Active').sort((a, b) => b.marketId - a.marketId);
  }

  async postToAgentBook(content: string, marketPda?: string): Promise<boolean> {
    try {
      const body: any = {
        walletAddress: config.walletAddress,
        content,
      };
      if (marketPda) body.marketPda = marketPda;

      const response = await axios.post(`${this.apiUrl}/agentbook/posts`, body);
      if (response.data.success) {
        console.log(`✅ Posted to AgentBook: "${content.substring(0, 80)}..."`);
        return true;
      } else {
        console.error('AgentBook post failed:', response.data.error);
        return false;
      }
    } catch (err: any) {
      console.error('AgentBook post error:', err.response?.data || err.message);
      return false;
    }
  }

  async commentOnMarket(marketPda: string, content: string, signature: string, message: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/markets/${marketPda}/comments`,
        { content },
        {
          headers: {
            'x-wallet-address': config.walletAddress,
            'x-signature': signature,
            'x-message': message,
          },
        }
      );
      if (response.data.success) {
        console.log(`✅ Commented on market ${marketPda.substring(0, 8)}...`);
        return true;
      } else {
        console.error('Comment failed:', response.data.error);
        return false;
      }
    } catch (err: any) {
      console.error('Comment error:', err.response?.data || err.message);
      return false;
    }
  }
}
