import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  walletAddresses: string[];
  pollIntervalMinutes: number;
  alertWebhookUrl: string;
  solanaRpcUrl: string;
  winningsThreshold: number;
  oddsShiftThreshold: number;
  marketCloseThreshold: number;
}

const config: Config = {
  walletAddresses: process.env.WALLET_ADDRESSES ? process.env.WALLET_ADDRESSES.split(',') : [],
  pollIntervalMinutes: Number(process.env.POLL_INTERVAL_MINUTES) || 15,
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL || '',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  winningsThreshold: Number(process.env.WINNINGS_THRESHOLD) || 0,
  oddsShiftThreshold: Number(process.env.ODDS_SHIFT_THRESHOLD) || 5,
  marketCloseThreshold: Number(process.env.MARKET_CLOSE_THRESHOLD) || 60,
};

export default config;
