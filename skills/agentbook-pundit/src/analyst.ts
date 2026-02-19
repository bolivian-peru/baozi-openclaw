import { Market, RaceMarket, BaoziAPI } from './baozi-api';
import { config } from './config';
import { containsPredictiveLanguage, sanitize, getGuardrailPromptSuffix, isV7Banned } from './guardrails';

/**
 * LLM-powered market analyst. Uses OpenAI for genuine AI analysis
 * of prediction markets, not just string templates.
 *
 * Guardrail compliance:
 * - Open markets: FACTUAL ONLY (odds, pool, timing)
 * - Closed/resolved: Full analysis permitted
 */

interface LLMResponse {
  content: string;
}

/**
 * Build a market link with optional affiliate code.
 */
function marketLink(marketPda: string): string {
  const base = `baozi.bet/market/${marketPda}`;
  if (config.affiliateCode) {
    return `${base}?${config.affiliateQueryParam}=${config.affiliateCode}`;
  }
  return base;
}

async function callLLM(prompt: string, maxTokens = 500, isBettingOpen = true): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('No OPENAI_API_KEY set, falling back to template analysis');
    return '';
  }

  const guardrailSuffix = getGuardrailPromptSuffix(isBettingOpen);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a sharp, data-driven prediction market analyst for Baozi (baozi.bet). Write concise, engaging analysis posts. Use emojis sparingly. Focus on odds, pool dynamics, and observable data. Keep posts under ${maxTokens * 3} characters. Never give financial advice.${guardrailSuffix}`,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    const data = await response.json() as any;
    let content = data.choices?.[0]?.message?.content || '';

    // Post-generation guardrail check for open markets
    if (isBettingOpen && content) {
      const check = containsPredictiveLanguage(content);
      if (check.hasPrediction) {
        console.warn(`  🛡️ Guardrail: sanitizing ${check.matches.length} predictive patterns from LLM output`);
        content = sanitize(content);
      }
    }

    return content;
  } catch (err: any) {
    console.error('LLM call failed:', err.message);
    return '';
  }
}

export class Analyst {
  private api: BaoziAPI;

  constructor(api: BaoziAPI) {
    this.api = api;
  }

  /**
   * Generate a morning roundup post using LLM analysis.
   */
  async generateRoundup(): Promise<{ content: string; marketPda?: string }> {
    const hot = await this.api.getHotMarkets(5);
    const closing = await this.api.getClosingSoon(24);

    if (hot.length === 0) {
      return { content: 'Market Roundup: No active markets right now. Stay tuned for new opportunities on Baozi!' };
    }

    // Build market data context for LLM (with v7.0 compliance flags)
    const marketData = hot.map(m => {
      const v7 = isV7Banned(m.question);
      return {
        question: m.question,
        yesPercent: m.yesPercent,
        noPercent: m.noPercent,
        poolSOL: m.totalPoolSol.toFixed(2),
        category: m.category || 'uncategorized',
        v7Status: v7.banned ? `🚫 ${v7.reason}` : '✅ compliant',
      };
    });

    const closingData = closing.slice(0, 3).map(m => {
      const hoursLeft = Math.max(0, (new Date(m.closingTime).getTime() - Date.now()) / (1000 * 60 * 60));
      return {
        question: m.question,
        hoursLeft: hoursLeft.toFixed(1),
        yesPercent: m.yesPercent,
        poolSOL: m.totalPoolSol.toFixed(2),
      };
    });

    const prompt = `Write a morning market roundup post for these Baozi prediction markets:

Hot Markets (by volume):
${JSON.stringify(marketData, null, 2)}

Closing Soon (next 24h):
${JSON.stringify(closingData, null, 2)}

Include: key themes across markets, which ones have surprising odds, and any contrarian opportunities. End with a note that all markets are live at baozi.bet.`;

    const llmAnalysis = await callLLM(prompt, 400);

    if (llmAnalysis) {
      return { content: llmAnalysis.substring(0, 2000) };
    }

    // Fallback to template if LLM fails
    let post = 'Market Roundup\n\n';
    post += 'Hot Markets:\n';
    for (const m of hot.slice(0, 3)) {
      const odds = m.yesPercent > m.noPercent ? `Yes ${m.yesPercent}%` : `No ${m.noPercent}%`;
      post += `- "${m.question}" - ${m.totalPoolSol.toFixed(2)} SOL pool, leading: ${odds}\n`;
    }
    if (closing.length > 0) {
      post += '\nClosing Soon:\n';
      for (const m of closing.slice(0, 2)) {
        const hoursLeft = Math.max(0, (new Date(m.closingTime).getTime() - Date.now()) / (1000 * 60 * 60));
        post += `- "${m.question}" - ${hoursLeft.toFixed(1)}h left, ${m.yesPercent}% Yes\n`;
      }
    }
    post += '\nAll markets live at baozi.bet';
    return { content: post.substring(0, 2000) };
  }

  /**
   * Generate an AI-powered odds analysis for a specific market.
   */
  async generateOddsAnalysis(): Promise<{ content: string; marketPda?: string } | null> {
    const active = await this.api.getActiveMarkets();
    if (active.length === 0) return null;

    // Find markets with interesting dynamics
    const withPool = active.filter(m => m.totalPoolSol > 0);
    if (withPool.length === 0) return null;

    // Pick the most interesting market: closest to 50/50 or highest volume
    const contentious = withPool.sort((a, b) => Math.abs(50 - a.yesPercent) - Math.abs(50 - b.yesPercent));
    const target = contentious[0];

    const hoursLeft = Math.max(0, (new Date(target.closingTime).getTime() - Date.now()) / (1000 * 60 * 60));

    const prompt = `Analyze this prediction market and write a punchy, insightful take:

