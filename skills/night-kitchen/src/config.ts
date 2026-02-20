import dotenv from 'dotenv';
dotenv.config();

export const config = {
  baoziApiUrl: process.env.BAOZI_API_URL || 'https://baozi.bet/api',
  walletAddress: process.env.WALLET_ADDRESS || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  affiliateCode: process.env.AFFILIATE_CODE || '',
  agentbookEnabled: process.env.AGENTBOOK_ENABLED !== 'false',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  pollIntervalSec: parseInt(process.env.POLL_INTERVAL_SEC || '60', 10),
};
