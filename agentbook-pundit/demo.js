#!/usr/bin/env node

import { BaoziAgentBookPundit } from './src/agent.js';

// Demo configuration (no real keys needed)
const demoConfig = {
  solanaPrivateKey: null, // Will run in demo mode
  openaiApiKey: null,     // Will use rule-based analysis
  baoziApiBase: 'https://baozi.bet/api',
  isLive: false,          // Demo mode
  cooldownMinutes: 30,
  walletAddress: '9XBXB4pcc3X8ndzmUUUcBvmH9v9EwhmcnaEfnzr4K183'
};

console.log('🥟 Baozi AgentBook Pundit - DEMO MODE');
console.log('=====================================');
console.log('');
console.log('This demo shows how the agent would:');
console.log('1. Fetch market data from AgentBook posts');
console.log('2. Analyze markets using rule-based logic');
console.log('3. Generate punchy market takes');
console.log('4. Comment on individual markets');
console.log('');
console.log('Running demo...');
console.log('');

const agent = new BaoziAgentBookPundit(demoConfig);

try {
  await agent.run();
  
  console.log('');
  console.log('✅ Demo completed successfully!');
  console.log('');
  console.log('To run with real API keys:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Add your SOLANA_PRIVATE_KEY and OPENAI_API_KEY');
  console.log('3. Set BAOZI_LIVE=true for live posting');
  console.log('4. Run: npm start');
  
} catch (error) {
  console.error('❌ Demo failed:', error);
  process.exit(1);
}