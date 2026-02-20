/**
 * Monitor — the main polling loop that ties everything together
 *
 * Runs on a configurable interval:
 * 1. Load state
 * 2. Detect alerts via AlertDetector
 * 3. Send notifications via configured channels
 * 4. Save state
 * 5. Wait and repeat
 */

import { AgentConfig } from '../types/index.js';
import { BaoziDataProvider } from './baozi-client.js';
import { AlertDetector } from './alert-detector.js';
import { StateStore } from './state-store.js';
import { createNotifiers, Notifier } from './notifiers/index.js';

export interface MonitorOptions {
  /** Run once and exit (no loop) */
  once?: boolean;
  /** Override poll interval */
  intervalMs?: number;
  /** State file path */
  statePath?: string;
  /** Dry run — detect but don't send */
  dryRun?: boolean;
  /** Logger function */
  log?: (msg: string) => void;
}

export interface PollResult {
  alertsDetected: number;
  alertsSent: number;
  alertsFailed: number;
  timestamp: string;
}

export class Monitor {
  private config: AgentConfig;
  private provider: BaoziDataProvider;
  private detector: AlertDetector;
  private state: StateStore;
  private notifiers: Notifier[];
  private options: MonitorOptions;
  private running = false;
  private log: (msg: string) => void;

  constructor(
    config: AgentConfig,
    provider: BaoziDataProvider,
    options: MonitorOptions = {}
  ) {
    this.config = config;
    this.provider = provider;
    this.options = options;
    this.log = options.log || console.log;

    const statePath = options.statePath || './data/state.json';
    this.state = new StateStore(statePath);
    this.detector = new AlertDetector(provider, this.state, config);
    this.notifiers = createNotifiers(config.channels);
  }

  /**
   * Run a single poll cycle
   */
  async poll(): Promise<PollResult> {
    const timestamp = new Date().toISOString();
    this.log(`[${timestamp}] Polling ${this.config.wallets.length} wallet(s)...`);

    await this.state.load();

    // Detect alerts
    const alerts = await this.detector.detectAlerts();
    this.log(`  Detected ${alerts.length} alert(s)`);

    let totalSent = 0;
    let totalFailed = 0;

    if (alerts.length > 0 && !this.options.dryRun) {
      // Send via all notification channels
      for (const notifier of this.notifiers) {
        const result = await notifier.sendBatch(alerts);
        this.log(`  [${notifier.name}] Sent: ${result.sent}, Failed: ${result.failed}`);
        totalSent += result.sent;
        totalFailed += result.failed;
      }
    } else if (alerts.length > 0 && this.options.dryRun) {
      this.log('  [dry-run] Alerts detected but not sent:');
      for (const alert of alerts) {
        this.log(`    - [${alert.type}] ${alert.message}`);
      }
      totalSent = alerts.length; // Count as "sent" for dry run
    }

    // Prune old alert records
    const pruned = this.state.pruneOldAlerts();
    if (pruned > 0) {
      this.log(`  Pruned ${pruned} old alert records`);
    }

    this.state.setLastPollTime(timestamp);
    await this.state.save();

    return {
      alertsDetected: alerts.length,
      alertsSent: totalSent,
      alertsFailed: totalFailed,
      timestamp,
    };
  }

  /**
   * Start the monitoring loop
   */
  async start(): Promise<void> {
    this.running = true;
    const intervalMs = this.options.intervalMs || this.config.pollIntervalMinutes * 60 * 1000;

    this.log(`🔔 Baozi Claim & Alert Agent started`);
    this.log(`   Wallets: ${this.config.wallets.length}`);
    this.log(`   Channels: ${this.notifiers.map(n => n.name).join(', ') || 'none'}`);
    this.log(`   Interval: ${Math.round(intervalMs / 60000)}m`);
    this.log(`   Alerts: ${this.enabledAlerts().join(', ')}`);
    this.log('');

    // Initial poll
    await this.poll();

    if (this.options.once) {
      this.running = false;
      return;
    }

    // Loop
    while (this.running) {
      await sleep(intervalMs);
      if (!this.running) break;

      try {
        await this.poll();
      } catch (err) {
        this.log(`[error] Poll failed: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Stop the monitoring loop
   */
  stop(): void {
    this.running = false;
    this.log('Monitor stopped');
  }

  /**
   * Get enabled alert types
   */
  private enabledAlerts(): string[] {
    const alerts: string[] = [];
    if (this.config.alerts.claimable) alerts.push('claimable');
    if (this.config.alerts.closingSoon) alerts.push(`closing-soon (${this.config.alerts.closingSoonHours}h)`);
    if (this.config.alerts.oddsShift) alerts.push(`odds-shift (${this.config.alerts.oddsShiftThreshold}pp)`);
    if (this.config.alerts.newMarkets) alerts.push('new-markets');
    return alerts;
  }

  /** Expose internals for testing */
  getDetector(): AlertDetector { return this.detector; }
  getState(): StateStore { return this.state; }
  getNotifiers(): Notifier[] { return this.notifiers; }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
