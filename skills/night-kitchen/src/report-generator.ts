/**
 * Report Generator — Night Kitchen bilingual market reports
 *
 * Uses LLM for analysis + proverb selection.
 * Fallback to templates if LLM unavailable.
 */
import { config } from './config';
import { BinaryMarket, NotableEvent } from './baozi-api';

const PROVERBS = [
  { zh: '心急吃不了热豆腐', en: 'you can\'t rush hot tofu', tag: 'patience' },
  { zh: '慢工出细活', en: 'slow work, fine craft', tag: 'patience' },
  { zh: '好饭不怕晚', en: 'good food doesn\'t fear being late', tag: 'patience' },
  { zh: '火候到了，自然熟', en: 'when the heat is right, it cooks naturally', tag: 'timing' },
  { zh: '民以食为天', en: 'food is heaven for people', tag: 'fundamentals' },
  { zh: '贪多嚼不烂', en: 'bite off too much, can\'t chew', tag: 'risk' },
  { zh: '知足常乐', en: 'contentment brings happiness', tag: 'risk' },
  { zh: '见好就收', en: 'quit while ahead', tag: 'risk' },
  { zh: '谋事在人，成事在天', en: 'you make your bet, fate decides', tag: 'luck' },
  { zh: '小小一笼，大大缘分', en: 'small steamer, big fate', tag: 'brand' },
  { zh: '人间烟火气，最抚凡人心', en: 'the warmth of everyday cooking soothes ordinary hearts', tag: 'warmth' },
];

function selectProverb(context: string): typeof PROVERBS[0] {
  // Simple heuristic mapping
  if (context.includes('risk') || context.includes('high') || context.includes('large')) {
    return PROVERBS.filter(p => p.tag === 'risk')[0];
  }
  if (context.includes('wait') || context.includes('long')) {
    return PROVERBS.filter(p => p.tag === 'patience')[0];
  }
  if (context.includes('close') || context.includes('luck')) {
    return PROVERBS.filter(p => p.tag === 'luck')[0];
  }
  return PROVERBS[Math.floor(Math.random() * PROVERBS.length)];
}

export async function generateReport(events: NotableEvent[]): Promise<string> {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
  
  if (!config.openaiApiKey) {
    return templateReport(events, date);
  }

  try {
    return await llmReport(events, date);
  } catch (e) {
    console.error('LLM generation failed, falling back to template', e);
    return templateReport(events, date);
  }
}

function templateReport(events: NotableEvent[], date: string): string {
  let report = `夜厨房 — night kitchen report\n${date}\n\n`;
  
  // Summary stats
  const activeCount = events.length;
  report += `${activeCount} dishes in the steamer today.\n\n`;

  for (const event of events.slice(0, 3)) { // Limit to 3 items
    const m = event.market;
    report += `🥟 "${m.question}"\n`;
    if (m.outcome === 'Unresolved') {
      report += `   YES: ${m.yesPercent}% | NO: ${m.noPercent}% | Pool: ${m.totalPoolSol.toFixed(1)} SOL\n`;
      const closing = new Date(m.closingTime).getTime() - Date.now();
      const days = Math.ceil(closing / (1000 * 60 * 60 * 24));
      report += `   closing in ${days} days\n`;
    } else {
      report += `   Resolved: ${m.outcome} | Pool: ${m.totalPoolSol.toFixed(1)} SOL\n`;
    }
    
    // Proverb per item
    const proverb = selectProverb(event.type === 'large_bet' ? 'risk' : 'luck');
    report += `\n   ${proverb.zh}\n   "${proverb.en}"\n\n`;
  }

  report += `───────────────\n\n`;
  report += `baozi.bet | 小小一笼，大大缘分`;
  
  return report;
}

async function llmReport(events: NotableEvent[], date: string): Promise<string> {
  const eventContext = events.map(e => ({
    question: e.market.question,
    odds: `YES ${e.market.yesPercent}% / NO ${e.market.noPercent}%`,
    pool: `${e.market.totalPoolSol.toFixed(1)} SOL`,
    status: e.market.outcome === 'Unresolved' ? 'Active' : `Resolved: ${e.market.outcome}`,
    type: e.type
  }));

  const prompt = `Generate a "Night Kitchen" (夜厨房) market report for Baozi.
  
Context: ${JSON.stringify(eventContext, null, 2)}
Date: ${date}

Requirements:
1. Header: "夜厨房 — night kitchen report" + date
2. Intro: Short, warm metaphor about the market kitchen (steamer, heat, dough).
3. Items: Summarize 2-3 key markets. For each, include a relevant Chinese proverb from this list:
   ${JSON.stringify(PROVERBS.map(p => `${p.zh} (${p.en})`))}
4. Style: Lowercase, poetic but clear data.
5. Footer: "baozi.bet | 小小一笼，大大缘分"

Return ONLY the report text.`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'You are the head chef of the Night Kitchen prediction market. Warm, wise, bilingual.' }, { role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  const data = await resp.json() as any;
  return data.choices?.[0]?.message?.content || templateReport(events, date);
}
