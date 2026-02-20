import { MarketDetector, Market } from './detector';
import { ShareCardGenerator } from './generator';
import { AgentBookDistributor } from './distributor';
import * as dotenv from 'dotenv';
dotenv.config();

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Configuration
const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '5rYvEjeWp9v68uDq3zL3CxyqZJd3fW1BhwHZZoMExKTo';
const AGENT_PROFILE = process.env.AGENT_PROFILE || '5rYvEjeWp9v68uDq3zL3CxyqZJd3fW1BhwHZZoMExKTo';
const REF_CODE = process.env.REF_CODE || 'VIRALAGENT';
const DRY_RUN = process.env.DRY_RUN !== 'false';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const detector = new MarketDetector();
const distributor = new AgentBookDistributor(AGENT_PROFILE);

let mcpClient: Client | null = null;
let generator: ShareCardGenerator | null = null;

async function setupMCP() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@baozi.bet/mcp-server'],
    env: { ...(process.env as Record<string, string>), SOLANA_RPC_URL: RPC_URL }
  });

  const client = new Client({ name: 'ShareCardEngine', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

async function fetchMarkets(): Promise<Market[]> {
  try {
    const res = await mcpClient!.callTool({
      name: 'list_markets',
      arguments: { status: 'active', limit: 50 }
    }) as any;

    const content = res.content?.[0]?.text;
    if (!content) return [];

    const data = JSON.parse(content);
    if (!data.success || !data.markets) return [];

    const markets: Market[] = data.markets.map((m: any) => ({
      pda: m.publicKey,
      question: m.question,
      status: m.status.toLowerCase(),
      closingTime: new Date(m.closingTime).getTime() / 1000,
      poolSize: m.totalPoolSol,
      yesOdds: m.yesPercent,
      noOdds: m.noPercent,
      layer: m.layer.toLowerCase()
    }));

    return markets;
  } catch (e) {
    console.error(`[Error] Failed to fetch markets from MCP:`, e);
    return [];
  }
}

async function runTick() {
  console.log(`\n--- Tick: ${new Date().toISOString()} ---`);

  const markets = await fetchMarkets();
  console.log(`Fetched ${markets.length} active markets via MCP.`);

  if (markets.length === 0) return;

  const events = detector.processMarkets(markets);

  if (events.length === 0) {
    console.log(`No notable events detected this cycle.`);
    return;
  }

  console.log(`Detected ${events.length} notable events! Processing...`);

  for (const event of events) {
    console.log(`\n>>> Processing Event: [${event.type}] on ${event.market.pda}`);

    // Generate the Share Card and Caption via MCP
    const { imageUrl, caption } = await generator!.generateCard(event);

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

  console.log(`Connecting to @baozi.bet/mcp-server...`);
  mcpClient = await setupMCP();
  console.log(`Connected!`);

  generator = new ShareCardGenerator(mcpClient, WALLET_ADDRESS, REF_CODE);

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
