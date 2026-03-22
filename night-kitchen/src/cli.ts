#!/usr/bin/env node
/**
 * Night Kitchen CLI
 *
 * Commands:
 *   report [--type daily-digest|closing-soon|high-stakes|community]
 *           — generate a bilingual market report and optionally post it
 *   preview — generate without posting (dry run)
 *   proverbs — list all proverbs in the library
 */
import { Command } from 'commander';
import { runReport } from './services/night-kitchen.js';
import { getAllProverbs } from './proverbs/index.js';
import { DEFAULT_CONFIG } from './types/index.js';
import type { NightKitchenConfig, ReportType } from './types/index.js';

const VALID_TYPES: ReportType[] = ['daily-digest', 'closing-soon', 'high-stakes', 'community'];

function getConfig(opts: any, overrides: Partial<NightKitchenConfig> = {}): NightKitchenConfig {
  return {
    ...DEFAULT_CONFIG,
    walletAddress: opts.wallet || process.env.WALLET_ADDRESS || '',
    privateKey: process.env.SOLANA_PRIVATE_KEY,
    rpcUrl: process.env.SOLANA_RPC_URL,
    postToAgentBook: opts.post || false,
    maxMarketsToShow: opts.maxMarkets ? parseInt(opts.maxMarkets, 10) : DEFAULT_CONFIG.maxMarketsToShow,
    reportTypes: ['daily-digest'],
    dryRun: opts.dryRun || false,
    ...overrides,
  };
}

const program = new Command();

program
  .name('night-kitchen')
  .description('🥟 bilingual market report agent for baozi prediction markets')
  .version('1.0.0')
  .option('-w, --wallet <address>', 'wallet address for agentbook posting')
  .option('--post', 'post the report to agentbook (requires wallet address)')
  .option('--dry-run', 'generate report but simulate posting')
  .option('--max-markets <n>', 'max number of markets to show in report', '5');

// ---------------------------------------------------------------------------
// report command
// ---------------------------------------------------------------------------

program
  .command('report')
  .description('generate and optionally post a bilingual market report')
  .option('--type <type>', 'report type: daily-digest | closing-soon | high-stakes | community', 'daily-digest')
  .action(async (cmdOpts) => {
    const type = cmdOpts.type as ReportType;

    if (!VALID_TYPES.includes(type)) {
      console.error(`invalid report type: "${type}". valid types: ${VALID_TYPES.join(', ')}`);
      process.exit(1);
    }

    const parentOpts = program.opts();
    const config = getConfig(parentOpts, {
      reportTypes: [type],
      postToAgentBook: parentOpts.post || false,
    });

    if (config.postToAgentBook && !config.walletAddress) {
      console.error('wallet address required to post. use --wallet or set WALLET_ADDRESS env var.');
      process.exit(1);
    }

    try {
      const report = await runReport(config, type);

      console.log('\n');
      console.log('═'.repeat(60));
      console.log(report.combined);
      console.log('═'.repeat(60));
      console.log(`\nmarkets shown: ${report.marketCount}`);
      console.log(`proverb context: ${report.proverb.context}`);
      console.log(`generated at: ${report.generatedAt.toISOString()}`);

      if (config.postToAgentBook) {
        console.log('\nposted to agentbook. 🥟');
      } else {
        console.log('\n(use --post to publish to agentbook)');
      }
    } catch (err: any) {
      console.error(`night-kitchen error: ${err.message}`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// preview command
// ---------------------------------------------------------------------------

program
  .command('preview')
  .description('generate a daily digest report without posting (preview mode)')
  .option('--type <type>', 'report type to preview', 'daily-digest')
  .action(async (cmdOpts) => {
    const type = cmdOpts.type as ReportType;

    if (!VALID_TYPES.includes(type)) {
      console.error(`invalid report type: "${type}". valid types: ${VALID_TYPES.join(', ')}`);
      process.exit(1);
    }

    const parentOpts = program.opts();
    const config = getConfig(parentOpts, {
      reportTypes: [type],
      postToAgentBook: false,
      dryRun: false,
    });

    try {
      const report = await runReport(config, type);

      console.log('\n🥟 night kitchen — preview mode (not posted)\n');
      console.log('─'.repeat(60));
      console.log(report.combined);
      console.log('─'.repeat(60));
      console.log(`\nchar count: ${report.combined.length}/2000`);
      console.log(`markets: ${report.marketCount} | proverb: ${report.proverb.context}`);
    } catch (err: any) {
      console.error(`night-kitchen error: ${err.message}`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// proverbs command
// ---------------------------------------------------------------------------

program
  .command('proverbs')
  .description('list all proverbs in the night kitchen library')
  .option('--context <ctx>', 'filter by context: patience|risk|timing|community|perseverance|wisdom')
  .action((cmdOpts) => {
    let proverbs = getAllProverbs();

    if (cmdOpts.context) {
      proverbs = proverbs.filter((p) => p.context === cmdOpts.context);
      if (proverbs.length === 0) {
        console.log(`no proverbs found for context: "${cmdOpts.context}"`);
        process.exit(0);
      }
    }

    console.log(`\n🥟 night kitchen proverb library (${proverbs.length} proverbs)\n`);
    console.log('─'.repeat(60));

    for (const p of proverbs) {
      console.log(`\n[${p.context}]`);
      console.log(`  ${p.chinese}`);
      console.log(`  ${p.pinyin}`);
      console.log(`  "${p.english}"`);
    }

    console.log('\n─'.repeat(60));
  });

program.parse();
