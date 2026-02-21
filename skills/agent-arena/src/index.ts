/**
 * Agent Arena — Entry Point
 *
 * Usage:
 *   node dist/index.js [--wallets w1,w2,w3] [--poll 20] [--refresh 30]
 *
 * Environment variables:
 *   SOLANA_RPC_URL        — Solana RPC endpoint (default: mainnet-beta public)
 *   AGENT_WALLETS         — Comma-separated wallet list (overrides config.ts defaults)
 *   POLL_INTERVAL_SECONDS — Agent poll interval in seconds (default: 20)
 *   MARKET_REFRESH_SECONDS — Market refresh interval in seconds (default: 30)
 */

import { McpClient } from './mcp-client';
import { MarketMonitor } from './market-monitor';
import { AgentTracker } from './agent-tracker';
import { Leaderboard } from './leaderboard';
import { Dashboard } from './dashboard';
import { ArenaState, MarketInfo } from './types';
import { config, applyCliArgs } from './config';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Parse CLI arguments before anything else
  applyCliArgs(process.argv.slice(2));

  printBanner();

  // ---- MCP client ----
  const client = new McpClient();
  console.log('[Arena] Starting MCP server...');
  await client.start();
  console.log('[Arena] MCP server ready.');

  // ---- Sub-systems ----
  const monitor = new MarketMonitor(client);
  const tracker = new AgentTracker(client, monitor);
  const leaderboard = new Leaderboard(tracker);
  const dashboard = new Dashboard();

  // ---- Initial state ----
  const state: ArenaState = {
    markets: [],
    agents: new Map(),
    leaderboard: [],
    lastMarketRefresh: new Date(0),
    lastAgentRefresh: new Date(0),
    cycleCount: 0,
  };

  // ---- Wire up odds-shift notifications ----
  monitor.onOddsShift((mkt, prev, next) => {
    const shift = ((next - prev) * 100).toFixed(1);
    const dir = next > prev ? 'up' : 'down';
    process.stderr.write(
      `[Odds Shift] "${mkt.question.slice(0, 50)}" YES: ${dir} ${shift}pp\n`,
    );
  });

  // ---- Start polling ----
  dashboard.init();
  monitor.start();
  tracker.start();

  // ---- Main render loop ----
  const renderInterval = setInterval(() => {
    state.markets = monitor.getMarkets();
    state.agents = buildAgentMap(tracker);
    state.lastMarketRefresh = new Date();
    state.lastAgentRefresh = new Date();
    state.cycleCount++;
    leaderboard.refresh();
    state.leaderboard = leaderboard.getEntries();
    dashboard.render(state);
  }, Math.min(config.pollIntervalMs, config.marketRefreshMs));

  // ---- Graceful shutdown ----
  function shutdown(signal: string): void {
    console.log(`\n[Arena] Received ${signal} — shutting down...`);
    clearInterval(renderInterval);
    monitor.stop();
    tracker.stop();
    dashboard.destroy();
    client.stop().finally(() => {
      console.log('[Arena] Goodbye.');
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep the process alive
  console.log('[Arena] Dashboard running. Press Ctrl+C to exit.\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAgentMap(tracker: AgentTracker): Map<string, import('./types').AgentStats> {
  const map = new Map<string, import('./types').AgentStats>();
  for (const agent of tracker.getAllAgents()) {
    map.set(agent.wallet, agent);
  }
  return map;
}

function printBanner(): void {
  const lines = [
    '',
    '  ╔══════════════════════════════════════════════════════╗',
    '  ║           AGENT ARENA — Baozi.bet Edition           ║',
    '  ║     AI Agent Prediction Market Competition          ║',
    '  ╚══════════════════════════════════════════════════════╝',
    '',
    `  Tracking ${config.agentWallets.length} agent wallet(s)`,
    `  Poll interval: ${config.pollIntervalMs / 1000}s`,
    `  Market refresh: ${config.marketRefreshMs / 1000}s`,
    `  RPC: ${config.rpcEndpoint}`,
    '',
  ];
  console.log(lines.join('\n'));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[Arena] Fatal error:', message);
  process.exit(1);
});
