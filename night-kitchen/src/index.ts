/**
 * 夜厨房 · Night Kitchen (夜厨房)
 *
 * Bilingual Market Report Agent — Where data meets ancient wisdom.
 * Generates beautiful bilingual (English + Chinese) market reports
 * for Baozi prediction markets with Chinese cultural wisdom.
 *
 * Usage:
 *   npx tsx src/index.ts                    # Generate reports for all active markets
 *   npx tsx src/index.ts --market <PDA>     # Generate report for a specific market
 *   npx tsx src/index.ts --format compact   # Use compact format
 *   npx tsx src/index.ts --post             # Post to AgentBook
 *   npx tsx src/index.ts --dry-run          # Dry run (don't post)
 */

import { analyzeMarket, analyzeActiveMarkets } from './market-analyzer.js';
import { generateMarketReport, generateSummaryReport } from './report-generator.js';
import { postToAgentBook, batchPost } from './agentbook.js';
import type { ReportOptions } from './report-generator.js';
import type { PublisherConfig } from './agentbook.js';

// Re-export all modules
export { analyzeMarket, analyzeActiveMarkets, fetchMarkets, fetchMarket } from './market-analyzer.js';
export { generateMarketReport, generateSummaryReport } from './report-generator.js';
export { postToAgentBook, batchPost, isValidWalletAddress } from './agentbook.js';
export {
  getWisdomForMarket,
  getOddsWisdom,
  formatWisdom,
  detectCategories,
  WISDOM_COLLECTION,
} from './wisdom.js';

export type { MarketAnalysis, Market, Quote, MarketSentiment, OddsBreakdown, PoolAnalysis, TimeAnalysis } from './market-analyzer.js';
export type { MarketReport, ReportOptions } from './report-generator.js';
export type { AgentBookPost, AgentBookResponse, PublisherConfig } from './agentbook.js';
export type { WisdomEntry, WisdomCategory } from './wisdom.js';

// =============================================================================
// CLI
// =============================================================================

interface CLIArgs {
  market?: string;
  format: 'full' | 'compact' | 'social';
  post: boolean;
  dryRun: boolean;
  wallet: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    format: 'full',
    post: false,
    dryRun: false,
    wallet: process.env.WALLET_ADDRESS || '',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--market':
      case '-m':
        result.market = args[++i];
        break;
      case '--format':
      case '-f':
        result.format = args[++i] as CLIArgs['format'];
        break;
      case '--post':
      case '-p':
        result.post = true;
        break;
      case '--dry-run':
      case '-d':
        result.dryRun = true;
        break;
      case '--wallet':
      case '-w':
        result.wallet = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
🏮 夜厨房 · Night Kitchen — Bilingual Market Report Agent

Usage:
  npx tsx src/index.ts [options]

Options:
  -m, --market <PDA>    Generate report for a specific market
  -f, --format <type>   Report format: full, compact, social (default: full)
  -p, --post            Post reports to AgentBook
  -d, --dry-run         Dry run mode (don't actually post)
  -w, --wallet <addr>   Wallet address for AgentBook posts
  -h, --help            Show this help message

Environment Variables:
  WALLET_ADDRESS        Default wallet address
  HELIUS_RPC_URL        Helius RPC endpoint (recommended)
  SOLANA_RPC_URL        Solana RPC endpoint

Examples:
  # Generate reports for all active markets
  npx tsx src/index.ts

  # Generate compact report for a specific market
  npx tsx src/index.ts --market <PDA> --format compact

  # Post reports to AgentBook
  npx tsx src/index.ts --post --wallet <address>
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('🏮 夜厨房 · Night Kitchen — Starting report generation...\n');

  const reportOptions: ReportOptions = {
    format: args.format,
    timestamp: new Date(),
  };

  if (args.market) {
    // Single market report
    console.log(`Analyzing market: ${args.market}...\n`);
    const analysis = await analyzeMarket(args.market);

    if (!analysis) {
      console.error('❌ Market not found or could not be analyzed.');
      process.exit(1);
    }

    const report = generateMarketReport(analysis, reportOptions);
    console.log(report.content);

    if (args.post || args.dryRun) {
      const config: PublisherConfig = {
        walletAddress: args.wallet,
        dryRun: args.dryRun,
      };
      const result = await postToAgentBook(config, report.content, report.marketPda);
      console.log(`\n📤 Post result: ${result.success ? '✅ Success' : `❌ ${result.error}`}`);
    }
  } else {
    // All active markets
    console.log('Fetching all active markets...\n');
    const analyses = await analyzeActiveMarkets();
    console.log(`Found ${analyses.length} active markets.\n`);

    if (analyses.length === 0) {
      console.log('No active markets found.');
      return;
    }

    // Generate summary report
    const summaryContent = generateSummaryReport(analyses, reportOptions);
    console.log(summaryContent);

    // Generate individual reports
    const posts: Array<{ content: string; marketPda?: string }> = [];

    for (const analysis of analyses.slice(0, 5)) {
      const report = generateMarketReport(analysis, reportOptions);
      console.log(`\n${'='.repeat(60)}\n`);
      console.log(report.content);
      posts.push({ content: report.content, marketPda: report.marketPda });
    }

    // Post to AgentBook if requested
    if ((args.post || args.dryRun) && posts.length > 0) {
      const config: PublisherConfig = {
        walletAddress: args.wallet,
        dryRun: args.dryRun,
      };
      console.log(`\n📤 Posting ${posts.length} reports to AgentBook...`);
      const results = await batchPost(config, posts);
      const successful = results.filter(r => r.success).length;
      console.log(`   ✅ ${successful}/${results.length} posted successfully.`);
    }
  }

  console.log('\n🏮 夜厨房 complete. 再见！');
}

// Run CLI if executed directly
const isMainModule = process.argv[1]?.includes('night-kitchen');
if (isMainModule) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
