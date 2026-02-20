/**
 * Alert detector — analyzes Baozi data and generates alerts
 *
 * This is the core brain of the agent. Each poll cycle:
 * 1. Fetch positions, claimable, and market data
 * 2. Compare against previous state (odds shifts)
 * 3. Generate alerts for any triggers that fire
 * 4. Deduplicate against already-sent alerts
 */

import { BaoziDataProvider } from './baozi-client.js';
import { StateStore } from './state-store.js';
import {
  AgentConfig,
  Alert,
  MarketResolvedAlert,
  UnclaimedWinningsAlert,
  ClosingSoonAlert,
  OddsShiftAlert,
  NewMarketAlert,
  Position,
  ClaimableWinning,
  Market,
} from '../types/index.js';

export class AlertDetector {
  private provider: BaoziDataProvider;
  private state: StateStore;
  private config: AgentConfig;

  constructor(provider: BaoziDataProvider, state: StateStore, config: AgentConfig) {
    this.provider = provider;
    this.state = state;
    this.config = config;
  }

  /**
   * Run a full detection cycle for all wallets.
   * Returns all new alerts that should be sent.
   */
  async detectAlerts(): Promise<Alert[]> {
    const allAlerts: Alert[] = [];

    for (const wallet of this.config.wallets) {
      const walletAlerts = await this.detectForWallet(wallet);
      allAlerts.push(...walletAlerts);
    }

    // New market alerts (wallet-independent)
    if (this.config.alerts.newMarkets) {
      const newMarketAlerts = await this.detectNewMarkets();
      allAlerts.push(...newMarketAlerts);
    }

    return allAlerts;
  }

  /**
   * Detect alerts for a single wallet
   */
  async detectForWallet(wallet: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const now = new Date().toISOString();

    // Fetch current data
    const [positions, claimable] = await Promise.all([
      this.provider.getPositions(wallet),
      this.provider.getClaimable(wallet),
    ]);

    // 1. Unclaimed winnings alert
    if (this.config.alerts.claimable && claimable.length > 0) {
      const unclaimedAlert = this.buildUnclaimedAlert(wallet, claimable, now);
      if (unclaimedAlert && !this.isDuplicate(unclaimedAlert)) {
        alerts.push(unclaimedAlert);
      }
    }

    // 2. Market resolved alerts
    if (this.config.alerts.claimable) {
      const resolvedAlerts = await this.detectResolved(wallet, positions, now);
      alerts.push(...resolvedAlerts.filter(a => !this.isDuplicate(a)));
    }

    // 3. Closing soon alerts
    if (this.config.alerts.closingSoon) {
      const closingAlerts = this.detectClosingSoon(wallet, positions, now);
      alerts.push(...closingAlerts.filter(a => !this.isDuplicate(a)));
    }

    // 4. Odds shift alerts
    if (this.config.alerts.oddsShift) {
      const oddsAlerts = await this.detectOddsShifts(wallet, positions, now);
      alerts.push(...oddsAlerts.filter(a => !this.isDuplicate(a)));
    }

    // Mark all new alerts as sent
    for (const alert of alerts) {
      this.state.markAlertSent(this.alertKey(alert));
    }

    return alerts;
  }

  /**
   * Build unclaimed winnings alert
   */
  private buildUnclaimedAlert(
    wallet: string,
    claimable: ClaimableWinning[],
    now: string
  ): UnclaimedWinningsAlert | null {
    const totalAmount = claimable.reduce((sum, c) => sum + c.amount, 0);
    if (totalAmount <= 0) return null;

    return {
      type: 'unclaimed_winnings',
      wallet,
      timestamp: now,
      totalAmount,
      marketCount: claimable.length,
      markets: claimable.map(c => ({
        marketId: c.marketId,
        question: c.marketQuestion,
        amount: c.amount,
      })),
      message: `You have ${totalAmount.toFixed(2)} SOL unclaimed across ${claimable.length} market${claimable.length > 1 ? 's' : ''}. Claim at baozi.bet/my-bets`,
    };
  }

  /**
   * Detect markets that resolved where user had a position
   */
  private async detectResolved(
    wallet: string,
    positions: Position[],
    now: string
  ): Promise<MarketResolvedAlert[]> {
    const alerts: MarketResolvedAlert[] = [];

    const resolvedPositions = positions.filter(p => p.marketStatus === 'resolved');

    for (const pos of resolvedPositions) {
      try {
        const resolution = await this.provider.getResolutionStatus(pos.marketId);
        if (!resolution.resolved) continue;

        const won = resolution.winningOutcomeIndex === pos.outcomeIndex;
        const alert: MarketResolvedAlert = {
          type: 'market_resolved',
          wallet,
          timestamp: now,
          marketId: pos.marketId,
          marketQuestion: pos.marketQuestion,
          userOutcome: pos.outcomeLabel,
          winningOutcome: resolution.winningOutcomeLabel || 'Unknown',
          won,
          message: won
            ? `Market "${pos.marketQuestion}" resolved ${resolution.winningOutcomeLabel}. You bet ${pos.outcomeLabel}. Claim your winnings at baozi.bet/my-bets`
            : `Market "${pos.marketQuestion}" resolved ${resolution.winningOutcomeLabel}. You bet ${pos.outcomeLabel}.`,
        };

        alerts.push(alert);
      } catch {
        // Skip markets we can't fetch resolution for
      }
    }

    return alerts;
  }

