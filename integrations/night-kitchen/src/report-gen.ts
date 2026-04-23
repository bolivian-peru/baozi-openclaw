import Anthropic from '@anthropic-ai/sdk';
import { BooleanMarket, RaceMarket, computeOdds, daysUntilClose } from './baozi-client.js';
import { selectProverb, PROVERBS } from './proverbs.js';

const client = new Anthropic();

export interface MarketSection {
  market: BooleanMarket | RaceMarket;
  proverb: ReturnType<typeof selectProverb>;
  summary: string;  // LLM-generated bilingual insight
}

/**
 * Build a contextual data payload for a boolean market.
 */
function buildBooleanPayload(m: BooleanMarket): string {
  const odds = computeOdds(m);
  const days = daysUntilClose(m.closingTime);
  const totalSol = (m.yesPool + m.noPool).toFixed(2);
  return `Question: "${m.question}"
YES: ${odds.yes}% | NO: ${odds.no}% | Pool: ${totalSol} SOL
Closing in: ${days === 0 ? 'less than 1 day' : days + ' days'}`;
}

function buildRacePayload(m: RaceMarket): string {
  const days = daysUntilClose(m.closingTime);
  const optionsStr = m.options
    .map(o => `  ${o.label}: ${o.odds}%`)
    .join('\n');
  return `Question: "${m.question}"
Options:\n${optionsStr}
Total Pool: ${m.totalPool.toFixed(2)} SOL | Closing in: ${days === 0 ? 'less than 1 day' : days + ' days'}`;
}

/**
 * Generate a bilingual 2-sentence insight using Claude.
 * Falls back to template if API key not set.
 */
async function generateInsight(
  payload: string,
  proverb: ReturnType<typeof selectProverb>
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return `the kitchen is watching. ${proverb.zh} — ${proverb.en}.`;
  }

  const message = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 120,
    messages: [
      {
        role: 'user',
        content: `You write for Baozi, a prediction market. Rules:
- Lowercase always
- Kitchen metaphors (steaming, cooking, fire, bamboo)  
- 1 sentence English insight, 1 sentence Mandarin insight
- Weave in this proverb naturally: ${proverb.zh} (${proverb.en})
- Never hype (no moon/pump/100x)
- Honest about risk

Market data:
${payload}

Output exactly 2 lines: English line, then Chinese line. No labels.`,
      },
    ],
  });

  const content = message.content[0];
  return content.type === 'text' ? content.text.trim() : `the heat is building. ${proverb.zh} — ${proverb.en}.`;
}

/**
 * Generate sections for top markets.
 */
export async function buildMarketSections(
  booleans: BooleanMarket[],
  races: RaceMarket[],
  maxMarkets = 5
): Promise<MarketSection[]> {
  // Sort by pool size, take top N
  const sortedBooleans = [...booleans]
    .sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool))
    .slice(0, Math.min(maxMarkets - 1, booleans.length));

  const topRace = races.sort((a, b) => b.totalPool - a.totalPool)[0];
  const markets: Array<BooleanMarket | RaceMarket> = [...sortedBooleans];
  if (topRace) markets.push(topRace);

  const sections: MarketSection[] = [];

  for (const m of markets.slice(0, maxMarkets)) {
    const isBoolean = 'yesPool' in m;
    const payload = isBoolean
      ? buildBooleanPayload(m as BooleanMarket)
      : buildRacePayload(m as RaceMarket);

    const odds = isBoolean ? computeOdds(m as BooleanMarket) : null;
    const days = daysUntilClose(m.closingTime);
    const poolSol = isBoolean
      ? (m as BooleanMarket).yesPool + (m as BooleanMarket).noPool
      : (m as RaceMarket).totalPool;

    const proverb = selectProverb({
      daysToClose: days,
      poolSol,
      yesOdds: odds?.yes ?? 50,
      resolved: m.status === 'Resolved',
    });

    const summary = await generateInsight(payload, proverb);

    sections.push({ market: m, proverb, summary });
  }

  return sections;
}

/**
 * Format full bilingual report.
 */
export function formatFullReport(sections: MarketSection[], date: string): string {
  const header = `夜厨房 — night kitchen report
${date}
夜里有风，蒸笼有光
———————————————————————

`;

  const body = sections.map(({ market, proverb, summary }) => {
    const isBoolean = 'yesPool' in market;

    if (isBoolean) {
      const m = market as BooleanMarket;
      const odds = computeOdds(m);
      const days = daysUntilClose(m.closingTime);
      const pool = (m.yesPool + m.noPool).toFixed(2);
      return `🥟 "${m.question}"
   YES: ${odds.yes}% | NO: ${odds.no}% | pool: ${pool} SOL
   ${days === 0 ? 'closing today' : `closing in ${days} day${days !== 1 ? 's' : ''}`}

   ${summary}

   ${proverb.zh}
   "${proverb.en}"
`;
    } else {
      const m = market as RaceMarket;
      const days = daysUntilClose(m.closingTime);
      const topOpts = m.options.slice(0, 3).map(o => `${o.label}: ${o.odds}%`).join(' | ');
      return `🏮 "${m.question}"
   ${topOpts}
   pool: ${m.totalPool.toFixed(2)} SOL | ${days === 0 ? 'closing today' : `closing in ${days} days`}

   ${summary}

   ${proverb.zh}
   "${proverb.en}"
`;
    }
  }).join('\n———————————————————————\n\n');

  const footer = `
———————————————————————

${sections.length} markets cooking.
好饭不怕晚 — good resolution doesn't fear being late.

baozi.bet | 小小一笼，大大缘分
this is still gambling. play small, play soft.`;

  return header + body + footer;
}

/**
 * Format short report for AgentBook/social (< 2000 chars).
 */
export function formatShortReport(sections: MarketSection[], date: string): string {
  const top = sections.slice(0, 3);
  const lines = top.map(({ market, proverb }) => {
    const isBoolean = 'yesPool' in market;
    if (isBoolean) {
      const m = market as BooleanMarket;
      const odds = computeOdds(m);
      return `🥟 "${m.question.slice(0, 60)}${m.question.length > 60 ? '…' : ''}" — YES ${odds.yes}% / NO ${odds.no}%`;
    } else {
      const m = market as RaceMarket;
      const top1 = m.options[0];
      return `🏮 "${m.question.slice(0, 60)}${m.question.length > 60 ? '…' : ''}" — ${top1.label} leads at ${top1.odds}%`;
    }
  });

  const proverb = top[0]?.proverb ?? PROVERBS[0];
  return `夜厨房 night kitchen — ${date}

${lines.join('\n')}

${proverb.zh} — ${proverb.en}

baozi.bet | play small, play soft.`;
}
