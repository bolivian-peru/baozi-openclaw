import { Market, BaoziAPI } from './baozi-api';
import { config } from './config';

/**
 * Golden rule:
 * - OPEN markets (isBettingOpen=true): factual odds reporting only, no predictions.
 * - CLOSED/RESOLVED markets: analysis is allowed.
 */

async function callLLM(prompt: string, maxTokens = 500): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return '';
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err: any) {
    console.error('Gemini call failed:', err.message);
    return '';
  }
}

function hoursUntil(closingTime: string): string {
  const hours = Math.max(0, (new Date(closingTime).getTime() - Date.now()) / 3600000);
  return `${hours.toFixed(1)}h`;
}

function marketFacts(market: Market): string {
  return [
    `"${market.question}"`,
    `YES ${market.yesPercent.toFixed(1)}% | NO ${market.noPercent.toFixed(1)}%`,
    `Pool ${market.totalPoolSol.toFixed(4)} SOL`,
    `Closes in ${hoursUntil(market.closingTime)}`,
  ].join(' • ');
}

export class Analyst {
  private api: BaoziAPI;
  constructor(api: BaoziAPI) { this.api = api; }

  private marketLink(marketPda: string): string {
    const base = `https://baozi.bet/market/${marketPda}`;
    if (!config.affiliateCode) return base;
    return `${base}?${config.affiliateQueryParam}=${encodeURIComponent(config.affiliateCode)}`;
  }

  async generateRoundup(): Promise<{ content: string; marketPda?: string }> {
    const hot = await this.api.getHotMarkets(5);
    const closing = await this.api.getClosingSoon(24);

    if (hot.length === 0) {
      return {
        content: '📊 Open Market Odds Snapshot\n\nNo open markets right now. I will post again when betting reopens.',
      };
    }

    let post = '📊 Open Market Odds Snapshot (factual only)\n\n';

    hot.slice(0, 3).forEach((market, index) => {
      post += `${index + 1}) ${marketFacts(market)}\n`;
      post += `${this.marketLink(market.publicKey)}\n\n`;
    });

    if (closing.length > 0) {
      const soon = closing.slice(0, 2)
        .map(m => `• ${m.question} (${hoursUntil(m.closingTime)})`)
        .join('\n');
      post += `Closing soon:\n${soon}\n\n`;
    }

    post += 'Data only for open markets. No predictions.';

    return { content: post.substring(0, 2000), marketPda: hot[0].publicKey };
  }

  async generateOddsAnalysis(): Promise<{ content: string; marketPda?: string } | null> {
    const active = await this.api.getActiveMarkets();
    if (active.length === 0) return null;

    const withPool = active.filter(m => m.totalPoolSol > 0);
    const target = (withPool.length > 0 ? withPool : active)
      .sort((a, b) => Math.abs(50 - a.yesPercent) - Math.abs(50 - b.yesPercent))[0];

    const spread = Math.abs(target.yesPercent - target.noPercent);

    const content = [
      '📈 Open Market Odds Update (factual only)',
      '',
      `Market: "${target.question}"`,
      `Odds: YES ${target.yesPercent.toFixed(1)}% | NO ${target.noPercent.toFixed(1)}%`,
      `Spread: ${spread.toFixed(1)} percentage points`,
      `Pool: ${target.totalPoolSol.toFixed(4)} SOL`,
      `Time to close: ${hoursUntil(target.closingTime)}`,
      `Status: ${target.status} (betting open: ${target.isBettingOpen ? 'yes' : 'no'})`,
      '',
      this.marketLink(target.publicKey),
      '',
      'No prediction included (open market guardrail).',
    ].join('\n');

    return { content: content.substring(0, 2000), marketPda: target.publicKey };
  }

  async generateClosingAlert(): Promise<{ content: string; marketPda?: string } | null> {
    const closing = await this.api.getClosingSoon(12);
    if (closing.length === 0) return null;

    const target = closing[0];
    const content = [
      '⏳ Closing Soon — Odds Snapshot (factual only)',
      '',
      `Market: "${target.question}"`,
      `Closes in: ${hoursUntil(target.closingTime)}`,
      `Odds: YES ${target.yesPercent.toFixed(1)}% | NO ${target.noPercent.toFixed(1)}%`,
      `Pool: ${target.totalPoolSol.toFixed(4)} SOL`,
      `Betting open: ${target.isBettingOpen ? 'yes' : 'no'}`,
      '',
      this.marketLink(target.publicKey),
    ].join('\n');

    return { content: content.substring(0, 2000), marketPda: target.publicKey };
  }

  async generateResolvedRecap(): Promise<{ content: string; marketPda?: string } | null> {
    const closed = await this.api.getResolvedMarkets(3);
    if (closed.length === 0) return null;

    const rows = closed.map(m => ({
      question: m.question,
      outcome: m.outcome,
      yes: m.yesPercent,
      no: m.noPercent,
      pool: m.totalPoolSol,
      status: m.status,
    }));

    const llm = await callLLM(
      [
        'You are writing a Baozi post about CLOSED/RESOLVED markets only.',
        'You may analyze outcomes and what happened AFTER the close.',
        'Do not mention open-market predictions.',
        'Keep it concise and factual-first.',
        '',
        JSON.stringify(rows),
      ].join('\n'),
      280,
    );

    if (llm) {
      return { content: llm.substring(0, 2000), marketPda: closed[0].publicKey };
    }

    const recap = closed
      .map(m => `• "${m.question}" → outcome: ${m.outcome || 'pending'} | final odds YES ${m.yesPercent.toFixed(1)}% / NO ${m.noPercent.toFixed(1)}% | pool ${m.totalPoolSol.toFixed(3)} SOL`)
      .join('\n');

    return {
      content: `🧾 Closed Market Recap\n\n${recap}`.substring(0, 2000),
      marketPda: closed[0].publicKey,
    };
  }

  async generateMarketComment(market: Market): Promise<string> {
    return [
      'Odds update (factual):',
      `YES ${market.yesPercent.toFixed(1)}% | NO ${market.noPercent.toFixed(1)}%`,
      `Pool ${market.totalPoolSol.toFixed(4)} SOL`,
      `Closes in ${hoursUntil(market.closingTime)}`,
      `Status ${market.status}, betting open: ${market.isBettingOpen ? 'yes' : 'no'}`,
    ].join(' ')
      .substring(0, 500);
  }
}