  /**
   * Detect markets closing soon where user has a position
   */
  detectClosingSoon(
    wallet: string,
    positions: Position[],
    now: string
  ): ClosingSoonAlert[] {
    const alerts: ClosingSoonAlert[] = [];
    const nowMs = new Date(now).getTime();
    const thresholdMs = this.config.alerts.closingSoonHours * 60 * 60 * 1000;

    for (const pos of positions) {
      if (pos.marketStatus !== 'active') continue;

      const closingMs = new Date(pos.closingTime).getTime();
      const timeUntilClose = closingMs - nowMs;

      if (timeUntilClose > 0 && timeUntilClose <= thresholdMs) {
        const hoursRemaining = Math.round((timeUntilClose / (60 * 60 * 1000)) * 10) / 10;

        alerts.push({
          type: 'closing_soon',
          wallet,
          timestamp: now,
          marketId: pos.marketId,
          marketQuestion: pos.marketQuestion,
          closingTime: pos.closingTime,
          hoursRemaining,
          userOutcome: pos.outcomeLabel,
          userStake: pos.stake,
          currentProbability: pos.currentProbability,
          message: `Market "${pos.marketQuestion}" closes in ${hoursRemaining} hours. Your position: ${pos.stake} SOL on ${pos.outcomeLabel} (${Math.round(pos.currentProbability * 100)}%)`,
        });
      }
    }

    return alerts;
  }

  /**
   * Detect significant odds shifts on markets user is in
   */
  async detectOddsShifts(
    wallet: string,
    positions: Position[],
    now: string
  ): Promise<OddsShiftAlert[]> {
    const alerts: OddsShiftAlert[] = [];
    const threshold = this.config.alerts.oddsShiftThreshold;

    for (const pos of positions) {
      if (pos.marketStatus !== 'active') continue;

      const prevSnapshot = this.state.getOddsSnapshot(pos.marketId);

      // Update snapshot with current data
      try {
        const market = await this.provider.getMarket(pos.marketId);
        const currentProbs: Record<number, number> = {};
        for (const outcome of market.outcomes) {
          currentProbs[outcome.index] = outcome.probability;
        }

        this.state.setOddsSnapshot({
          marketId: pos.marketId,
          probabilities: currentProbs,
          timestamp: now,
        });

        // Compare with previous
        if (prevSnapshot) {
          const prevProb = prevSnapshot.probabilities[pos.outcomeIndex] ?? 0;
          const currProb = currentProbs[pos.outcomeIndex] ?? 0;
          const shiftPct = Math.abs((currProb - prevProb) * 100);

          if (shiftPct >= threshold) {
            alerts.push({
              type: 'odds_shift',
              wallet,
              timestamp: now,
              marketId: pos.marketId,
              marketQuestion: pos.marketQuestion,
              outcomeLabel: pos.outcomeLabel,
              previousProbability: prevProb,
              currentProbability: currProb,
              shiftPercentage: shiftPct,
              userOutcome: pos.outcomeLabel,
              userStake: pos.stake,
              message: `Odds on "${pos.marketQuestion}" shifted from ${Math.round(prevProb * 100)}% to ${Math.round(currProb * 100)}% ${pos.outcomeLabel}. You hold ${pos.stake} SOL on ${pos.outcomeLabel}.`,
            });
          }
        }
      } catch {
        // Skip markets we can't fetch
      }
    }

    return alerts;
  }

  /**
   * Detect new markets matching interest keywords
   */
  async detectNewMarkets(): Promise<NewMarketAlert[]> {
    const alerts: NewMarketAlert[] = [];
    const keywords = this.config.alerts.interestKeywords;
    if (keywords.length === 0) return alerts;

    try {
      const activeMarkets = await this.provider.listActiveMarkets();
      const knownIds = new Set(this.state.getKnownMarketIds());

      const newMarkets = activeMarkets.filter(m => !knownIds.has(m.id));

      for (const market of newMarkets) {
        const matchedKeywords = keywords.filter(kw =>
          market.question.toLowerCase().includes(kw.toLowerCase())
        );

        if (matchedKeywords.length > 0) {
          alerts.push({
            type: 'new_market',
            wallet: '*',
            timestamp: new Date().toISOString(),
            marketId: market.id,
            marketQuestion: market.question,
            matchedKeywords,
            closingTime: market.closingTime,
            totalPool: market.totalPool,
            message: `New market matching your interests: "${market.question}" (keywords: ${matchedKeywords.join(', ')}). Pool: ${market.totalPool} SOL`,
          });
        }
      }

      // Update known market IDs
      this.state.setKnownMarketIds(activeMarkets.map(m => m.id));
    } catch {
      // Skip on failure
    }

    return alerts;
  }

  /**
   * Generate dedup key for an alert
   */
  alertKey(alert: Alert): string {
    switch (alert.type) {
      case 'market_resolved':
        return `resolved:${alert.marketId}:${alert.wallet}`;
      case 'unclaimed_winnings':
        return `unclaimed:${alert.wallet}:${alert.marketCount}:${alert.totalAmount}`;
      case 'closing_soon':
        return `closing:${alert.marketId}:${alert.wallet}`;
      case 'odds_shift':
        // Include rounded shift so re-triggers on further shifts
        return `odds:${alert.marketId}:${alert.wallet}:${Math.round(alert.currentProbability * 100)}`;
      case 'new_market':
        return `new:${alert.marketId}`;
    }
  }

  /**
   * Check if alert was already sent
   */
  private isDuplicate(alert: Alert): boolean {
    return this.state.wasAlertSent(this.alertKey(alert));
  }
}
