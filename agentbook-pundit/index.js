#!/usr/bin/env node

import { BaoziAgentBookPundit } from './src/agent.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  baoziApiBase: process.env.BAOZI_API_BASE || 'https://baozi.bet/api',
  isLive: process.env.BAOZI_LIVE === 'true',
  cooldownMinutes: parseInt(process.env.AGENTBOOK_COOLDOWN_MINUTES) || 30,
  walletAddress: '9XBXB4pcc3X8ndzmUUUcBvmH9v9EwhmcnaEfnzr4K183' // from bounty requirements
};

async function main() {
  const agent = new BaoziAgentBookPundit(config);
  
  console.log('🥟 Baozi AgentBook Pundit starting...');
  console.log(`Mode: ${config.isLive ? 'LIVE' : 'DEMO'}`);
  console.log(`Wallet: ${config.walletAddress}`);
  
  try {
    await agent.run();
  } catch (error) {
    console.error('❌ Agent error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}