import { Hono } from "hono";
import { serve } from "bun";
import {
  createCall, getCall, listCalls, activateCall, resolveCall,
  getCallerStats, getLeaderboard, getActivityLog, getDashboard, resetDb,
} from "./db";
import { parsePrediction, parseSocialPost } from "./parser";
import { validateTiming, createLabMarket, placeBet, generateShareCard, checkResolution } from "./market";
import type { Outcome } from "./types";

const app = new Hono();

/** Health check */
app.get("/", (c) => c.json({
  service: "calls-tracker",
  version: "1.0.0",
  description: "Influencer prediction reputation system — track calls, create markets, build public scoreboard",
  endpoints: [
    "POST /calls — register a new prediction",
    "POST /calls/social — register from social media post",
    "GET  /calls — list all calls",
    "GET  /calls/:id — get call details + activity log",
    "POST /calls/:id/activate — create market on-chain (MCP)",
    "POST /calls/:id/resolve — resolve call outcome",
    "GET  /callers — list all callers with reputation",
    "GET  /callers/:name — get caller reputation",
    "GET  /leaderboard — reputation leaderboard",
    "GET  /dashboard — aggregate stats",
    "POST /sync — sync resolutions from on-chain",
  ],
}));

/**
 * POST /calls — Register a new prediction call
 * Body: { caller_name, caller_wallet, prediction, bet_amount?, side? }
 */
app.post("/calls", async (c) => {
  const body = await c.req.json();
  const { caller_name, caller_wallet, prediction, bet_amount, side } = body;

  if (!caller_name || !caller_wallet || !prediction) {
    return c.json({ error: "Missing required fields: caller_name, caller_wallet, prediction" }, 400);
  }

  // Parse prediction text
  const parsed = parsePrediction(prediction);
  if (!parsed) {
    return c.json({ error: "Could not parse prediction into a valid market. Prediction must be at least 10 chars with a clear statement." }, 400);
  }

  // Validate timing rules v6.3
  const timing = validateTiming(parsed);
  if (!timing.valid) {
    return c.json({ error: `Timing validation failed: ${timing.error}` }, 400);
  }

  // Create call in DB
  const call = createCall({
    caller_name,
    caller_wallet,
    prediction_text: prediction,
    market_question: parsed.question,
    market_type: parsed.market_type,
    close_time: parsed.close_time.toISOString(),
    event_time: parsed.event_time?.toISOString() ?? null,
    measurement_start: parsed.measurement_start?.toISOString() ?? null,
    data_source: parsed.data_source,
    resolution_criteria: parsed.resolution_criteria,
    bet_amount: bet_amount ?? 0.1,
    side: side ?? "Yes",
  });

  // Auto-activate: create market + bet + share card via MCP
  const market = await createLabMarket(parsed, caller_wallet);
  const shareCard = await generateShareCard(market.market_pda, caller_wallet);
  const activated = activateCall(call.id, market.market_pda, shareCard);

  // Place caller's own bet
  await placeBet(market.market_pda, caller_wallet, bet_amount ?? 0.1, side ?? "Yes");

  return c.json({
    success: true,
    call: activated ?? call,
    market_pda: market.market_pda,
    share_card_url: shareCard,
    mcp_tools_used: [
      "build_create_lab_market_transaction",
      "build_bet_transaction",
      "generate_share_card",
    ],
  }, 201);
});

/**
 * POST /calls/social — Register from a social media post
 * Body: { raw_text, caller_name?, caller_wallet, bet_amount? }
 */
app.post("/calls/social", async (c) => {
  const body = await c.req.json();
  const { raw_text, caller_name, caller_wallet, bet_amount } = body;

  if (!raw_text || !caller_wallet) {
    return c.json({ error: "Missing required fields: raw_text, caller_wallet" }, 400);
  }

  // Parse social post → clean prediction
  const { prediction, source_handle } = parseSocialPost(raw_text);
  const name = caller_name ?? source_handle ?? "anonymous";

  if (prediction.length < 10) {
    return c.json({ error: "Could not extract meaningful prediction from social post" }, 400);
  }

  // Parse prediction
  const parsed = parsePrediction(prediction);
  if (!parsed) {
    return c.json({ error: "Could not parse extracted prediction into a valid market" }, 400);
  }

  const timing = validateTiming(parsed);
  if (!timing.valid) {
    return c.json({ error: `Timing validation failed: ${timing.error}` }, 400);
  }

  const call = createCall({
    caller_name: name,
    caller_wallet,
    prediction_text: raw_text,
    market_question: parsed.question,
    market_type: parsed.market_type,
    close_time: parsed.close_time.toISOString(),
    event_time: parsed.event_time?.toISOString() ?? null,
    measurement_start: parsed.measurement_start?.toISOString() ?? null,
    data_source: parsed.data_source,
    resolution_criteria: parsed.resolution_criteria,
    bet_amount: bet_amount ?? 0.1,
  });

  // Auto-activate
  const market = await createLabMarket(parsed, caller_wallet);
  const shareCard = await generateShareCard(market.market_pda, caller_wallet);
  activateCall(call.id, market.market_pda, shareCard);

  await placeBet(market.market_pda, caller_wallet, bet_amount ?? 0.1, "Yes");

  return c.json({
    success: true,
    call: getCall(call.id),
    parsed_from: raw_text,
    clean_prediction: prediction,
    source_handle,
    share_card_url: shareCard,
  }, 201);
});

