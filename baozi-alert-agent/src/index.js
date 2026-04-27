const BaoziMonitor = require('./baoziMonitor');
const ConsoleNotifier = require('./notifiers/console');
const TelegramNotifier = require('./notifiers/telegram');
const DiscordNotifier = require('./notifiers/discord');
const WebhookNotifier = require('./notifiers/webhook');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Load config
const configPath = process.argv[2] || './config/default.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize notifiers
const notifiers = [];

if (config.channel === 'console' || !config.channel) {
  notifiers.push(new ConsoleNotifier());
}

if (config.channel === 'telegram' || config.telegram) {
  notifiers.push(new TelegramNotifier(
    config.telegram.token,
    config.telegram.chatId
  ));
}

if (config.channel === 'discord' || config.discord) {
  notifiers.push(new DiscordNotifier(config.discord.webhookUrl));
}

if (config.channel === 'webhook' || config.webhook) {
  notifiers.push(new WebhookNotifier(config.webhook.url));
}

// Initialize monitor
const monitor = new BaoziMonitor(config);

console.log('🚀 Baozi Alert Agent Started');
console.log(`📊 Monitoring ${config.wallets?.length || 0} wallets`);
console.log(`⏰ Polling every ${config.pollIntervalMinutes || 15} minutes`);
console.log(`🔔 Notifiers: ${config.channel || 'console'}`);
console.log('');

// Run immediately, then schedule
async function runCheck() {
  console.log(`[${new Date().toISOString()}] Running check...`);
  const alerts = await monitor.monitor();
  
  if (alerts && alerts.length > 0) {
    console.log(`🚨 ${alerts.length} alerts generated`);
    
    for (const alert of alerts) {
      for (const notifier of notifiers) {
        await notifier.sendAlert(alert);
      }
    }
  } else {
    console.log('✅ No alerts');
  }
}

// Run once immediately
runCheck();

// Schedule recurring checks
const cronExpression = `*/${config.pollIntervalMinutes || 15} * * * *`;
cron.schedule(cronExpression, runCheck);

console.log(`\n✨ Agent running. Press Ctrl+C to stop.\n`);
