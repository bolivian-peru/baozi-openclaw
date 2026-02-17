/**
 * Monitor — Core polling loop for Baozi wallet monitoring
 */
import cron from 'node-cron';
import { BaoziClient } from './baozi';
import { Notifier } from './notifier';
import { StateManager } from './state';
import config from './config';

export class Monitor {
  private client: BaoziClient;
  private notifier: Notifier;
  private state: StateManager;
  private isRunning: boolean;

  constructor(client?: BaoziClient, notifier?: Notifier, state?: StateManager) {
    this.client = client || new BaoziClient(config.solanaRpcUrl);
    this.notifier = notifier || new Notifier(config.alertWebhookUrl);
    this.state = state || new StateManager();
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Monitor] Starting with ${config.walletAddresses.length} wallets, poll every ${config.pollIntervalMinutes}m`);
    await this.poll();
    cron.schedule(`*/${config.pollIntervalMinutes} * * * *`, () => this.poll());
  }

  async poll() {
    console.log(`[Monitor] Polling at ${new Date().toISOString()}`);
    for (const wallet of config.walletAddresses) {
      try {
        await this.checkWallet(wallet);
      } catch (err) {
        console.error(`[Monitor] Error checking ${wallet}:`, err);
      }
    }
  }

  private async checkWallet(wallet: string) {
    const now = Date.now();

    // 1. Check claimable winnings
    const claimSummary = await this.client.getClaimable(wallet);
    if (claimSummary.totalClaimableSol > config.winningsThreshold) {
      const lastAlerted = this.state.getLastAlerted(wallet, 'claimable');
      if (now - lastAlerted > 60 * 60 * 1000) {
        const lines = claimSummary.claimablePositions
          .map(p => `• "${p.marketQuestion}" — ${p.estimatedPayoutSol} SOL (${p.claimType})`)
          .join('\n');

        await this.notifier.send({
          type: 'alert',
          message: `💰 You have ${claimSummary.totalClaimableSol} SOL to claim!\n\n${lines}\n\nClaim at baozi.bet/my-bets`,
          timestamp: new Date(),
          walletAddress: wallet,
        });
        this.state.setLastAlerted(wallet, 'claimable', now);
      }
    }

    // 2. Check active positions for market events
    const allPositions = await this.client.getPositions(wallet);
    const activePositions = allPositions.filter(p => !p.claimed);
    const marketIds = [...new Set(activePositions.map(p => p.marketId))];

    for (const marketId of marketIds) {
      await this.checkMarket(marketId, wallet);
    }
  }

  private async checkMarket(marketId: string, wallet: string) {
    const now = Date.now();

    // Check resolution
    const resolution = await this.client.getResolutionStatus(marketId);
    const wasResolved = this.state.getMarketResolved(marketId);
    if (resolution.isResolved && !wasResolved) {
      await this.notifier.send({
        type: 'alert',
        message: `🏁 Market resolved! Outcome: ${resolution.winningOutcome || 'Invalid'}\nCheck your winnings at baozi.bet/my-bets`,
        timestamp: new Date(),
        marketId,
        walletAddress: wallet,
      });
      this.state.setMarketResolved(marketId, true);
    }

    // Check closing soon
    const closingTime = await this.client.getMarketClosingTime(marketId);
    if (closingTime) {
      const minutesLeft = (closingTime.getTime() - now) / (60 * 1000);
      if (minutesLeft > 0 && minutesLeft <= config.marketCloseThreshold) {
        const lastAlerted = this.state.getLastAlerted(`${wallet}:${marketId}`, 'closing');
        if (now - lastAlerted > 60 * 60 * 1000) {
          await this.notifier.send({
            type: 'warning',
            message: `⏰ Market closing in ${Math.round(minutesLeft)} minutes!`,
            timestamp: new Date(),
            marketId,
            walletAddress: wallet,
          });
          this.state.setLastAlerted(`${wallet}:${marketId}`, 'closing', now);
        }
      }
    }

    // Check odds shift
    const odds = await this.client.getMarketOdds(marketId);
    if (odds) {
      const prevOdds = this.state.getOdds(marketId);
      if (prevOdds) {
        const yesShift = Math.abs(odds.yesPercent - prevOdds.yesPercent);
        if (yesShift >= config.oddsShiftThreshold) {
          const lastAlerted = this.state.getLastAlerted(`${wallet}:${marketId}`, 'odds');
          if (now - lastAlerted > 30 * 60 * 1000) {
            const direction = odds.yesPercent > prevOdds.yesPercent ? '📈' : '📉';
            await this.notifier.send({
              type: 'info',
              message: `${direction} Odds shifted: Yes ${prevOdds.yesPercent.toFixed(1)}% → ${odds.yesPercent.toFixed(1)}% (${yesShift.toFixed(1)}% change)`,
              timestamp: new Date(),
              marketId,
              walletAddress: wallet,
            });
            this.state.setLastAlerted(`${wallet}:${marketId}`, 'odds', now);
          }
        }
      }
      this.state.setOdds(marketId, { yesPercent: odds.yesPercent, noPercent: odds.noPercent });
    }
  }
}
