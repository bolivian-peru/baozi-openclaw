import cron from 'node-cron';
import { listActiveMarkets, listActiveRaceMarkets } from './baozi-client.js';
import { buildMarketSections, formatFullReport, formatShortReport } from './report-gen.js';
import { postToAgentBook } from './agentbook.js';
import { postToTelegram } from './telegram.js';

function getDateString(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toLowerCase();
}

export async function runNightKitchen(opts: { dryRun?: boolean; short?: boolean } = {}) {
  console.log('夜厨房 night kitchen — fetching markets…');

  const [booleans, races] = await Promise.all([
    listActiveMarkets(),
    listActiveRaceMarkets(),
  ]);

  console.log(`fetched ${booleans.length} boolean + ${races.length} race markets`);

  const sections = await buildMarketSections(booleans, races, 5);
  const date = getDateString();

  const fullReport = formatFullReport(sections, date);
  const shortReport = formatShortReport(sections, date);

  console.log('\n─── FULL REPORT ───────────────────────────────');
  console.log(fullReport);
  console.log('\n─── SHORT REPORT (AgentBook/social) ───────────');
  console.log(shortReport);

  if (opts.dryRun) {
    console.log('\n[dry-run] skipping posts.');
    return { fullReport, shortReport, sections };
  }

  // post short report to AgentBook
  const abResult = await postToAgentBook({ content: shortReport });
  console.log('AgentBook:', abResult.success ? `posted (id: ${abResult.id})` : `failed — ${abResult.error}`);

  // post full report to Telegram
  const tgResult = await postToTelegram(fullReport);
  console.log('Telegram:', tgResult.success ? 'posted' : `failed — ${tgResult.error}`);

  return { fullReport, shortReport, sections, posted: { agentbook: abResult, telegram: tgResult } };
}

// Scheduled run: nightly at 22:00 UTC (夜里)
const SCHEDULE = process.env.NIGHT_KITCHEN_CRON ?? '0 22 * * *';
const TZ = process.env.TZ ?? 'UTC';

console.log(`夜厨房 night kitchen — scheduled (${SCHEDULE} ${TZ})`);
console.log('starting scheduler…');

cron.schedule(SCHEDULE, async () => {
  console.log(`[${new Date().toISOString()}] cron fired — running night kitchen report`);
  try {
    await runNightKitchen();
  } catch (err) {
    console.error('night kitchen error:', err);
  }
}, { timezone: TZ });

// immediate run on startup if env var set
if (process.env.RUN_ON_START === 'true') {
  runNightKitchen().catch(console.error);
}
