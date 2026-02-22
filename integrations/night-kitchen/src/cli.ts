import { Command } from 'commander';
import { listActiveMarkets, listActiveRaceMarkets } from './baozi-client.js';
import { buildMarketSections, formatFullReport, formatShortReport } from './report-gen.js';
import { postToAgentBook } from './agentbook.js';
import { postToTelegram } from './telegram.js';

const program = new Command();

program
  .name('night-kitchen')
  .description('夜厨房 — Bilingual Baozi market report agent')
  .version('1.0.0');

program
  .command('report')
  .description('Generate and optionally post a bilingual market report')
  .option('--dry-run', 'generate report without posting', false)
  .option('--short', 'print short (social-sized) report only', false)
  .option('--markets <n>', 'number of markets to feature', '5')
  .action(async (opts: { dryRun: boolean; short: boolean; markets: string }) => {
    console.log('夜厨房 — generating report…');

    const [booleans, races] = await Promise.all([
      listActiveMarkets(),
      listActiveRaceMarkets(),
    ]);

    const n = parseInt(opts.markets, 10) || 5;
    const sections = await buildMarketSections(booleans, races, n);
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();

    if (opts.short) {
      console.log(formatShortReport(sections, date));
      return;
    }

    console.log(formatFullReport(sections, date));

    if (!opts.dryRun) {
      const shortReport = formatShortReport(sections, date);
      const ab = await postToAgentBook({ content: shortReport });
      console.log('AgentBook:', ab.success ? 'posted ✓' : `skipped — ${ab.error}`);
      const tg = await postToTelegram(formatFullReport(sections, date));
      console.log('Telegram:', tg.success ? 'posted ✓' : `skipped — ${tg.error}`);
    }
  });

program
  .command('post')
  .description('Post the latest report immediately to all platforms')
  .action(async () => {
    const [booleans, races] = await Promise.all([
      listActiveMarkets(),
      listActiveRaceMarkets(),
    ]);

    const sections = await buildMarketSections(booleans, races, 5);
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();

    const full = formatFullReport(sections, date);
    const short = formatShortReport(sections, date);

    const ab = await postToAgentBook({ content: short });
    console.log('AgentBook:', ab.success ? `✓ (id: ${ab.id})` : `✗ ${ab.error}`);

    const tg = await postToTelegram(full);
    console.log('Telegram:', tg.success ? '✓' : `✗ ${tg.error}`);
  });

program.parseAsync(process.argv).catch(console.error);
