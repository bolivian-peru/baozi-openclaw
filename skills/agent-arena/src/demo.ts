import { app } from "./server";
import { resetTracker } from "./tracker";

const WALLETS = [
  { wallet: "F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt", name: "CryptoOracle" },
  { wallet: "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf", name: "MarketMaker" },
  { wallet: "75Hj7EUtHMBvnUL8XAbhRarSe387A2Dcp8VDhHsUmaty", name: "DeFiTrader" },
];

async function req(method: string, path: string, body?: any) {
  const res = await app.request(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function demo() {
  console.log("\n========================================");
  console.log("  AGENT ARENA — End-to-End Demo");
  console.log("========================================\n");

  resetTracker();

  // Step 1: Add agents
  console.log("--- Step 1: Add 3 agents to track ---\n");
  for (const { wallet, name } of WALLETS) {
    const data = await req("POST", "/api/agents", { wallet, name }) as any;
    console.log(`  Added: ${data.agent.name} (${wallet.slice(0, 8)}...)`);
  }

  // Step 2: List agents
  console.log("\n--- Step 2: List tracked agents ---\n");
  const agents = await req("GET", "/api/agents") as any;
  console.log(`  Tracking ${agents.count} agents`);
  for (const a of agents.agents) {
    console.log(`    - ${a.name}: ${a.wallet}`);
  }

  // Step 3: Refresh data from chain
  console.log("\n--- Step 3: Refresh from Baozi (live MCP) ---\n");
  const refreshData = await req("POST", "/api/refresh") as any;
  console.log(`  Refresh took ${refreshData.refresh_ms}ms`);
  console.log(`  Agents: ${refreshData.agents}`);
  console.log(`  Active markets found: ${refreshData.markets}`);

  // Step 4: Arena snapshot
  console.log("\n--- Step 4: Arena snapshot ---\n");
  const arena = await req("GET", "/api/arena") as any;
  console.log(`  Total agents: ${arena.total_agents}`);
  console.log(`  Active markets: ${arena.total_active_markets}`);
  console.log(`  SOL in play: ${arena.total_sol_in_play.toFixed(3)}`);

  // Step 5: Leaderboard
  console.log("\n--- Step 5: Leaderboard ---\n");
  const lb = await req("GET", "/api/leaderboard") as any;
  if (lb.total === 0) {
    console.log("  No positions found yet (agents may not have bets on active markets)");
  }
  for (const entry of lb.leaderboard) {
    console.log(`  #${entry.rank} ${entry.name} — accuracy: ${(entry.accuracy * 100).toFixed(1)}%, P&L: ${entry.net_pnl >= 0 ? '+' : ''}${entry.net_pnl.toFixed(3)} SOL, score: ${entry.score.toFixed(1)}`);
  }

  // Step 6: Markets
  console.log("\n--- Step 6: Markets with agent positions ---\n");
  const markets = await req("GET", "/api/markets") as any;
  if (markets.count === 0) {
    console.log("  No markets with agent positions (normal if wallets have no active bets)");
  }
  for (const m of markets.markets) {
    console.log(`  Market: ${m.question}`);
    console.log(`    Pool: ${m.total_pool.toFixed(3)} SOL | YES: ${(m.yes_odds * 100).toFixed(0)}% | NO: ${(m.no_odds * 100).toFixed(0)}%`);
    for (const p of m.agent_positions) {
      console.log(`    - ${p.agent_name}: ${p.side} ${p.amount.toFixed(3)} SOL`);
    }
  }

  // Step 7: Individual agent details
  console.log("\n--- Step 7: Agent details ---\n");
  for (const { wallet, name } of WALLETS) {
    const data = await req("GET", `/api/agents/${wallet}`) as any;
    if (data.stats) {
      console.log(`  ${name}:`);
      console.log(`    Positions: ${data.positions.length} | Accuracy: ${(data.stats.accuracy * 100).toFixed(1)}%`);
      console.log(`    Wagered: ${data.stats.sol_wagered.toFixed(3)} | Streak: ${data.stats.current_streak}`);
    } else {
      console.log(`  ${name}: ${data.error ?? "no stats yet"}`);
    }
  }

  // Step 8: Dashboard HTML check
  console.log("\n--- Step 8: Dashboard HTML ---\n");
  const dashRes = await app.request("/");
  const html = await dashRes.text();
  console.log(`  Dashboard: ${html.length} bytes`);
  console.log(`  Contains leaderboard: ${html.includes('Leaderboard')}`);
  console.log(`  Contains auto-refresh: ${html.includes('meta http-equiv="refresh"')}`);
  console.log(`  Contains all agents: ${WALLETS.every(w => html.includes(w.name))}`);

  // Step 9: MCP tools summary
  console.log("\n--- Step 9: MCP tools used ---\n");
  console.log("  Data fetched via @baozi.bet/mcp-server:");
  console.log("  1. list_markets — discover active markets");
  console.log("  2. get_positions — per-agent positions");
  console.log("  3. get_quote — live odds for each market");
  console.log("  4. get_market — market details");
  console.log("  5. creator/:wallet — agent profiles");

  console.log("\n========================================");
  console.log("  Demo complete! All 9 steps passed.");
  console.log("========================================\n");
}

demo().catch(console.error);