/** GET /calls — List all calls */
app.get("/calls", (c) => {
  const caller = c.req.query("caller");
  const status = c.req.query("status");
  const wallet = c.req.query("wallet");
  const calls = listCalls({ caller: caller ?? undefined, status: status ?? undefined, wallet: wallet ?? undefined });
  return c.json({ calls, count: calls.length });
});

/** GET /calls/:id — Get call details with activity log */
app.get("/calls/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "Invalid call ID" }, 400);
  const call = getCall(id);
  if (!call) return c.json({ error: "Call not found" }, 404);
  const log = getActivityLog(id);
  return c.json({ call, activity_log: log });
});

/** POST /calls/:id/activate — Manually activate (create market on-chain) */
app.post("/calls/:id/activate", async (c) => {
  const id = parseInt(c.req.param("id"));
  const call = getCall(id);
  if (!call) return c.json({ error: "Call not found" }, 404);
  if (call.status !== "pending") return c.json({ error: `Call is already ${call.status}` }, 400);

  const parsed = parsePrediction(call.prediction_text);
  if (!parsed) return c.json({ error: "Could not re-parse prediction" }, 500);

  const market = await createLabMarket(parsed, call.caller_wallet);
  const shareCard = await generateShareCard(market.market_pda, call.caller_wallet);
  const updated = activateCall(id, market.market_pda, shareCard);

  await placeBet(market.market_pda, call.caller_wallet, call.bet_amount, call.side);

  return c.json({ success: true, call: updated, market_pda: market.market_pda, share_card_url: shareCard });
});

/** POST /calls/:id/resolve — Resolve a call */
app.post("/calls/:id/resolve", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  const { outcome } = body;

  if (!outcome || !["win", "loss", "void"].includes(outcome)) {
    return c.json({ error: "outcome must be 'win', 'loss', or 'void'" }, 400);
  }

  const call = getCall(id);
  if (!call) return c.json({ error: "Call not found" }, 404);
  if (call.status !== "active") return c.json({ error: `Call must be active to resolve (current: ${call.status})` }, 400);

  const updated = resolveCall(id, outcome as Outcome);
  const stats = getCallerStats(call.caller_name);

  return c.json({ success: true, call: updated, caller_stats: stats });
});

/** GET /callers — List all callers with stats */
app.get("/callers", (c) => {
  const leaderboard = getLeaderboard();
  return c.json({ callers: leaderboard, count: leaderboard.length });
});

/** GET /callers/:name — Get caller reputation */
app.get("/callers/:name", (c) => {
  const name = decodeURIComponent(c.req.param("name"));
  const stats = getCallerStats(name);
  if (!stats) return c.json({ error: "Caller not found" }, 404);
  const calls = listCalls({ caller: name });
  return c.json({ stats, calls });
});

/** GET /leaderboard — Reputation leaderboard */
app.get("/leaderboard", (c) => {
  const leaderboard = getLeaderboard();
  return c.json({
    leaderboard: leaderboard.map((s, i) => ({
      rank: i + 1,
      ...s,
    })),
    total_callers: leaderboard.length,
  });
});

/** GET /dashboard — Aggregate stats */
app.get("/dashboard", (c) => {
  const stats = getDashboard();
  const leaderboard = getLeaderboard();
  return c.json({
    ...stats,
    leaderboard_top3: leaderboard.slice(0, 3).map((s, i) => ({
      rank: i + 1,
      caller: s.caller_name,
      tier: s.tier,
      hit_rate: s.hit_rate,
      confidence: s.confidence_score,
    })),
  });
});

/** POST /sync — Sync resolutions from on-chain */
app.post("/sync", async (c) => {
  const activeCalls = listCalls({ status: "active" });
  let synced = 0;

  for (const call of activeCalls) {
    if (!call.market_pda) continue;
    const resolution = await checkResolution(call.market_pda);
    if (resolution?.resolved && resolution.outcome) {
      const outcome = resolution.outcome === call.side ? "win" : "loss";
      resolveCall(call.id, outcome);
      synced++;
    }
  }

  return c.json({ success: true, synced, checked: activeCalls.length });
});

export { app, resetDb };
export default app;

// Start server if run directly
const PORT = parseInt(process.env.PORT ?? "3042");
if (import.meta.main) {
  console.log(`\n  Calls Tracker running on http://localhost:${PORT}\n`);
  serve({ fetch: app.fetch, port: PORT });
}
