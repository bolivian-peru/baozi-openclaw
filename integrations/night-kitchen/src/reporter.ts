import { Market, MarketSummary, BaoziClient } from './baozi';

// Chinese proverbs with English translations
const PROVERBS = {
  patience: [
    { zh: '心急吃不了热豆腐', en: "you can't rush hot tofu — patience." },
    { zh: '慢工出细活', en: 'slow work, fine craft — quality takes time.' },
    { zh: '好饭不怕晚', en: "good food doesn't fear being late — worth waiting." },
    { zh: '火候到了，自然熟', en: 'right heat, naturally cooked — timing.' }
  ],
  risk: [
    { zh: '贪多嚼不烂', en: "bite off too much, can't chew — risk warning." },
    { zh: '知足常乐', en: 'contentment brings happiness — take profits.' },
    { zh: '见好就收', en: 'quit while ahead — smart exits.' }
  ],
  fate: [
    { zh: '谋事在人，成事在天', en: 'you make your bet, the market decides.' },
    { zh: '小小一笼，大大缘分', en: 'small steamer, big fate.' }
  ],
  fundamentals: [
    { zh: '民以食为天', en: 'food is heaven for people — fundamentals matter.' }
  ],
  warmth: [
    { zh: '人间烟火气，最抚凡人心', en: 'the warmth of everyday cooking soothes ordinary hearts.' }
  ]
};

function selectProverb(context: 'patience' | 'risk' | 'fate' | 'fundamentals' | 'warmth'): { zh: string; en: string } {
  const pool = PROVERBS[context];
  return pool[Math.floor(Math.random() * pool.length)];
}

function selectProverbForMarket(market: Market): { zh: string; en: string } {
  // Select based on market characteristics
  const closingTime = new Date(market.closingTime).getTime();
  const hoursUntilClose = (closingTime - Date.now()) / (1000 * 60 * 60);
  
  // Long-dated markets -> patience
  if (hoursUntilClose > 24 * 7) {
    return selectProverb('patience');
  }
  
  // High stakes (large pool) -> risk warning
  if (market.totalPoolSol > 50) {
    return selectProverb('risk');
  }
  
  // Close race (near 50/50) -> fate
  if (market.yesPercent > 40 && market.yesPercent < 60) {
    return selectProverb('fate');
  }
  
  // Default to warmth
  return selectProverb('warmth');
}

export class ReportGenerator {
  private client: BaoziClient;
  
  constructor() {
    this.client = new BaoziClient();
  }
  
  async generateDailyReport(): Promise<string> {
    const summary = await this.client.getMarketSummary();
    
    // Header
    let report = this.generateHeader();
    
    // Summary stats
    report += this.generateSummaryStats(summary);
    
    // Featured markets
    if (summary.topByPool.length > 0) {
      report += '\n🥟 **hot in the steamer**\n\n';
      for (const market of summary.topByPool.slice(0, 3)) {
        report += await this.formatMarket(market);
      }
    }
    
    // Closing soon
    if (summary.closingSoon.length > 0) {
      report += '\n⏰ **closing soon**\n\n';
      for (const market of summary.closingSoon.slice(0, 2)) {
        report += await this.formatMarketBrief(market);
      }
    }
    
    // Footer
    report += this.generateFooter(summary);
    
    return report;
  }
  
  private generateHeader(): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    return `夜厨房 — night kitchen report
${dateStr}

a warm kitchen, serious markets.

───────────────

`;
  }
  
  private generateSummaryStats(summary: MarketSummary): string {
    const proverb = selectProverb('warmth');
    
    return `${summary.active} markets cooking. ${summary.closed} resolved.
total pool: ${summary.totalPoolSol.toFixed(1)} SOL

${proverb.zh}
${proverb.en}

`;
  }
  
  private async formatMarket(market: Market): Promise<string> {
    const proverb = selectProverbForMarket(market);
    const timeLeft = this.client.timeRemaining(market.closingTime);
    
    let formatted = `🥟 "${market.question.slice(0, 80)}${market.question.length > 80 ? '...' : ''}"\n`;
    
    // Boolean market - use yesPercent/noPercent directly
    formatted += `   YES: ${market.yesPercent}% | NO: ${market.noPercent}%\n`;
    formatted += `   pool: ${market.totalPoolSol.toFixed(1)} SOL | ${timeLeft} left\n`;
    formatted += `\n   ${proverb.zh}\n   ${proverb.en}\n\n`;
    
    return formatted;
  }
  
  private async formatMarketBrief(market: Market): Promise<string> {
    const timeLeft = this.client.timeRemaining(market.closingTime);
    
    let formatted = `⏰ "${market.question.slice(0, 60)}..."\n`;
    formatted += `   YES: ${market.yesPercent}% | NO: ${market.noPercent}%\n`;
    formatted += `   closing in ${timeLeft}\n\n`;
    
    return formatted;
  }
  
  private generateFooter(summary: MarketSummary): string {
    const proverb = selectProverb('fate');
    
    return `───────────────

this is still gambling. play small, play soft.

${proverb.zh}
${proverb.en}

baozi.bet | 小小一笼，大大缘分
`;
  }
  
  async generateFeaturedReport(marketId: number): Promise<string> {
    const market = await this.client.getMarketById(marketId);
    if (!market) {
      return 'market not found — 蒸笼空了 (steamer is empty)';
    }
    
    const proverb = selectProverbForMarket(market);
    const timeLeft = this.client.timeRemaining(market.closingTime);
    
    let report = `夜厨房 — featured market

🥟 "${market.question}"

**odds:**
   YES: ${market.yesPercent}% | NO: ${market.noPercent}%

**pool:** ${market.totalPoolSol.toFixed(1)} SOL
**closing:** ${timeLeft}

${proverb.zh}
"${proverb.en}"

───────────────

https://baozi.bet/market/${market.publicKey}

好饭不怕晚 — good resolution doesn't fear being late.
`;
    
    return report;
  }
}