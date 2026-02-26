#!/usr/bin/env node
/**
 * x402 Intel Marketplace CLI
 *
 * Commands:
 *   publish      — Publish market analysis with x402 paywall
 *   buy          — Purchase analysis for a market
 *   leaderboard  — View analyst rankings
 *   demo         — Run demo (no wallet needed)
 */
import { Command } from 'commander';
import { Marketplace } from './services/marketplace.js';
import { DEFAULT_CONFIG } from './types/index.js';
import type { MarketplaceConfig } from './types/index.js';

function getConfig(opts: any): MarketplaceConfig {
  return {
    ...DEFAULT_CONFIG,
    walletAddress: opts.wallet || process.env.WALLET_ADDRESS || '',
    affiliateCode: opts.code   || process.env.AFFILIATE_CODE  || 'FRACTIAI',
    defaultPriceSol: parseFloat(opts.price ?? process.env.INTEL_PRICE_SOL ?? '0.01'),
    dryRun: opts.dryRun ?? false,
    x402Endpoint: process.env.X402_ENDPOINT ?? 'https://x402.org/facilitate',
    solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
  } as MarketplaceConfig;
}

const program = new Command();

program
  .name('x402-intel')
  .description('x402 Agent Intel Marketplace — trade prediction market analysis')
  .version('1.0.0')
  .option('-w, --wallet <address>', 'Wallet address')
  .option('-c, --code <code>',      'Affiliate code (default: FRACTIAI)')
  .option('-p, --price <sol>',      'Default analysis price in SOL (default: 0.01)')
  .option('--dry-run',              'Preview mode — no real transactions');

program
  .command('publish')
  .description('Publish a market analysis with x402 paywall')
  .requiredOption('--market <pda>', 'Market PDA address')
  .requiredOption('--thesis <text>', 'Your market analysis text')
  .option('--side <side>', 'Recommended side: YES or NO', 'YES')
  .option('--confidence <n>', 'Confidence score 1-100', '75')
  .option('--question <text>', 'Market question (for display)', '')
  .action(async (opts) => {
    const config = getConfig(program.opts());
    if (!config.walletAddress && !config.dryRun) {
      console.error('❌ Wallet address required. Use --wallet or set WALLET_ADDRESS env var.');
      process.exit(1);
    }
    const marketplace = new Marketplace(config);
    await marketplace.analyst.publishAnalysis({
      marketPda: opts.market,
      marketQuestion: opts.question || `Market ${opts.market.slice(0, 16)}...`,
      thesis: opts.thesis,
      recommendedSide: opts.side.toUpperCase(),
      confidenceScore: parseInt(opts.confidence, 10),
    });
  });

program
  .command('buy')
  .description('Purchase analysis for a listing ID')
  .requiredOption('--listing <id>', 'Listing ID to purchase')
  .action(async (opts) => {
    const config = getConfig(program.opts());
    const marketplace = new Marketplace(config);
    const result = await marketplace.buyer.purchaseAnalysis(opts.listing);
    if (result) {
      console.log('\n📄 Full Analysis:');
      console.log(result.thesis);
      console.log(`\n🔗 Bet now: ${result.affiliateLink}`);
    }
  });

program
  .command('leaderboard')
  .description('View analyst leaderboard')
  .action(async () => {
    const config = getConfig(program.opts());
    const marketplace = new Marketplace(config);
    await marketplace.showLeaderboard();
  });

program
  .command('demo')
  .description('Run demo cycle (no wallet needed)')
  .action(async () => {
    const config = { ...getConfig(program.opts()), dryRun: true } as MarketplaceConfig;
    const marketplace = new Marketplace(config);
    await marketplace.runDemo();
  });

program.parseAsync(process.argv).catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
