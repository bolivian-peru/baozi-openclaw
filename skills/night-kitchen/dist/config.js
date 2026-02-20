"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    baoziApiUrl: process.env.BAOZI_API_URL || 'https://baozi.bet/api',
    walletAddress: process.env.WALLET_ADDRESS || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    affiliateCode: process.env.AFFILIATE_CODE || '',
    agentbookEnabled: process.env.AGENTBOOK_ENABLED !== 'false',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    pollIntervalSec: parseInt(process.env.POLL_INTERVAL_SEC || '60', 10),
};
