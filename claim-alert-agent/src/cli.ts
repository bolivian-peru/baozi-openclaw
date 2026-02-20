#!/usr/bin/env node

/**
 * CLI for Baozi Claim & Alert Agent
 *
 * Commands:
 *   monitor  — Start the monitoring loop
 *   check    — Run a single check and exit
 *   init     — Generate a sample config file
 */

import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import chalk from 'chalk';
import { AgentConfig, DEFAULT_CONFIG } from './types/index.js';
import { BaoziClient } from './services/baozi-client.js';
import { Monitor } from './services/monitor.js';

const program = new Command();

program
  .name('claim-alert')
  .description('Baozi Claim & Alert Agent — Portfolio notifications for Solana prediction markets')
  .version('1.0.0');

program
  .command('monitor')
  .description('Start the monitoring loop')
  .option('-c, --config <path>', 'Config file path', './config.json')
  .option('-s, --state <path>', 'State file path', './data/state.json')
  .option('--dry-run', 'Detect alerts but don\'t send notifications')
  .option('--once', 'Run a single cycle and exit')
  .option('--interval <minutes>', 'Override poll interval in minutes')
  .action(async (opts) => {
    const config = await loadConfig(opts.config);
    if (!config) return;

    if (config.wallets.length === 0) {
      console.error(chalk.red('No wallets configured. Add wallets to your config file.'));
      process.exit(1);
    }

    const scriptsDir = '../scripts';
    const provider = new BaoziClient(scriptsDir, config.solanaRpcUrl);

    const monitor = new Monitor(config, provider, {
      once: opts.once,
      dryRun: opts.dryRun,
      statePath: opts.state,
      intervalMs: opts.interval ? parseInt(opts.interval) * 60 * 1000 : undefined,
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      monitor.stop();
    });
    process.on('SIGTERM', () => {
      monitor.stop();
    });

    await monitor.start();
  });

program
  .command('check')
  .description('Run a single check and display results')
  .option('-c, --config <path>', 'Config file path', './config.json')
  .option('-s, --state <path>', 'State file path', './data/state.json')
  .action(async (opts) => {
    const config = await loadConfig(opts.config);
    if (!config) return;

    const scriptsDir = '../scripts';
    const provider = new BaoziClient(scriptsDir, config.solanaRpcUrl);

    const monitor = new Monitor(config, provider, {
      once: true,
      dryRun: true,
      statePath: opts.state,
    });

    const result = await monitor.poll();

    console.log('');
    console.log(chalk.bold('Check Results:'));
    console.log(`  Alerts detected: ${result.alertsDetected}`);
    console.log(`  Time: ${result.timestamp}`);
  });

program
  .command('init')
  .description('Generate a sample config file')
  .option('-o, --output <path>', 'Output path', './config.json')
  .action(async (opts) => {
    const sampleConfig: AgentConfig = {
      ...DEFAULT_CONFIG,
      wallets: ['YOUR_SOLANA_WALLET_ADDRESS'],
      channels: [
        {
          type: 'webhook',
          url: 'https://your-webhook-url.example.com/alerts',
        },
      ],
      alerts: {
        ...DEFAULT_CONFIG.alerts,
        newMarkets: true,
        interestKeywords: ['BTC', 'ETH', 'SOL'],
      },
    };

    await writeFile(opts.output, JSON.stringify(sampleConfig, null, 2));
    console.log(chalk.green(`✓ Sample config written to ${opts.output}`));
    console.log(`  Edit the file and add your wallet address and notification channel.`);
  });

async function loadConfig(path: string): Promise<AgentConfig | null> {
  try {
    const raw = await readFile(path, 'utf-8');
    const config = JSON.parse(raw) as AgentConfig;

    // Apply defaults for missing fields
    return {
      ...DEFAULT_CONFIG,
      ...config,
      alerts: {
        ...DEFAULT_CONFIG.alerts,
        ...config.alerts,
      },
    };
  } catch (err) {
    console.error(chalk.red(`Failed to load config from ${path}: ${(err as Error).message}`));
    console.error(`Run ${chalk.cyan('claim-alert init')} to generate a sample config.`);
    return null;
  }
}

program.parse();
