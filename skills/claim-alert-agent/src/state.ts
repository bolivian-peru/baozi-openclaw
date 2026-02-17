/**
 * State Manager — Tracks odds history and alert timestamps
 * Prevents duplicate notifications and enables odds shift detection
 */
import fs from 'fs';
import path from 'path';

interface OddsSnapshot {
  yesPercent: number;
  noPercent: number;
}

interface State {
  odds: Record<string, OddsSnapshot>;
  lastAlerted: Record<string, Record<string, number>>;
  resolved: Record<string, boolean>;
}

const STATE_FILE = path.join(process.cwd(), '.state.json');

export class StateManager {
  private state: State;

  constructor() {
    this.state = this.load();
  }

  private load(): State {
    try {
      if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      }
    } catch (err) {
      console.error('[State] Error loading state:', err);
    }
    return { odds: {}, lastAlerted: {}, resolved: {} };
  }

  private save() {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error('[State] Error saving state:', err);
    }
  }

  getOdds(marketId: string): OddsSnapshot | null {
    return this.state.odds[marketId] || null;
  }

  setOdds(marketId: string, odds: OddsSnapshot) {
    this.state.odds[marketId] = odds;
    this.save();
  }

  getLastAlerted(key: string, alertType: string): number {
    return this.state.lastAlerted[key]?.[alertType] || 0;
  }

  setLastAlerted(key: string, alertType: string, timestamp: number) {
    if (!this.state.lastAlerted[key]) this.state.lastAlerted[key] = {};
    this.state.lastAlerted[key][alertType] = timestamp;
    this.save();
  }

  getMarketResolved(marketId: string): boolean {
    return this.state.resolved[marketId] || false;
  }

  setMarketResolved(marketId: string, resolved: boolean) {
    this.state.resolved[marketId] = resolved;
    this.save();
  }
}
