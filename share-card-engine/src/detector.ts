import fetch from 'node-fetch';

export interface Market {
  pda: string;
  question: string;
  status: 'active' | 'closed' | 'resolved';
  closingTime: number; // unix timestamp
  poolSize: number; // in SOL
  yesOdds?: number; // 0-100
  noOdds?: number; // 0-100
  layer: 'official' | 'labs';
}

export type EventType = 'NEW_MARKET' | 'LARGE_BET' | 'CLOSING_SOON' | 'ODDS_SHIFT' | 'JUST_RESOLVED';

export interface MarketEvent {
  type: EventType;
  market: Market;
  context: string;
  proverb: string;
}

// Kitchen metaphors as requested in the bounty
const PROVERBS = {
  NEW_MARKET: "千里之行始于足下 — a journey begins with a single step",
  LARGE_BET: "大鱼吃小鱼 — big fish eat little fish",
  CLOSING_SOON: "机不可失 — opportunity knocks but once",
  ODDS_SHIFT: "风向变了 — the wind has changed direction",
  JUST_RESOLVED: "水落石出 — when the water recedes the stones appear"
};

export class MarketDetector {
  private state = new Map<string, Market>();

  // Compare previous state to new state to detect events
  public processMarkets(newMarkets: Market[]): MarketEvent[] {
    const events: MarketEvent[] = [];
    const now = Date.now() / 1000;

    for (const market of newMarkets) {
      const prev = this.state.get(market.pda);

      // 1. Detect New Markets
      if (!prev) {
        // Only trigger if it was created recently. We'll use lack of state as proxy
        // for "newly discovered" in this engine loop.
        if (market.status === 'active') {
          events.push({
            type: 'NEW_MARKET',
            market,
            context: `fresh out of the steamer 🥟\n\n"${market.question}"\n\nPool: ${market.poolSize} SOL`,
            proverb: PROVERBS.NEW_MARKET
          });
        }
      } else {
        // 2. Detect Just Resolved
        if (prev.status === 'active' && market.status !== 'active') {
          events.push({
            type: 'JUST_RESOLVED',
            market,
            context: `the kitchen is closed 🥟\n\n"${market.question}" has been locked.`,
            proverb: PROVERBS.JUST_RESOLVED
          });
        }

        // 3. Detect Large Bet (> 5 SOL jump in pool between polls)
        if (market.poolSize - prev.poolSize >= 5) {
          events.push({
            type: 'LARGE_BET',
            market,
            context: `whales are hungry 🥟\n\nA massive ${market.poolSize - prev.poolSize} SOL bet just landed on:\n"${market.question}"`,
            proverb: PROVERBS.LARGE_BET
          });
        }

        // 4. Detect Odds Shift (> 10% swing)
        if (prev.yesOdds !== undefined && market.yesOdds !== undefined) {
          if (Math.abs(market.yesOdds - prev.yesOdds) >= 10) {
            events.push({
              type: 'ODDS_SHIFT',
              market,
              context: `the flavor is changing 🥟\n\nMassive odds swing on:\n"${market.question}"\nYES: ${market.yesOdds}% | NO: ${100 - market.yesOdds}%`,
              proverb: PROVERBS.ODDS_SHIFT
            });
          }
        }

        // 5. Detect Closing Soon (< 24 hours, only alert once)
        const ONE_DAY = 24 * 60 * 60;
        if (prev.closingTime - now > ONE_DAY && market.closingTime - now <= ONE_DAY && market.status === 'active') {
          events.push({
            type: 'CLOSING_SOON',
            market,
            context: `last call for orders 🥟\n\nClosing in 24 hours:\n"${market.question}"`,
            proverb: PROVERBS.CLOSING_SOON
          });
        }
      }

      // Update state for next cycle
      this.state.set(market.pda, market);
    }

    return events;
  }
}
