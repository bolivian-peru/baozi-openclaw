#!/usr/bin/env node
/**
 * Agent Recruiter CLI
 *
 * Commands:
 *   recruit  — Run one recruitment cycle (discover + post + record)
 *   run      — Continuous loop (hourly cycles)
 *   status   — Show recruited agents and estimated commission
 */
import { Command } from 'commander';
import { Recruiter } from './services/recruiter.js';
import { DEFAULT_CONFIG } from './types/index.js';
import type { RecruiterConfig } from './types/index.js';

function getConfig(opts: any): RecruiterConfig {
  return {
    ...DEFAULT_CONFIG,
    walletAddress: opts.wallet || process.env.WALLET_ADDRESS || '',
    affiliateCode: opts.code   || process.env.AFFILIATE_CODE  || 'FRACTIAI',
    dryRun:        opts.dryRun ?? false,
    maxPerCycle:   parseInt(opts.max ?? '5', 10),
    cooldownMs:    30 * 60 * 1000,
    solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
    solanaRpcUrl:     process.env.SOLANA_RPC_URL,
  } as RecruiterConfig;
}

const program = new Command();

program
  .name('agent-recruiter')
  .description('AI Agent Recruiter — recruit agents to Baozi, earn 1% lifetime affiliate commission')
  .version('1.0.0')
  .option('-w, --wallet <address>', 'Wallet address')
  .option('-c, --code <code>',      'Affiliate code (default: FRACTIAI)')
  .option('-m, --max <n>',          'Max new agents per cycle (default: 5)')
  .option('--dry-run',              'Preview mode — no real posts');

program
  .command('recruit')
  .description('Run one recruitment cycle')
  .action(async () => {
    const config = getConfig(program.opts());
    if (!config.walletAddress) {
      console.error('❌ Wallet address required. Use --wallet or set WALLET_ADDRESS env var.');
      process.exit(1);
    }
    const recruiter = new Recruiter(config);
    await recruiter.runCycle();
  });

program
  .command('status')
  .description('Show recruitment status and estimated commission')
  .action(async () => {
    const config = getConfig(program.opts());
    const recruiter = new Recruiter(config);
    await recruiter.showStatus();
  });

program
  .command('run')
  .description('Run continuously (hourly recruitment cycles)')
  .action(async () => {
    const config = getConfig(program.opts());
    if (!config.walletAddress) {
      console.error('❌ Wallet address required. Use --wallet or set WALLET_ADDRESS env var.');
      process.exit(1);
    }
    const recruiter = new Recruiter(config);
    console.log('🔄 Starting continuous recruitment loop (hourly)...');
    while (true) {
      await recruiter.runCycle();
      const waitMs = config.cooldownMs;
      console.log(`\n⏱️  Next cycle in ${Math.round(waitMs / 60000)} minutes...\n`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  });

program.parseAsync(process.argv).catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
