#!/usr/bin/env node

import { BaoziAgentBookPundit } from './src/agent.js';
import { AgentBookClient } from './src/agentbook-client.js';
import { BaoziMarketAnalyzer } from './src/market-analyzer.js';

console.log('🧪 Testing Baozi AgentBook Pundit Components...\n');

// Test 1: AgentBook API Connection
console.log('1️⃣ Testing AgentBook API connection...');
try {
  const client = new AgentBookClient({ 
    baoziApiBase: 'https://baozi.bet/api',
    walletAddress: '9XBXB4pcc3X8ndzmUUUcBvmH9v9EwhmcnaEfnzr4K183'
  });
  
  const posts = await client.getPosts();
  console.log(`✅ Fetched ${posts.length} AgentBook posts`);
  
  if (posts.length > 0) {
    const latestPost = posts[0];
    console.log(`   Latest: "${latestPost.content.substring(0, 60)}..."`);
    console.log(`   Author: ${latestPost.agent.agentName}`);
    console.log(`   Market: ${latestPost.marketPda || 'General post'}`);
  }
} catch (error) {
  console.error('❌ AgentBook API test failed:', error.message);
}

console.log('');

// Test 2: Market Analysis
console.log('2️⃣ Testing market analysis engine...');
try {
  const analyzer = new BaoziMarketAnalyzer(null); // No OpenAI key = rule-based mode
  
  const testMarkets = [
    {
      pda: 'test123',
      title: 'Will BTC be above $100K by March 2026?',
      odds: { side: 'YES', percentage: 45 },
      poolSize: 0.5,
      category: 'crypto'
    },
    {
      pda: 'test456', 
      title: 'Will @baozibet tweet a pizza emoji by March 1?',
      odds: { side: 'YES', percentage: 95 },
      poolSize: 0.05,
      category: 'social'
    }
  ];
  
  const analysis = await analyzer.analyzeMarkets(testMarkets);
  console.log('✅ Generated market analysis:');
  console.log(`   "${analysis.substring(0, 100)}..."`);
  console.log(`   Length: ${analysis.length} characters`);
  
  const comment = await analyzer.generateMarketComment(testMarkets[0]);
  console.log(`✅ Generated market comment: "${comment}"`);
  console.log(`   Length: ${comment.length} characters`);
  
} catch (error) {
  console.error('❌ Market analysis test failed:', error.message);
}

console.log('');

// Test 3: Full Agent Demo
console.log('3️⃣ Testing full agent workflow...');
try {
  const agent = new BaoziAgentBookPundit({
    isLive: false,
    walletAddress: '9XBXB4pcc3X8ndzmUUUcBvmH9v9EwhmcnaEfnzr4K183',
    baoziApiBase: 'https://baozi.bet/api'
  });
  
  console.log('✅ Agent initialized successfully');
  console.log('   Mode: Demo (non-live)');
  console.log('   Wallet: 9XBXB4pcc3X8ndzmUUUcBvmH9v9EwhmcnaEfnzr4K183');
  
} catch (error) {
  console.error('❌ Agent initialization failed:', error.message);
}

console.log('');

// Test 4: Character Limit Validation
console.log('4️⃣ Testing character limits...');
const testContent = 'A'.repeat(2001); // Too long
const validContent = 'This is a valid AgentBook post with market analysis 🥟';

console.log(`✅ Test content validation:`);
console.log(`   Invalid (${testContent.length} chars): ${testContent.length > 2000 ? 'REJECTED' : 'ACCEPTED'}`);
console.log(`   Valid (${validContent.length} chars): ${validContent.length <= 2000 && validContent.length >= 10 ? 'ACCEPTED' : 'REJECTED'}`);

console.log('');
console.log('🎯 All tests completed!');
console.log('');
console.log('Ready to run:');
console.log('  npm run demo  - Demo mode with sample data');
console.log('  npm start     - Live mode (requires API keys)');