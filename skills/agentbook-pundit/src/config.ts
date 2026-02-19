import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Wallet
  walletAddress: process.env.WALLET_ADDRESS || '',
  privateKey: process.env.PRIVATE_KEY || '',

  // Baozi API
  apiUrl: process.env.BAOZI_API_URL || 'https://baozi.bet/api',
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',

  // Affiliate (1% lifetime commission on referred volume)
  affiliateCode: process.env.AFFILIATE_CODE || '',
  affiliateQueryParam: process.env.AFFILIATE_QUERY_PARAM || 'ref',

  // Posting schedule
  postIntervalMinutes: parseInt(process.env.POST_INTERVAL_MINUTES || '360', 10), // 6 hours default
  commentIntervalMinutes: parseInt(process.env.COMMENT_INTERVAL_MINUTES || '120', 10), // 2 hours

  // Analysis
  maxPostLength: 2000,
  minPostLength: 10,
  maxCommentLength: 500,
  minCommentLength: 10,
};
