const axios = require('axios');
const MockBaoziAPI = require('./mockApi');
const winston = require('winston');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/baozi-monitor.log' })
  ]
});

class BaoziMonitor {
  constructor(config) {
    this.baseUrl = config.mock ? null : "https://api.baozi.bet";
    this.mockApi = config.mock ? new MockBaoziAPI() : null;
    this.config = config;
    this.watchedWallets = config.wallets || [];
    this.pollInterval = (config.pollIntervalMinutes || 15) * 60 * 1000;
    this.previousState = new Map();
  }

  // Get positions for wallet
  async getPositions(wallet) {
    if (this.mockApi) return this.mockApi.getPositions(wallet);
    try {
      const response = await axios.get(`${this.baseUrl}/v1/positions/${wallet}`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching positions for ${wallet}:`, error.message);
      return null;
    }
  }

  // Get claimable winnings
  async getClaimable(wallet) {
    if (this.mockApi) return this.mockApi.getClaimable(wallet);
    try {
      const response = await axios.get(`${this.baseUrl}/v1/claimable/${wallet}`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching claimable for ${wallet}:`, error.message);
      return null;
    }
  }

  // Check if market resolved
  async getResolutionStatus(marketId) {
    if (this.mockApi) return this.mockApi.getResolutionStatus(marketId);
    try {
      const response = await axios.get(`${this.baseUrl}/v1/markets/${marketId}/resolution`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching resolution for ${marketId}:`, error.message);
      return null;
    }
  }

  // Monitor all wallets
  async monitor() {
    logger.info('Starting monitoring cycle...');
    
    for (const wallet of this.watchedWallets) {
      const alerts = [];
      
      // Check positions
      const positions = await this.getPositions(wallet);
      if (positions) {
        for (const position of positions) {
          // Check if market resolved
          const resolution = await this.getResolutionStatus(position.marketId);
          if (resolution && resolution.resolved && !resolution.claimed) {
            alerts.push({
              type: 'MARKET_RESOLVED',
              wallet,
              marketId: position.marketId,
              marketName: position.marketName,
              outcome: resolution.outcome,
              userBet: position.outcome,
              winnings: position.potentialWinnings,
              message: `Market '${position.marketName}' resolved ${resolution.outcome.toUpperCase()}. You bet ${position.outcome.toUpperCase()}. Claim ${position.potentialWinnings} SOL at baozi.bet/my-bets`
            });
          }

          // Check odds shift
          if (this.config.alerts?.oddsShift && position.odds) {
            const prevOdds = this.previousState.get(`${wallet}-${position.marketId}`);
            if (prevOdds) {
              const shift = Math.abs(position.odds - prevOdds);
              const threshold = this.config.alerts?.oddsShiftThreshold || 15;
              if (shift >= threshold) {
                alerts.push({
                  type: 'ODDS_SHIFT',
                  wallet,
                  marketId: position.marketId,
                  marketName: position.marketName,
                  oldOdds: prevOdds,
                  newOdds: position.odds,
                  userPosition: position.outcome,
                  message: `Odds on '${position.marketName}' shifted from ${prevOdds}% to ${position.odds}%. You hold ${position.staked} SOL on ${position.outcome}.`
                });
              }
            }
            this.previousState.set(`${wallet}-${position.marketId}`, position.odds);
          }

          // Check market closing soon
          if (this.config.alerts?.closingSoon && position.closesAt) {
            const closesAt = new Date(position.closesAt);
            const now = new Date();
            const hoursUntilClose = (closesAt - now) / (1000 * 60 * 60);
            const alertHours = this.config.alerts?.closingSoonHours || 6;
            
            if (hoursUntilClose > 0 && hoursUntilClose <= alertHours) {
              const alerted = this.previousState.get(`${wallet}-${position.marketId}-closing`);
              if (!alerted) {
                alerts.push({
                  type: 'CLOSING_SOON',
                  wallet,
                  marketId: position.marketId,
                  marketName: position.marketName,
                  hoursRemaining: Math.floor(hoursUntilClose),
                  userPosition: position.outcome,
                  staked: position.staked,
                  message: `Market '${position.marketName}' closes in ${Math.floor(hoursUntilClose)} hours. Your position: ${position.staked} SOL on ${position.outcome} (${position.odds}%)`
                });
                this.previousState.set(`${wallet}-${position.marketId}-closing`, true);
              }
            }
          }
        }
      }

      // Check claimable winnings
      if (this.config.alerts?.claimable) {
        const claimable = await this.getClaimable(wallet);
        if (claimable && claimable.total > 0) {
          const prevClaimable = this.previousState.get(`${wallet}-claimable`) || 0;
          if (claimable.total !== prevClaimable) {
            alerts.push({
              type: 'UNCLAIMED_WINNINGS',
              wallet,
              totalUnclaimed: claimable.total,
              marketsCount: claimable.markets?.length || 0,
              message: `You have ${claimable.total} SOL unclaimed across ${claimable.markets?.length || 0} markets. Claim at baozi.bet/my-bets`
            });
            this.previousState.set(`${wallet}-claimable`, claimable.total);
          }
        }
      }

      // Return alerts for this wallet
      if (alerts.length > 0) {
        logger.info(`Generated ${alerts.length} alerts for wallet ${wallet}`);
        return alerts;
      }
    }
    
    return [];
  }
}

module.exports = BaoziMonitor;
