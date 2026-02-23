/**
 * Report Generator — bilingual market report with Chinese proverbs
 */
import { BinaryMarket, RaceMarket } from './mcp-client';
import { selectProverb } from './proverbs';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toLowerCase();
}

function hoursUntil(isoDate: string): number {
  return Math.max(0, (new Date(isoDate).getTime() - Date.now()) / 3600000);
}

function formatClosing(isoDate: string): string {
  const h = hoursUntil(isoDate);
  if (h < 24) return `closing in ${Math.round(h)}h`;
  return `closing in ${Math.round(h / 24)} days`;
}

function renderBinaryMarket(m: BinaryMarket): string {
  const proverb = selectProverb(m.totalPool, hoursUntil(m.closingAt), m.yesPercent);
  return [
    `🥟 "${m.question}"`,
    `   YES: ${m.yesPercent}% | NO: ${m.noPercent}% | Pool: ${m.totalPool.toFixed(1)} SOL`,
    `   ${formatClosing(m.closingAt)}`,
    ``,
    `   ${proverb.chinese}`,
    `   "${proverb.english}"`,
  ].join('\n');
}

function renderRaceMarket(m: RaceMarket): string {
  const top = m.options.reduce((a, b) => (a.percent > b.percent ? a : b));
  const proverb = selectProverb(m.totalPool, hoursUntil(m.closingAt), top.percent);
  const opts = m.options.map(o => `${o.label}: ${o.percent}%`).join(' | ');
  return [
    `🥟 "${m.question}"`,
    `   ${opts}`,
    `   Pool: ${m.totalPool.toFixed(1)} SOL | ${formatClosing(m.closingAt)}`,
    ``,
    `   ${proverb.chinese}`,
    `   "${proverb.english}"`,
  ].join('\n');
}

export function generateReport(
  binary: BinaryMarket[],
  race: RaceMarket[]
): string {
  const now = new Date();
  const totalMarkets = binary.length + race.length;
  const totalPool = [...binary, ...race].reduce((s, m) => s + m.totalPool, 0);

  const sections: string[] = [];

  sections.push(`夜厨房 — night kitchen report`);
  sections.push(formatDate(now));
  sections.push(``);
  sections.push(`${totalMarkets} markets cooking tonight. grandma is watching.`);
  sections.push(``);
  sections.push(`───────────────`);
  sections.push(``);

  for (const m of binary) {
    sections.push(renderBinaryMarket(m));
    sections.push(``);
  }

  for (const m of race) {
    sections.push(renderRaceMarket(m));
    sections.push(``);
  }

  sections.push(`───────────────`);
  sections.push(``);
  sections.push(`${totalMarkets} markets cooking. total pool: ${totalPool.toFixed(1)} SOL`);
  sections.push(`夜里有风，蒸笼有光。 — wind at night, light in the steamer.`);

  return sections.join('\n');
}
