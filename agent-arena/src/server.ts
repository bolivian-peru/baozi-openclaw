/**
 * Agent Arena — Express API Server
 *
 * Serves the dashboard frontend and provides API endpoints
 * for real-time agent tracking on Baozi prediction markets.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  getArenaSnapshot,
  getAgentStats,
  listMarkets,
  getMarket,
  getQuote,
  listRaceMarkets,
  fetchAgentProfile,
  buildLeaderboard,
} from './baozi-client.js';

import type { AgentConfig, ArenaSnapshot } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Default agent wallets to track ───────────────────────────────────────
// No hardcoded wallets — configure via AGENT_WALLETS env variable.
// Example: AGENT_WALLETS=wallet1,wallet2,wallet3

const DEFAULT_AGENTS: AgentConfig[] = [];

function loadAgents(): AgentConfig[] {
  const envWallets = process.env.AGENT_WALLETS;
  if (!envWallets) return DEFAULT_AGENTS;

  const wallets = envWallets.split(',').map(w => w.trim()).filter(Boolean);
  const agents: AgentConfig[] = wallets.map((wallet, i) => ({
    wallet,
    name: `Agent ${i + 1}`,
    emoji: ['🤖', '🧠', '🎯', '🔮', '🦾', '🎲', '💡', '⚡'][i % 8],
  }));

  return agents.length > 0 ? agents : DEFAULT_AGENTS;
}

// ── Cache for arena snapshots ────────────────────────────────────────────

let cachedSnapshot: ArenaSnapshot | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds (accounts for sequential RPC fetching)

async function getCachedSnapshot(agents: AgentConfig[]): Promise<ArenaSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  cachedSnapshot = await getArenaSnapshot(agents);
  lastFetchTime = now;
  return cachedSnapshot;
}

// ── Express app ──────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

const agents = loadAgents();
console.log(`[Arena] Tracking ${agents.length} agents:`);
agents.forEach(a => console.log(`  ${a.emoji} ${a.name}: ${a.wallet}`));

// ── API Routes ───────────────────────────────────────────────────────────

// Full arena snapshot (main endpoint)
app.get('/api/arena', async (_req, res) => {
  try {
    const snapshot = await getCachedSnapshot(agents);
    res.json({ success: true, data: snapshot });
  } catch (error) {
    console.error('[API] /api/arena error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch arena data' });
  }
});

// Agent stats for a specific wallet
app.get('/api/agent/:wallet', async (req, res) => {
  try {
    const wallet = req.params.wallet;
    const agent = agents.find(a => a.wallet === wallet) || {
      wallet,
      name: wallet.slice(0, 8) + '...',
      emoji: '🤖',
    };
    const stats = await getAgentStats(agent);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error(`[API] /api/agent error:`, error);
    res.status(500).json({ success: false, error: 'Failed to fetch agent data' });
  }
});

// List all markets
app.get('/api/markets', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const markets = await listMarkets(status);
    res.json({ success: true, data: { count: markets.length, markets } });
  } catch (error) {
    console.error('[API] /api/markets error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch markets' });
  }
});

// Get specific market
app.get('/api/market/:pda', async (req, res) => {
  try {
    const market = await getMarket(req.params.pda);
    if (!market) return res.status(404).json({ success: false, error: 'Market not found' });
    res.json({ success: true, data: market });
  } catch (error) {
    console.error('[API] /api/market error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch market' });
  }
});

// Get quote
app.get('/api/quote', async (req, res) => {
  try {
    const { market, side, amount } = req.query;
    if (!market || !side || !amount) {
      return res.status(400).json({ success: false, error: 'market, side, and amount are required' });
    }
    const quote = await getQuote(
      market as string,
      side as 'Yes' | 'No',
      parseFloat(amount as string)
    );
    res.json({ success: true, data: quote });
  } catch (error) {
    console.error('[API] /api/quote error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quote' });
  }
});

// Race markets
app.get('/api/race-markets', async (_req, res) => {
  try {
    const markets = await listRaceMarkets();
    res.json({ success: true, data: { count: markets.length, markets } });
  } catch (error) {
    console.error('[API] /api/race-markets error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch race markets' });
  }
});

// Leaderboard (from cached snapshot)
app.get('/api/leaderboard', async (_req, res) => {
  try {
    const snapshot = await getCachedSnapshot(agents);
    res.json({ success: true, data: snapshot.leaderboard });
  } catch (error) {
    console.error('[API] /api/leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// Agent profile lookup
app.get('/api/profile/:wallet', async (req, res) => {
  try {
    const profile = await fetchAgentProfile(req.params.wallet);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Tracked agents list
app.get('/api/agents', (_req, res) => {
  res.json({ success: true, data: agents });
});

// Add agent dynamically
app.post('/api/agents', (req, res) => {
  const { wallet, name, emoji } = req.body;
  if (!wallet) return res.status(400).json({ success: false, error: 'wallet is required' });

  const existing = agents.find(a => a.wallet === wallet);
  if (existing) return res.json({ success: true, data: existing, message: 'Agent already tracked' });

  const agent: AgentConfig = {
    wallet,
    name: name || wallet.slice(0, 8) + '...',
    emoji: emoji || '🤖',
  };
  agents.push(agent);
  cachedSnapshot = null; // invalidate cache

  console.log(`[Arena] Added agent: ${agent.emoji} ${agent.name} (${agent.wallet})`);
  res.json({ success: true, data: agent });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    agents: agents.length,
    cached: !!cachedSnapshot,
    cacheAge: cachedSnapshot ? Date.now() - lastFetchTime : null,
    uptime: process.uptime(),
  });
});

// ── Start server ─────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log(`\n🏟️  Agent Arena — Live AI Betting Competition Dashboard`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   API:       http://localhost:${PORT}/api/arena`);
  console.log(`   Health:    http://localhost:${PORT}/api/health`);
  console.log(`\n   Tracking ${agents.length} agents on Baozi mainnet\n`);
});

export { app };