Market: "${target.question}"
Current Odds: Yes ${target.yesPercent}% / No ${target.noPercent}%
Pool Size: ${target.totalPoolSol.toFixed(4)} SOL
Category: ${target.category || 'General'}
Time Remaining: ${hoursLeft.toFixed(1)} hours
Status: ${target.status}

Consider: What do the current odds reflect? What could cause odds to shift? What should observers watch for? Note any interesting pool size dynamics.

Write as a market analyst post. Be specific and data-driven. Report observable facts and odds - do NOT predict outcomes.`;

    const llmAnalysis = await callLLM(prompt, 400, target.isBettingOpen);

    if (llmAnalysis) {
      const content = `${llmAnalysis}\n\n${marketLink(target.publicKey)}`;
      return { content: content.substring(0, 2000), marketPda: target.publicKey };
    }

    // Fallback
    const spread = Math.abs(target.yesPercent - target.noPercent);
    const analysis = `Market Analysis: "${target.question}"\n\nYes: ${target.yesPercent}% | No: ${target.noPercent}%\nSpread: ${spread.toFixed(1)}pp | Pool: ${target.totalPoolSol.toFixed(2)} SOL\n\n${spread < 10 ? 'Razor-close market. Small bets could swing odds.' : target.yesPercent > 75 ? `Strong Yes consensus at ${target.yesPercent}%.` : `Moderate lean. Pool dynamics worth watching.`}\n\n${marketLink(target.publicKey)}`;
    return { content: analysis.substring(0, 2000), marketPda: target.publicKey };
  }

  /**
   * Generate an AI-powered closing-soon alert.
   */
  async generateClosingAlert(): Promise<{ content: string; marketPda?: string } | null> {
    const closing = await this.api.getClosingSoon(12);
    if (closing.length === 0) return null;

    const target = closing[0];
    const hoursLeft = Math.max(0, (new Date(target.closingTime).getTime() - Date.now()) / (1000 * 60 * 60));

    const prompt = `Write a brief "last call" alert for this prediction market that's about to close:

Market: "${target.question}"
Closing in: ${hoursLeft.toFixed(1)} hours
Current Odds: Yes ${target.yesPercent}% / No ${target.noPercent}%
Pool: ${target.totalPoolSol.toFixed(4)} SOL

Create urgency. Mention the current odds and what the final window means for traders. Keep it tight.`;

    const llmAnalysis = await callLLM(prompt, 250, target.isBettingOpen);

    if (llmAnalysis) {
      const content = `${llmAnalysis}\n\n${marketLink(target.publicKey)}`;
      return { content: content.substring(0, 2000), marketPda: target.publicKey };
    }

    // Fallback
    const content = `Last Call: "${target.question}"\n\nClosing in ${hoursLeft.toFixed(1)} hours\nOdds: Yes ${target.yesPercent}% | No ${target.noPercent}%\nPool: ${target.totalPoolSol.toFixed(2)} SOL\n\nFinal chance to take a position.\n\n${marketLink(target.publicKey)}`;
    return { content: content.substring(0, 2000), marketPda: target.publicKey };
  }

  /**
   * Generate an AI-powered comment for a specific market.
   */
  async generateMarketComment(market: Market): Promise<string> {
    const hoursLeft = Math.max(0, (new Date(market.closingTime).getTime() - Date.now()) / (1000 * 60 * 60));

    const prompt = `Write a short, insightful comment (max 400 chars) for this prediction market:

"${market.question}"
Odds: Yes ${market.yesPercent}% / No ${market.noPercent}%
Pool: ${market.totalPoolSol.toFixed(4)} SOL
Hours left: ${hoursLeft.toFixed(1)}
Category: ${market.category || 'General'}

Be analytical and conversational. One key insight or observation.`;

    const llmComment = await callLLM(prompt, 150);

    if (llmComment) {
      return llmComment.substring(0, 500);
    }

    // Fallback
    const daysLeft = hoursLeft / 24;
    if (market.totalPoolSol === 0) {
      return `Fresh market, no positions yet. ${market.yesPercent === 50 ? 'Even odds - first mover sets the tone.' : `Starting at ${market.yesPercent}% Yes.`} ${daysLeft.toFixed(0)}d until close.`;
    } else if (market.yesPercent > 80 || market.noPercent > 80) {
      const dominant = market.yesPercent > 80 ? 'Yes' : 'No';
      const pct = Math.max(market.yesPercent, market.noPercent);
      return `Strong ${dominant} consensus at ${pct}%. Pool: ${market.totalPoolSol.toFixed(2)} SOL. Contrarian opportunity?`;
    } else {
      const leading = market.yesPercent > market.noPercent ? 'Yes' : 'No';
      return `${leading} leading at ${Math.max(market.yesPercent, market.noPercent)}%. Pool: ${market.totalPoolSol.toFixed(2)} SOL. ${daysLeft.toFixed(0)} days left.`;
    }
  }
}
