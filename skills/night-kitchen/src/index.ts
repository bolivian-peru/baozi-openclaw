import { BaoziAPI, Market, MarketWithOdds } from './baozi-api';
import { ProverbSelector, ProverbContext } from './proverbs';

/**
 * Night Kitchen — bilingual market report generator
 */

export interface ReportData {
  date: string;
  activeMarkets: MarketWithOdds[];
  resolvedMarkets: MarketWithOdds[];
  totalPoolSol: number;
  proverbs: [import('./proverbs').Proverb, import('./proverbs').Proverb];
}

function formatMarket(m: Market): MarketWithOdds {
  const pool = m.totalPoolSol;
  return {
    ...m,
    oddsLabel: pool > 0
      ? `yes: ${m.yesPercent}% | no: ${m.noPercent}%`
      : 'no bets yet',
    poolLabel: pool > 0 ? `${pool.toFixed(1)} SOL` : 'empty',
    timeLabel: formatTimeRemaining(m.closingTime),
  };
}

function formatTimeRemaining(closingTime: string): string {
  const now = Date.now();
  const end = new Date(closingTime).getTime();
  const diffMs = end - now;
  if (diffMs <= 0) return 'closed';
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function computeProverbContext(markets: MarketWithOdds[]): Partial<ProverbContext> {
  if (markets.length === 0) return {};
  const maxPool = Math.max(...markets.map(m => m.totalPoolSol));
  const minTime = Math.min(...markets.map(m => new Date(m.closingTime).getTime() - Date.now()));
  const closestOdds = markets.reduce((closest, m) => {
    const diff = Math.abs(m.yesPercent - 50);
    return diff < closest ? diff : closest;
  }, Infinity);

  return {
    highStakes: maxPool > 10 || minTime < 86400000,
    longTerm: minTime > 7 * 86400000,
    closeRace: closestOdds < 5,
    community: markets.length >= 5,
  };
}

export class NightKitchen {
  private api: BaoziAPI;
  private proverbSelector: ProverbSelector;

  constructor(apiUrl?: string) {
    this.api = new BaoziAPI(apiUrl);
    this.proverbSelector = new ProverbSelector();
  }

  async fetchReportData(): Promise<ReportData> {
    const [active, resolved] = await Promise.all([
      this.api.getActiveMarkets(),
      this.api.getRecentlyResolved(3),
    ]);

    const activeFormatted = active.map(formatMarket).slice(0, 10);
    const resolvedFormatted = resolved.map(formatMarket);

    const ctx = computeProverbContext(activeFormatted);
    const proverbs = this.proverbSelector.selectPair(ctx);
    const totalPoolSol = active.reduce((sum, m) => sum + m.totalPoolSol, 0);

    return {
      date: new Date().toISOString().split('T')[0],
      activeMarkets: activeFormatted,
      resolvedMarkets: resolvedFormatted,
      totalPoolSol,
      proverbs,
    };
  }

  generateReport(data: ReportData): string {
    const lines: string[] = [];
    const dateStr = new Date(data.date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    // per-market proverb selection
    const marketProverbs = data.activeMarkets.map(m =>
      this.proverbSelector.select(this.marketContext(m))
    );
    const footerProverb = data.proverbs[1];

    // header
    lines.push('夜厨房 — night kitchen report');
    lines.push(dateStr.toLowerCase());
    lines.push('');

    // resolved section
    if (data.resolvedMarkets.length > 0) {
      lines.push(`${data.resolvedMarkets.length} market${data.resolvedMarkets.length > 1 ? 's' : ''} resolved today. grandma checked the evidence.`);
      lines.push('');
      for (const m of data.resolvedMarkets) {
        lines.push(`🥟 "${m.question}"`);
        lines.push(`   ${m.oddsLabel} → resolved: ${m.outcome || '?'}`);
        lines.push('');
      }
    }

    // active markets
    lines.push(`${data.activeMarkets.length} market${data.activeMarkets.length > 1 ? 's' : ''} cooking.`);
    data.activeMarkets.forEach((m, i) => {
      lines.push('');
      lines.push(`🥟 "${m.question}"`);
      lines.push(`   ${m.oddsLabel} | pool: ${m.poolLabel} | closing in ${m.timeLabel}`);
      lines.push('');
      lines.push(`   ${marketProverbs[i].chinese}`);
      lines.push(`   "${marketProverbs[i].english}."`);
    });

    // footer
    lines.push('');
    lines.push('───────────────');
    lines.push('');
    lines.push(`${data.activeMarkets.length} cooking. ${data.resolvedMarkets.length} resolved. total pool: ${data.totalPoolSol.toFixed(1)} SOL`);
    lines.push('');
    lines.push(`${footerProverb.chinese} — ${footerProverb.english}.`);
    lines.push('');
    lines.push('baozi.bet | 小小一笼，大大缘分');

    return lines.join('\n');
  }

  private marketContext(m: MarketWithOdds): Partial<import('./proverbs').ProverbContext> {
    const timeLeft = new Date(m.closingTime).getTime() - Date.now();
    return {
      highStakes: m.totalPoolSol > 10 || timeLeft < 86400000,
      longTerm: timeLeft > 7 * 86400000,
      closeRace: Math.abs(m.yesPercent - 50) < 5,
      community: false,
    };
  }

  /**
   * Generate report from live data (one-shot)
   */
  async generate(): Promise<string> {
    const data = await this.fetchReportData();
    return this.generateReport(data);
  }

  /**
   * Post report to AgentBook
   */
  async postToAgentBook(walletAddress: string): Promise<boolean> {
    const report = await this.generate();
    return this.api.postToAgentBook(report, walletAddress);
  }
}
