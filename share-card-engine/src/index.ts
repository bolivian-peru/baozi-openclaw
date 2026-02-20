import { MarketDetector, Market } from './detector';
import { ShareCardGenerator } from './generator';
import { AgentBookDistributor } from './distributor';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const PROGRAM_ID = new PublicKey('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
const MARKET_DISCRIMINATOR = Buffer.from([219, 190, 213, 55, 0, 227, 198, 154]);

// Configuration
const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds

// Using public env vars for the bounty demo to make it easy to run
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '5rYvEjeWp9v68uDq3zL3CxyqZJd3fW1BhwHZZoMExKTo';
const AGENT_PROFILE = process.env.AGENT_PROFILE || '5rYvEjeWp9v68uDq3zL3CxyqZJd3fW1BhwHZZoMExKTo';
const REF_CODE = process.env.REF_CODE || 'VIRALAGENT';
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to true for safety
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const detector = new MarketDetector();
const generator = new ShareCardGenerator(WALLET_ADDRESS, REF_CODE);
const distributor = new AgentBookDistributor(AGENT_PROFILE);
const connection = new Connection(RPC_URL, 'confirmed');

function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000;
}

async function fetchMarkets(): Promise<Market[]> {
  try {
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [{ memcmp: { offset: 0, bytes: bs58.encode(MARKET_DISCRIMINATOR) } }]
    });

    const markets: Market[] = [];
    for (const { pubkey, account } of accounts) {
      try {
        const data = account.data;
        let offset = 8 + 8; // skip discriminator and market id
        const questionLen = data.readUInt32LE(offset); offset += 4;
        const question = data.slice(offset, offset + questionLen).toString('utf8'); offset += questionLen;
        const closingTime = Number(data.readBigInt64LE(offset)); offset += 8 + 8 + 8; // closing, resolution, auto_stop
        const yesPool = data.readBigUInt64LE(offset); offset += 8;
        const noPool = data.readBigUInt64LE(offset); offset += 8 + 16; // pools + snapshot
        const statusCode = data.readUInt8(offset); offset += 1;
        const hasWinningOutcome = data.readUInt8(offset); offset += 1 + (hasWinningOutcome === 1 ? 1 : 0);
        offset += 1 + 33 + 8 + 8 + 8 + 8 + 1; // mapping fields
        const layerCode = data.readUInt8(offset);

        // Map status (0=Active, 1=Closed, 2=Resolved)
        const statusMap: Record<number, string> = { 0: 'active', 1: 'closed', 2: 'resolved' };
        const status = statusMap[statusCode] || 'active';

        // Map layer (0=official, 1=labs)
        const layer = layerCode === 0 ? 'official' : 'labs';
        const poolSize = lamportsToSol(yesPool + noPool);

        let yesOdds = 50;
        let noOdds = 50;
        if (poolSize > 0) {
          yesOdds = Math.round((lamportsToSol(yesPool) / poolSize) * 100);
          noOdds = Math.round((lamportsToSol(noPool) / poolSize) * 100);
        }

        markets.push({
          pda: pubkey.toBase58(),
          question,
          status: status as any,
          closingTime,
          poolSize,
          yesOdds,
          noOdds,
          layer
        });
      } catch (e) {
        // Skip malformed accounts
      }
    }
    return markets;
  } catch (e) {
    console.error(`[Error] Failed to fetch markets from RPC:`, e);
    return [];
  }
}

async function runTick() {
  console.log(`\n--- Tick: ${new Date().toISOString()} ---`);

  const markets = await fetchMarkets();
  console.log(`Fetched ${markets.length} active markets.`);

  if (markets.length === 0) return;

  const events = detector.processMarkets(markets);

  if (events.length === 0) {
    console.log(`No notable events detected this cycle.`);
    return;
  }

  console.log(`Detected ${events.length} notable events! Processing...`);

  for (const event of events) {
    console.log(`\n>>> Processing Event: [${event.type}] on ${event.market.pda}`);

    // Generate the Share Card and Caption
    const { imageUrl, caption } = await generator.generateCard(event);

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would post to AgentBook:`);
      console.log(`Image: ${imageUrl}`);
      console.log(`Caption:\n${caption}`);
    } else {
      // Actually post to AgentBook
      const success = await distributor.postToAgentBook(imageUrl, caption);

      if (success) {
        // Stop processing further events to respect the 30-minute AgentBook cooldown
        console.log(`[Cooldown] Sleeping post queue after successful broadcast.`);
        break;
      }
    }
  }
}

async function startEngine() {
  console.log(`🥟 Starting Share Card Viral Engine...`);
  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Ref Code: ${REF_CODE}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE POSTING'}`);

  // Run immediately on start to prime the cache
  await runTick();

  // Then poll every X seconds
  setInterval(runTick, POLL_INTERVAL_MS);
}

// Handle termination gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down engine...');
  process.exit(0);
});

startEngine();
