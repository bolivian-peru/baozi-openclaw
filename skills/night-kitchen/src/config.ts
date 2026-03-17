export const CONFIG = {
  apiUrl: process.env.BAOZI_API_URL || 'https://baozi.bet/api',
  walletAddress: process.env.WALLET_ADDRESS || '',
  reportDir: process.env.REPORT_DIR || './reports',
  maxMarkets: 10,
  resolvedLimit: 3,
};
