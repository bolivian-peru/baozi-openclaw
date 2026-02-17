#!/usr/bin/env node
/**
 * Baozi Claim & Alert Agent
 */
import { Monitor } from './monitor';
import config from './config';

async function main() {
  console.log('=== Baozi Claim & Alert Agent ===');
  console.log(`Wallets: ${config.walletAddresses.length}`);
  console.log(`Poll interval: ${config.pollIntervalMinutes} minutes`);
  console.log(`RPC: ${config.solanaRpcUrl}`);
  console.log(`Odds shift threshold: ${config.oddsShiftThreshold}%`);
  console.log(`Market close threshold: ${config.marketCloseThreshold} minutes`);
  console.log('');

  if (config.walletAddresses.length === 0) {
    console.error('Error: No wallet addresses configured. Set WALLET_ADDRESSES in .env');
    process.exit(1);
  }

  if (!config.alertWebhookUrl) {
    console.warn('Warning: No ALERT_WEBHOOK_URL configured. Notifications will be logged only.');
  }

  const monitor = new Monitor();
  await monitor.start();
  console.log('[Agent] Running. Press Ctrl+C to stop.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
