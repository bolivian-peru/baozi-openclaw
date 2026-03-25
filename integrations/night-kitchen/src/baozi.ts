import axios from 'axios';

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
  outcomes?: string[];
  outcomePools?: number[];
  isRace: boolean;
}

export interface MarketSummary {
  active: number;
  closed: number;
  totalPoolSol: number;
  topByPool: Market[];
  closingSoon: Market[];
  justResolved: Market[];
}

export class BaoziClient {
  private apiUrl = 'https://baozi.bet/api/markets';
  private lastRequestTime: number = 0;
  
  private async throttle(): Promise<void> {
    const now = Date.now();
    const diff = now - this.lastRequestTime;
    if (diff < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - diff));
    }
    this.lastRequestTime = Date.now();
  }
  
  async getAllMarkets(): Promise<Market[]> {
    try {
      await this.throttle();
      const response = await axios.get(this.apiUrl);
      if (response.data.success && response.data.data && response.data.data.binary) {
        return response.data.data.binary;
      }
      return [];
    } catch (error) {
      console.error('Error fetching markets:', error);
      return [];
    }
  }
  
  async getActiveMarkets(limit = 20): Promise<Market[]> {
    const markets = await this.getAllMarkets();
    return markets
      .filter(m => m.status === 'Active' && m.isBettingOpen)
      .slice(0, limit);
  }
  
  async getMarketsByStatus(status: string): Promise<Market[]> {
    const markets = await this.getAllMarkets();
    if (status === 'closed') {
      return markets.filter(m => m.status !== 'Active');
    }
    return markets.filter(m => m.status === 'Active');
  }
  
  async getMarketSummary(): Promise<MarketSummary> {
    const allMarkets = await this.getAllMarkets();
    
    const activeMarkets = allMarkets.filter(m => m.status === 'Active' && m.isBettingOpen);
    const closedMarkets = allMarkets.filter(m => m.status !== 'Active');
    
    // Sort by pool size
    const sortedByPool = [...activeMarkets].sort((a, b) => b.totalPoolSol - a.totalPoolSol);
    
    // Find closing soon (< 24h)
    const now = Date.now();
    const closingSoon = activeMarkets
      .filter(m => {
        const closing = new Date(m.closingTime).getTime();
        return closing > now && closing < now + 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime());
    
    // Recently resolved (from closed markets)
    const justResolved = closedMarkets.slice(0, 5);
    
    return {
      active: activeMarkets.length,
      closed: closedMarkets.length,
      totalPoolSol: activeMarkets.reduce((sum, m) => sum + m.totalPoolSol, 0),
      topByPool: sortedByPool.slice(0, 5),
      closingSoon: closingSoon.slice(0, 5),
      justResolved: justResolved.slice(0, 3)
    };
  }
  
  async getMarketById(marketId: number): Promise<Market | null> {
    const markets = await this.getAllMarkets();
    return markets.find(m => m.marketId === marketId) || null;
  }
  
  formatPool(sol: number): string {
    return sol.toFixed(1);
  }
  
  formatPercent(yesPool: number, noPool: number): { yes: number; no: number } {
    const total = yesPool + noPool;
    if (total === 0) return { yes: 50, no: 50 };
    return {
      yes: Math.round((yesPool / total) * 100),
      no: Math.round((noPool / total) * 100)
    };
  }
  
  formatRacePools(outcomePools: number[]): { name: string; percent: number }[] {
    const total = outcomePools.reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    
    return outcomePools.map((pool, i) => ({
      name: `Outcome ${i + 1}`,
      percent: Math.round((pool / total) * 100)
    }));
  }
  
  timeRemaining(closingTime: string): string {
    const closing = new Date(closingTime).getTime();
    const now = Date.now();
    const diff = closing - now;
    
    if (diff < 0) return 'closed';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return '<1h';
  }
}