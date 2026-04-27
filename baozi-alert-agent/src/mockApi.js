// Mock API for demo/testing when real Baozi API is not available
class MockBaoziAPI {
  constructor() {
    this.positions = new Map();
    this.markets = new Map();
    this.claimable = new Map();
    this.initMockData();
  }

  initMockData() {
    // Mock market data
    this.markets.set('market1', {
      id: 'market1',
      name: 'BTC above 120K',
      oddsYes: 65,
      oddsNo: 35,
      closesAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours
      resolved: false,
      outcome: null
    });

    this.markets.set('market2', {
      id: 'market2', 
      name: 'Fed rate cut',
      oddsYes: 45,
      oddsNo: 55,
      closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      resolved: false,
      outcome: null
    });

    this.markets.set('market3', {
      id: 'market3',
      name: 'Grammy AOTY',
      oddsYes: 30,
      oddsNo: 70,
      closesAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      resolved: true,
      outcome: 'YES'
    });

    // Mock positions
    this.positions.set('DemoWallet123456789', [
      {
        marketId: 'market1',
        marketName: 'BTC above 120K',
        outcome: 'YES',
        staked: 1.5,
        potentialWinnings: 2.5,
        odds: 65
      },
      {
        marketId: 'market3',
        marketName: 'Grammy AOTY',
        outcome: 'YES',
        staked: 2.0,
        potentialWinnings: 3.7,
        odds: 30
      }
    ]);

    // Mock claimable
    this.claimable.set('DemoWallet123456789', {
      total: 3.7,
      markets: [
        { marketId: 'market3', amount: 3.7, marketName: 'Grammy AOTY' }
      ]
    });
  }

  async getPositions(wallet) {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 100));
    return this.positions.get(wallet) || [];
  }

  async getClaimable(wallet) {
    await new Promise(r => setTimeout(r, 100));
    return this.claimable.get(wallet) || { total: 0, markets: [] };
  }

  async getResolutionStatus(marketId) {
    await new Promise(r => setTimeout(r, 100));
    const market = this.markets.get(marketId);
    if (!market) return null;
    
    return {
      marketId: market.id,
      resolved: market.resolved,
      outcome: market.outcome,
      claimed: false
    };
  }

  async getMarket(marketId) {
    await new Promise(r => setTimeout(r, 100));
    return this.markets.get(marketId);
  }
}

module.exports = MockBaoziAPI;
