import { Market, RaceMarket, BaoziAPI } from './baozi-api';

/**
 * Generates market analysis posts and comments.
 * Pure logic — no LLM needed, just data-driven takes.
 */
export class Analyst {
  private api: BaoziAPI;

  constructor(api: BaoziAPI) {
    this.api = api;
  }

  /**
   * Generate a morning roundup post for AgentBook.
   */
  async generateRoundup(): Promise<{ content: string; marketPda?: string }> {
    const hot = await this.api.getHotMarkets(5);
    const closing = await this.api.getClosingSoon(24);

    if (hot.length === 0) {
      return { content: '📊 Market Roundup: No active markets right now. Stay tuned for new opportunities on Baozi!' };
    }

    let post = '📊 Market Roundup\n\n';

    // Top markets by volume
    post += '🔥 Hot Markets:\n';
    for (const m of hot.slice(0, 3)) {
      const odds = m.yesPercent > m.noPercent ? `Yes ${m.yesPercent}%` : `No ${m.noPercent}%`;
      post += `• "${m.question}" — ${m.totalPoolSol.toFixed(2)} SOL pool, leading: ${odds}\n`;
    }

    // Closing soon
    if (closing.length > 0) {
      post += '\n⏰ Closing Soon:\n';
      for (const m of closing.slice(0, 2)) {
        const hoursLeft = Math.max(0, (new Date(m.closingTime).getTime() - Date.now()) / (1000 * 60 * 60));
        post += `• "${m.question}" — ${hoursLeft.toFixed(1)}h left, ${m.yesPercent}% Yes\n`;
      }
    }

    post += '\nAll markets live at baozi.bet 🥟';

    return { content: post.substring(0, 2000) };
  }

  /**
   * Generate an odds analysis post for AgentBook.
   */
  async generateOddsAnalysis(): Promise<{ content: string; marketPda?: string } | null> {
    const active = await this.api.getActiveMarkets();
    if (active.length === 0) return null;

    // Find markets with interesting odds (close to 50/50 = contentious)
    const contentious = active
      .filter(m => m.totalPoolSol > 0)
      .sort((a, b) => Math.abs(50 - a.yesPercent) - Math.abs(50 - b.yesPercent));

    if (contentious.length === 0) return null;

    const target = contentious[0];
    const spread = Math.abs(target.yesPercent - target.noPercent);

    let analysis: string;
    if (spread < 10) {
      analysis = `🎯 Tight Race Alert!\n\n"${target.question}"\n\nYes: ${target.yesPercent}% | No: ${target.noPercent}%\nSpread: just ${spread.toFixed(1)}pp — this market is razor-close.\nPool: ${target.totalPoolSol.toFixed(2)} SOL\n\nSmall bets could swing the odds significantly at this pool size. High-conviction traders could find edge here.\n\nbaozi.bet/market/${target.publicKey}`;
    } else if (target.yesPercent > 75) {
      analysis = `📈 Strong Consensus: "${target.question}"\n\nMarket heavily favoring Yes at ${target.yesPercent}%.\nPool: ${target.totalPoolSol.toFixed(2)} SOL\n\nContrarians take note — if you think the crowd is wrong, No at ${target.noPercent}% offers ${(100 / target.noPercent).toFixed(1)}x implied return.\n\nbaozi.bet/market/${target.publicKey}`;
    } else if (target.noPercent > 75) {
      analysis = `📉 Strong Consensus: "${target.question}"\n\nMarket heavily favoring No at ${target.noPercent}%.\nPool: ${target.totalPoolSol.toFixed(2)} SOL\n\nBelievers take note — Yes at ${target.yesPercent}% offers ${(100 / target.yesPercent).toFixed(1)}x implied return if you think the market is underpricing this.\n\nbaozi.bet/market/${target.publicKey}`;
    } else {
      analysis = `📊 Market Spotlight: "${target.question}"\n\nYes: ${target.yesPercent}% | No: ${target.noPercent}%\nPool: ${target.totalPoolSol.toFixed(2)} SOL\n\nA moderately split market — the crowd sees this as likely but not certain. Worth watching for odds movement as the closing date approaches.\n\nbaozi.bet/market/${target.publicKey}`;
    }

    return { content: analysis.substring(0, 2000), marketPda: target.publicKey };
  }

  /**
   * Generate a closing-soon alert.
   */
  async generateClosingAlert(): Promise<{ content: string; marketPda?: string } | null> {
    const closing = await this.api.getClosingSoon(12);
    if (closing.length === 0) return null;

    const target = closing[0];
    const hoursLeft = Math.max(0, (new Date(target.closingTime).getTime() - Date.now()) / (1000 * 60 * 60));

    const content = `⏳ Last Call!\n\n"${target.question}"\n\nClosing in ${hoursLeft.toFixed(1)} hours!\nCurrent odds: Yes ${target.yesPercent}% | No ${target.noPercent}%\nPool: ${target.totalPoolSol.toFixed(2)} SOL\n\nFinal chance to take a position before this market locks.\n\nbaozi.bet/market/${target.publicKey}`;

    return { content: content.substring(0, 2000), marketPda: target.publicKey };
  }

  /**
   * Generate a comment for a specific market.
   */
  generateMarketComment(market: Market): string {
    const hoursLeft = Math.max(0, (new Date(market.closingTime).getTime() - Date.now()) / (1000 * 60 * 60));
    const daysLeft = hoursLeft / 24;

    let comment: string;

    if (market.totalPoolSol === 0) {
      comment = `Fresh market with no positions yet. ${market.yesPercent === 50 ? 'Even odds — first mover sets the tone.' : `Starting at ${market.yesPercent}% Yes.`} ${daysLeft.toFixed(0)}d until close.`;
    } else if (market.yesPercent > 80 || market.noPercent > 80) {
      const dominant = market.yesPercent > 80 ? 'Yes' : 'No';
      const pct = Math.max(market.yesPercent, market.noPercent);
      comment = `Strong ${dominant} consensus at ${pct}%. Pool: ${market.totalPoolSol.toFixed(2)} SOL. ${daysLeft > 7 ? 'Still plenty of time for odds to shift.' : 'Getting close to resolution.'} Contrarian opportunity?`;
    } else if (Math.abs(market.yesPercent - 50) < 10) {
      comment = `Tight split at ${market.yesPercent}/${market.noPercent}. Pool: ${market.totalPoolSol.toFixed(2)} SOL. The crowd is genuinely uncertain. ${hoursLeft < 48 ? 'Closing soon — last chance to pick a side.' : 'Watch for momentum shifts.'}`;
    } else {
      const leading = market.yesPercent > market.noPercent ? 'Yes' : 'No';
      const leadPct = Math.max(market.yesPercent, market.noPercent);
      comment = `${leading} leading at ${leadPct}%. Pool: ${market.totalPoolSol.toFixed(2)} SOL. ${daysLeft.toFixed(0)} days left. ${market.totalPoolSol < 0.1 ? 'Low liquidity — small bets move odds.' : 'Decent liquidity building.'}`;
    }

    return comment.substring(0, 500);
  }
}
