import { Hono } from "hono";
import { serve } from "bun";
import {
  addAgent, removeAgent, getAgents, refresh,
  getAgentStats, getAgentPositions, getLeaderboard,
  getMarkets, getAllMarkets, getSnapshot, resetTracker,
} from "./tracker";
import { renderDashboard } from "./dashboard";

const app = new Hono();

/** HTML Dashboard — auto-refreshes every 15s */
app.get("/", async (c) => {
  const snapshot = getSnapshot();
  const html = renderDashboard(snapshot);
  return c.html(html);
});

/** API: Service info */
app.get("/api", (c) => c.json({
  service: "agent-arena",
  version: "1.0.0",
  description: "Live AI betting competition dashboard — watch agents compete on Baozi prediction markets",
  endpoints: [
    "GET  /          — HTML dashboard (auto-refresh 15s)",
    "GET  /api       — service info",
    "GET  /api/arena — full arena snapshot (JSON)",
    "POST /api/agents — add agent to track",
    "GET  /api/agents — list tracked agents",
    "GET  /api/agents/:wallet — agent stats + positions",
    "DELETE /api/agents/:wallet — remove agent",
    "GET  /api/leaderboard — ranked leaderboard",
    "GET  /api/markets — markets with agent positions",
    "POST /api/refresh — force data refresh",
  ],
}));

/** Full arena snapshot */
app.get("/api/arena", (c) => {
  return c.json(getSnapshot());
});

/** Add agent to track */
app.post("/api/agents", async (c) => {
  const body = await c.req.json();
  const { wallet, name } = body;
  if (!wallet) return c.json({ error: "wallet is required" }, 400);
  const agent = addAgent(wallet, name);
  return c.json({ success: true, agent }, 201);
});

/** List tracked agents */
app.get("/api/agents", (c) => {
  const agents = getAgents();
  return c.json({ agents, count: agents.length });
});

/** Get agent details */
app.get("/api/agents/:wallet", (c) => {
  const wallet = c.req.param("wallet");
  const stats = getAgentStats(wallet);
  if (!stats) return c.json({ error: "Agent not found or no data yet. Add agent and refresh first." }, 404);
  const positions = getAgentPositions(wallet);
  return c.json({ stats, positions });
});

/** Remove agent */
app.delete("/api/agents/:wallet", (c) => {
  const wallet = c.req.param("wallet");
  const removed = removeAgent(wallet);
  if (!removed) return c.json({ error: "Agent not found" }, 404);
  return c.json({ success: true });
});

/** Leaderboard */
app.get("/api/leaderboard", (c) => {
  const leaderboard = getLeaderboard();
  return c.json({
    leaderboard: leaderboard.map((a, i) => ({ rank: i + 1, ...a })),
    total: leaderboard.length,
  });
});

/** Markets with agent positions */
app.get("/api/markets", (c) => {
  const markets = getMarkets();
  return c.json({ markets, count: markets.length });
});

/** Force refresh */
app.post("/api/refresh", async (c) => {
  const before = Date.now();
  await refresh();
  const elapsed = Date.now() - before;
  const snapshot = getSnapshot();
  return c.json({
    success: true,
    refresh_ms: elapsed,
    agents: snapshot.total_agents,
    markets: snapshot.total_active_markets,
  });
});

export { app, resetTracker };
export default app;

const PORT = parseInt(process.env.PORT ?? "3043");
if (import.meta.main) {
  console.log(`\n  Agent Arena running on http://localhost:${PORT}\n`);
  console.log("  Open in browser for live dashboard\n");
  serve({ fetch: app.fetch, port: PORT });
}
