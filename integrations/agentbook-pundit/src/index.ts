import dotenv from 'dotenv';
import cron from 'node-cron';
import { BaoziClient, Market, RaceMarket } from './baozi';
import axios from 'axios';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

dotenv.config();

const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const client = new BaoziClient();
let keypair: Keypair | null = null;

if (PRIVATE_KEY) {
  try {
    keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    console.log(`Agent initialized with wallet: ${keypair.publicKey.toBase58()}`);
  } catch (err) {
    console.error('Invalid PRIVATE_KEY in .env');
  }
}

async function generateAnalysis(markets: (Market | RaceMarket)[], type: 'AgentBook' | 'Comment'): Promise<string> {
  const activeMarkets = markets.filter(m => m.status === 'Active');
  
  if (activeMarkets.length === 0) return "Markets are quiet today. Checking back later!";

  // Top 5 by volume
  const topMarkets = [...activeMarkets].sort((a, b) => b.totalPoolSol - a.totalPoolSol).slice(0, 5);
  // Closing soon (within 24h)
  const now = new Date();
  const closingSoon = activeMarkets.filter(m => {
    const hoursLeft = (m.closingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft < 24;
  }).slice(0, 3);

  const marketData = topMarkets.map(m => {
    if ('outcomes' in m) {
      return `- [Race] ${m.question} (Pool: ${m.totalPoolSol} SOL)`;
    } else {
      return `- [Binary] ${m.question} (Yes: ${m.yesPercent}%, No: ${m.noPercent}%, Pool: ${m.totalPoolSol} SOL)`;
    }
  }).join('\n');

  const closingData = closingSoon.map(m => `- ${m.question} (Closes in ${Math.round((m.closingTime.getTime() - now.getTime()) / 3600000)}h)`).join('\n');

  const prompt = `You are an AI Market Analyst for Baozi.
Task: ${type === 'AgentBook' ? 'Generate a punchy market roundup for the AgentBook social feed.' : 'Generate a short analysis comment for a specific market.'}

Top Volume Markets:
${marketData}

Closing Soon:
${closingData}

Requirements:
- Short, professional, and slightly degen (Solana style).
- Focus on where the "edge" might be.
- Keep it under ${type === 'AgentBook' ? '280' : '100'} characters.
- Use emojis sparingly.

Take:`;

  if (!OPENAI_API_KEY) {
    const top = topMarkets[0];
    return `🔥 Top pool: "${top.question}" at ${top.totalPoolSol} SOL. Momentum is building!`;
  }

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150
    }, {
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
    });
    return response.data.choices[0].message.content.trim().replace(/^"|"$/g, '');
  } catch (err) {
    return `Volume is high on "${topMarkets[0].question}". Watch the odds shift!`;
  }
}

async function runPundit() {
  console.log(`[${new Date().toISOString()}] Running AgentBook Pundit...`);
  const markets = await client.getMarkets();
  if (markets.length === 0) {
    console.log('No markets found. Skipping.');
    return;
  }

  // 1. Post to AgentBook
  const agentBookTake = await generateAnalysis(markets, 'AgentBook');
  const wallet = WALLET_ADDRESS || (keypair ? keypair.publicKey.toBase58() : 'DEezNuts11111111111111111111111111111111');
  
  console.log('Post:', agentBookTake);
  const successPost = await client.postToAgentBook(wallet, agentBookTake);
  console.log('AgentBook post success:', successPost);

  // 2. Comment on a hot market (if keypair available)
  if (keypair) {
    const hotMarket = [...markets].sort((a, b) => b.totalPoolSol - a.totalPoolSol)[0];
    if (hotMarket) {
      const comment = await generateAnalysis([hotMarket], 'Comment');
      console.log(`Commenting on ${hotMarket.publicKey}: ${comment}`);
      const successComment = await client.postComment(hotMarket.publicKey, comment, keypair);
      console.log('Comment success:', successComment);
    }
  }
}

// Scheduling
// Morning: 10:00 (Market Roundup)
// Midday: 15:00 (Odds movement)
// Evening: 20:00 (Closing soon)
cron.schedule('0 10,15,20 * * *', () => {
  runPundit();
});

console.log('AgentBook Pundit started.');
runPundit();
