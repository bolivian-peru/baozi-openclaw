/**
 * Mock Baozi data provider for testing
 */

import { BaoziDataProvider } from '../services/baozi-client.js';
import { Market, Position, ClaimableWinning, ResolutionStatus } from '../types/index.js';

export class MockBaoziProvider implements BaoziDataProvider {
  positions: Map<string, Position[]> = new Map();
  claimable: Map<string, ClaimableWinning[]> = new Map();
  markets: Map<string, Market> = new Map();
  resolutions: Map<string, ResolutionStatus> = new Map();
  activeMarkets: Market[] = [];

  // Track calls for assertions
  calls: { method: string; args: any[] }[] = [];

  async getPositions(wallet: string): Promise<Position[]> {
    this.calls.push({ method: 'getPositions', args: [wallet] });
    return this.positions.get(wallet) || [];
  }

  async getClaimable(wallet: string): Promise<ClaimableWinning[]> {
    this.calls.push({ method: 'getClaimable', args: [wallet] });
    return this.claimable.get(wallet) || [];
  }

  async getResolutionStatus(marketId: string): Promise<ResolutionStatus> {
    this.calls.push({ method: 'getResolutionStatus', args: [marketId] });
    const res = this.resolutions.get(marketId);
    if (!res) throw new Error(`No resolution for ${marketId}`);
    return res;
  }

  async getMarket(marketId: string): Promise<Market> {
    this.calls.push({ method: 'getMarket', args: [marketId] });
    const market = this.markets.get(marketId);
    if (!market) throw new Error(`No market for ${marketId}`);
    return market;
  }

  async listActiveMarkets(): Promise<Market[]> {
    this.calls.push({ method: 'listActiveMarkets', args: [] });
    return this.activeMarkets;
  }

  // Helper to set up test data
  addPosition(wallet: string, position: Position): void {
    const existing = this.positions.get(wallet) || [];
    existing.push(position);
    this.positions.set(wallet, existing);
  }

  addClaimable(wallet: string, winning: ClaimableWinning): void {
    const existing = this.claimable.get(wallet) || [];
    existing.push(winning);
    this.claimable.set(wallet, existing);
  }

  addMarket(market: Market): void {
    this.markets.set(market.id, market);
  }

  addResolution(resolution: ResolutionStatus): void {
    this.resolutions.set(resolution.marketId, resolution);
  }

  reset(): void {
    this.positions.clear();
    this.claimable.clear();
    this.markets.clear();
    this.resolutions.clear();
    this.activeMarkets = [];
    this.calls = [];
  }
}
