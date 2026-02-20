import { Bot } from 'grammy';
import { config, validateConfig } from './config';
import { BaoziClient, GroupStore, RoundupScheduler } from './services';
import {
  createMarketsHandler,
  createOddsHandler,
  createHotHandler,
  createClosingHandler,
  createHelpHandler,
  createSetupHandler,
  createSubscribeHandler,
  createUnsubscribeHandler,
  createStatusHandler,
  createCallbackHandlers,
} from './commands';

async function main() {
  console.log('🎰 Starting Baozi Telegram Feed Bot...');

  // Validate configuration
  validateConfig();

  // Initialize services
  const bot = new Bot(config.telegramToken);
  const baoziClient = new BaoziClient();
  const groupStore = new GroupStore();
  const roundupScheduler = new RoundupScheduler(bot, baoziClient, groupStore);

  // Register commands
  bot.command('start', createHelpHandler());
  bot.command('help', createHelpHandler());
  bot.command('markets', createMarketsHandler(baoziClient));
  bot.command('odds', createOddsHandler(baoziClient));
  bot.command('hot', createHotHandler(baoziClient));
  bot.command('closing', createClosingHandler(baoziClient));
  bot.command('setup', createSetupHandler(groupStore, roundupScheduler));
  bot.command('subscribe', createSubscribeHandler(groupStore, roundupScheduler));
  bot.command('unsubscribe', createUnsubscribeHandler(groupStore, roundupScheduler));
  bot.command('status', createStatusHandler(groupStore));

  // Register callback query handler for inline keyboards
  bot.on('callback_query:data', createCallbackHandlers(baoziClient));

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  // Start roundup schedules
  roundupScheduler.startAll();

  // Start polling
  console.log('🤖 Bot is running! Press Ctrl+C to stop.');
  await bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot started as @${botInfo.username}`);
    },
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
