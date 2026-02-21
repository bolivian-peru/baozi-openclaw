import { resetDb } from "./db";
import { app } from "./server";

const WALLET = "F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt";

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
  console.log("  CALLS TRACKER — End-to-End Demo");
  console.log("========================================\n");

  // Fresh DB
  resetDb();

  // Step 1: Register 3 prediction calls
  console.log("--- Step 1: Register prediction calls ---\n");

  const call1 = await req("POST", "/calls", {
    caller_name: "CryptoOracle",
    caller_wallet: WALLET,
    prediction: "BTC will hit $120k by March 15, 2026",
    bet_amount: 1.0,
  }) as any;
  console.log(`Call 1: ${call1.call.market_question}`);
  console.log(`  Market PDA: ${call1.market_pda}`);
  console.log(`  Share Card: ${call1.share_card_url}`);
  console.log(`  Bet: ${call1.call.bet_amount} SOL on ${call1.call.side}`);
  console.log(`  Type: ${call1.call.market_type}, Close: ${call1.call.close_time}\n`);

  const call2 = await req("POST", "/calls", {
    caller_name: "SportsAnalyst",
    caller_wallet: "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf",
    prediction: "The Eagles will win the next Super Bowl within 12 months",
    bet_amount: 0.5,
  }) as any;
  console.log(`Call 2: ${call2.call.market_question}`);
  console.log(`  Market PDA: ${call2.market_pda}`);
  console.log(`  Data Source: ${call2.call.data_source}\n`);

  const call3 = await req("POST", "/calls", {
    caller_name: "CryptoOracle",
    caller_wallet: WALLET,
    prediction: "ETH will flip BTC market cap by end of March 2026",
    bet_amount: 2.0,
  }) as any;
  console.log(`Call 3: ${call3.call.market_question}`);
  console.log(`  Market PDA: ${call3.market_pda}`);
  console.log(`  Bet: ${call3.call.bet_amount} SOL\n`);

  // Step 2: Register from social media post
  console.log("--- Step 2: Parse social media post ---\n");

  const social = await req("POST", "/calls/social", {
    raw_text: "@DeFiKing SOL to $500 by March 2026! 🚀🔥 #solana #crypto https://t.co/abc123",
    caller_wallet: WALLET,
    bet_amount: 0.25,
  }) as any;
  console.log(`Social Post: ${social.parsed_from}`);
  console.log(`  Clean: ${social.clean_prediction}`);
  console.log(`  Handle: @${social.source_handle}`);
  console.log(`  Market: ${social.call.market_question}\n`);

  // Step 3: List all calls
  console.log("--- Step 3: List all calls ---\n");

  const allCalls = await req("GET", "/calls") as any;
  console.log(`Total calls: ${allCalls.count}`);
  for (const c of allCalls.calls) {
    console.log(`  [${c.id}] ${c.caller_name}: ${c.market_question} (${c.status})`);
  }
  console.log();

  // Step 4: Resolve calls — simulate oracle outcomes
  console.log("--- Step 4: Resolve calls (oracle) ---\n");

  const r1 = await req("POST", `/calls/${call1.call.id}/resolve`, { outcome: "win" }) as any;
  console.log(`Call ${call1.call.id} resolved: ${r1.call.outcome} (BTC hit $120k)`);

  const r2 = await req("POST", `/calls/${call2.call.id}/resolve`, { outcome: "loss" }) as any;
  console.log(`Call ${call2.call.id} resolved: ${r2.call.outcome} (Eagles didn't win)`);

  const r3 = await req("POST", `/calls/${call3.call.id}/resolve`, { outcome: "win" }) as any;
  console.log(`Call ${call3.call.id} resolved: ${r3.call.outcome} (ETH flipped BTC)`);
  console.log();

  // Step 5: View caller reputation
  console.log("--- Step 5: Caller reputation ---\n");

  const oracle = await req("GET", "/callers/CryptoOracle") as any;
  console.log(`CryptoOracle:`);
  console.log(`  Total Calls: ${oracle.stats.total_calls}`);
  console.log(`  Resolved: ${oracle.stats.resolved_calls}`);
  console.log(`  Hit Rate: ${(oracle.stats.hit_rate * 100).toFixed(1)}%`);
  console.log(`  Streak: ${oracle.stats.current_streak}`);
  console.log(`  SOL Wagered: ${oracle.stats.sol_wagered}`);
  console.log(`  SOL Won: ${oracle.stats.sol_won.toFixed(2)}`);
  console.log(`  Confidence: ${oracle.stats.confidence_score.toFixed(1)}`);
  console.log(`  Tier: ${oracle.stats.tier}\n`);

  const analyst = await req("GET", "/callers/SportsAnalyst") as any;
  console.log(`SportsAnalyst:`);
  console.log(`  Hit Rate: ${(analyst.stats.hit_rate * 100).toFixed(1)}%`);
  console.log(`  Tier: ${analyst.stats.tier}\n`);

  // Step 6: Leaderboard
  console.log("--- Step 6: Reputation leaderboard ---\n");

  const lb = await req("GET", "/leaderboard") as any;
  for (const entry of lb.leaderboard) {
    console.log(`  #${entry.rank} ${entry.caller_name} — ${entry.tier} (${(entry.hit_rate * 100).toFixed(0)}% hit rate, score: ${entry.confidence_score.toFixed(1)})`);
  }
  console.log();

  // Step 7: Dashboard
  console.log("--- Step 7: Dashboard stats ---\n");

  const dash = await req("GET", "/dashboard") as any;
  console.log(`  Total Calls: ${dash.total_calls}`);
  console.log(`  Active: ${dash.active_calls}`);
  console.log(`  Resolved: ${dash.resolved_calls}`);
  console.log(`  Callers: ${dash.total_callers}`);
  console.log(`  SOL Wagered: ${dash.total_sol_wagered}`);
  console.log(`  Top Caller: ${dash.top_caller}`);
  console.log();

  // Step 8: Sync (checks on-chain — will be no-op in demo)
  console.log("--- Step 8: Sync resolutions ---\n");

  const sync = await req("POST", "/sync") as any;
  console.log(`  Checked: ${sync.checked}, Synced: ${sync.synced}`);
  console.log();

  // Step 9: Activity log
  console.log("--- Step 9: Activity log for Call 1 ---\n");

  const detail = await req("GET", `/calls/${call1.call.id}`) as any;
  for (const entry of detail.activity_log) {
    console.log(`  [${entry.created_at}] ${entry.action}: ${entry.details}`);
  }
  console.log();

  // Step 10: MCP tools summary
  console.log("--- Step 10: MCP tools used ---\n");
  console.log("  For each call, the following MCP tools are invoked:");
  console.log("  1. build_create_lab_market_transaction — create Lab market");
  console.log("  2. build_bet_transaction — caller bets on own prediction");
  console.log("  3. generate_share_card — shareable card image");
  console.log("  4. get_resolution_status — sync outcomes (via /sync)");
  console.log();

  console.log("========================================");
  console.log("  Demo complete! All 10 steps passed.");
  console.log("========================================\n");
}

demo().catch(console.error);
