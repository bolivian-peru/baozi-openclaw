import { describe, it, expect, beforeEach } from "bun:test";
import { app, resetDb } from "./server";

const BASE = "http://localhost";

function req(method: string, path: string, body?: any) {
  return app.request(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => resetDb());

describe("Health", () => {
  it("GET / returns service info", async () => {
    const res = await req("GET", "/");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.service).toBe("calls-tracker");
    expect(data.endpoints.length).toBeGreaterThan(0);
  });
});

describe("POST /calls", () => {
  it("registers a prediction call", async () => {
    const res = await req("POST", "/calls", {
      caller_name: "CryptoGuru",
      caller_wallet: "F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt",
      prediction: "BTC will hit $120k by March 15, 2026",
      bet_amount: 0.5,
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.call.caller_name).toBe("CryptoGuru");
    expect(data.call.status).toBe("active");
    expect(data.market_pda).toBeTruthy();
    expect(data.share_card_url).toBeTruthy();
    expect(data.mcp_tools_used).toContain("build_create_lab_market_transaction");
  });

  it("rejects missing fields", async () => {
    const res = await req("POST", "/calls", { caller_name: "X" });
    expect(res.status).toBe(400);
  });

  it("rejects too-short prediction", async () => {
    const res = await req("POST", "/calls", {
      caller_name: "X",
      caller_wallet: "F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt",
      prediction: "hi",
    });
    expect(res.status).toBe(400);
  });

  it("auto-detects data source for crypto", async () => {
    const res = await req("POST", "/calls", {
      caller_name: "Analyst",
      caller_wallet: "F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt",
      prediction: "ETH will reach $5000 by end of March 2026",
    });
    const data = await res.json() as any;
    expect(data.call.data_source).toContain("CoinGecko");
  });

  it("defaults to Yes side", async () => {
    const res = await req("POST", "/calls", {
      caller_name: "Caller",
      caller_wallet: "F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt",
      prediction: "SOL will exceed $300 by end of 2026",
    });
    const data = await res.json() as any;
    expect(data.call.side).toBe("Yes");
  });
});

describe("POST /calls/social", () => {
  it("parses a social media post", async () => {
    const res = await req("POST", "/calls/social", {
      raw_text: "@CryptoKing BTC to $150k by March 2026! 🚀🔥 #bitcoin #crypto",
      caller_wallet: "F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt",
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.source_handle).toBe("CryptoKing");
    expect(data.clean_prediction).not.toContain("🚀");
    expect(data.clean_prediction).not.toContain("#");
  });

  it("rejects empty social post", async () => {
    const res = await req("POST", "/calls/social", {
      raw_text: "🚀🔥 #wow",
      caller_wallet: "abc",
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /calls", () => {
  it("lists all calls", async () => {
    await req("POST", "/calls", {
      caller_name: "A", caller_wallet: "w1",
      prediction: "BTC will hit $100k by end of March 2026",
    });
    await req("POST", "/calls", {
      caller_name: "B", caller_wallet: "w2",
      prediction: "ETH will reach $6000 by end of March 2026",
    });
    const res = await req("GET", "/calls");
    const data = await res.json() as any;
    expect(data.count).toBe(2);
  });

  it("filters by caller", async () => {
    await req("POST", "/calls", {
      caller_name: "Alice", caller_wallet: "w1",
      prediction: "BTC will hit $100k by end of March 2026",
    });
    await req("POST", "/calls", {
      caller_name: "Bob", caller_wallet: "w2",
      prediction: "ETH will reach $5000 by end of March 2026",
    });
    const res = await req("GET", "/calls?caller=Alice");
    const data = await res.json() as any;
    expect(data.count).toBe(1);
    expect(data.calls[0].caller_name).toBe("Alice");
  });

  it("filters by status", async () => {
    await req("POST", "/calls", {
      caller_name: "X", caller_wallet: "w",
      prediction: "SOL will hit $500 by end of 2026",
    });
    const res = await req("GET", "/calls?status=active");
    const data = await res.json() as any;
    expect(data.count).toBe(1);
  });
});

describe("GET /calls/:id", () => {
  it("returns call with activity log", async () => {
    const create = await req("POST", "/calls", {
      caller_name: "Test", caller_wallet: "w",
      prediction: "BTC will hit $200k by end of 2026",
    });
    const { call } = await create.json() as any;
    const res = await req("GET", `/calls/${call.id}`);
    const data = await res.json() as any;
    expect(data.call.id).toBe(call.id);
    expect(data.activity_log.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 404 for missing call", async () => {
    const res = await req("GET", "/calls/999");
    expect(res.status).toBe(404);
  });
});

describe("POST /calls/:id/resolve", () => {
  it("resolves a call as win", async () => {
    const create = await req("POST", "/calls", {
      caller_name: "Winner", caller_wallet: "w",
      prediction: "BTC will hit $100k by end of March 2026",
    });
    const { call } = await create.json() as any;

    const res = await req("POST", `/calls/${call.id}/resolve`, { outcome: "win" });
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.call.status).toBe("resolved");
    expect(data.call.outcome).toBe("win");
    expect(data.caller_stats).toBeTruthy();
    expect(data.caller_stats.hit_rate).toBe(1);
  });

  it("resolves a call as loss", async () => {
    const create = await req("POST", "/calls", {
      caller_name: "Loser", caller_wallet: "w",
      prediction: "SOL will hit $1000 by end of March 2026",
    });
    const { call } = await create.json() as any;
    const res = await req("POST", `/calls/${call.id}/resolve`, { outcome: "loss" });
    const data = await res.json() as any;
    expect(data.call.outcome).toBe("loss");
    expect(data.caller_stats.hit_rate).toBe(0);
  });

  it("rejects invalid outcome", async () => {
    const create = await req("POST", "/calls", {
      caller_name: "X", caller_wallet: "w",
      prediction: "BTC will hit $100k by end of March 2026",
    });
    const { call } = await create.json() as any;
    const res = await req("POST", `/calls/${call.id}/resolve`, { outcome: "maybe" });
    expect(res.status).toBe(400);
  });

  it("rejects resolving a non-active call", async () => {
    const create = await req("POST", "/calls", {
      caller_name: "X", caller_wallet: "w",
      prediction: "ETH will reach $10000 by end of 2026",
    });
    const { call } = await create.json() as any;
    // Resolve once
    await req("POST", `/calls/${call.id}/resolve`, { outcome: "win" });
    // Try again
    const res = await req("POST", `/calls/${call.id}/resolve`, { outcome: "loss" });
    expect(res.status).toBe(400);
  });
});

describe("GET /callers", () => {
  it("lists callers with stats", async () => {
    await req("POST", "/calls", {
      caller_name: "Alpha", caller_wallet: "w1",
      prediction: "BTC will hit $100k by end of March 2026",
    });
    await req("POST", "/calls", {
      caller_name: "Beta", caller_wallet: "w2",
      prediction: "ETH will hit $5000 by end of March 2026",
    });
    const res = await req("GET", "/callers");
    const data = await res.json() as any;
    expect(data.count).toBe(2);
  });
});

describe("GET /callers/:name", () => {
  it("returns caller reputation + calls", async () => {
    await req("POST", "/calls", {
      caller_name: "ProTrader", caller_wallet: "w1",
      prediction: "BTC will hit $100k by end of March 2026", bet_amount: 1.0,
    });
    const res = await req("GET", "/callers/ProTrader");
    const data = await res.json() as any;
    expect(data.stats.caller_name).toBe("ProTrader");
    expect(data.stats.total_calls).toBe(1);
    expect(data.stats.tier).toBe("newcomer");
    expect(data.calls.length).toBe(1);
  });

  it("returns 404 for unknown caller", async () => {
    const res = await req("GET", "/callers/nobody");
    expect(res.status).toBe(404);
  });
});

describe("Reputation scoring", () => {
  it("calculates tier progression", async () => {
    // Create 5 calls for one caller, resolve all as wins
    for (let i = 0; i < 5; i++) {
      await req("POST", "/calls", {
        caller_name: "Champ",
        caller_wallet: "w",
        prediction: `Prediction ${i}: BTC hits $${100 + i}k by end of 2026`,
        bet_amount: 0.5,
      });
    }

    // Get all calls and resolve them as wins
    const listRes = await req("GET", "/calls?caller=Champ");
    const { calls } = await listRes.json() as any;
    for (const call of calls) {
      await req("POST", `/calls/${call.id}/resolve`, { outcome: "win" });
    }

    const statsRes = await req("GET", "/callers/Champ");
    const { stats } = await statsRes.json() as any;
    expect(stats.hit_rate).toBe(1);
    expect(stats.current_streak).toBe(5);
    expect(stats.best_streak).toBe(5);
    expect(stats.confidence_score).toBeGreaterThan(40);
    // With 5 wins, should be at least "analyst" tier
    expect(["analyst", "oracle", "legend"]).toContain(stats.tier);
  });

  it("tracks streak correctly with mixed results", async () => {
    // Win, Loss, Win, Win
    const names = ["w1", "w2", "w3", "w4"];
    const outcomes = ["win", "loss", "win", "win"];

    for (let i = 0; i < 4; i++) {
      const cr = await req("POST", "/calls", {
        caller_name: "Mixed",
        caller_wallet: "w",
        prediction: `Call ${i}: BTC hits $${100 + i}k by end of 2026`,
      });
      const { call } = await cr.json() as any;
      await req("POST", `/calls/${call.id}/resolve`, { outcome: outcomes[i] });
    }

    const res = await req("GET", "/callers/Mixed");
    const { stats } = await res.json() as any;
    expect(stats.current_streak).toBe(2); // last 2 are wins
    expect(stats.best_streak).toBe(2);
    expect(stats.hit_rate).toBe(0.75);
  });
});

describe("GET /leaderboard", () => {
  it("returns ranked leaderboard", async () => {
    // Create two callers with different records
    const c1 = await req("POST", "/calls", {
      caller_name: "GoodCaller", caller_wallet: "w1",
      prediction: "BTC hits $100k by end of March 2026",
    });
    const d1 = await c1.json() as any;
    await req("POST", `/calls/${d1.call.id}/resolve`, { outcome: "win" });

    const c2 = await req("POST", "/calls", {
      caller_name: "BadCaller", caller_wallet: "w2",
      prediction: "ETH hits $100k by end of March 2026",
    });
    const d2 = await c2.json() as any;
    await req("POST", `/calls/${d2.call.id}/resolve`, { outcome: "loss" });

    const res = await req("GET", "/leaderboard");
    const data = await res.json() as any;
    expect(data.leaderboard[0].caller_name).toBe("GoodCaller");
    expect(data.leaderboard[0].rank).toBe(1);
    expect(data.leaderboard[1].caller_name).toBe("BadCaller");
  });
});

describe("GET /dashboard", () => {
  it("returns aggregate stats", async () => {
    await req("POST", "/calls", {
      caller_name: "A", caller_wallet: "w", bet_amount: 1.5,
      prediction: "BTC hits $100k by end of March 2026",
    });
    await req("POST", "/calls", {
      caller_name: "B", caller_wallet: "w2", bet_amount: 0.5,
      prediction: "SOL hits $400 by end of March 2026",
    });

    const res = await req("GET", "/dashboard");
    const data = await res.json() as any;
    expect(data.total_calls).toBe(2);
    expect(data.total_callers).toBe(2);
    expect(data.total_sol_wagered).toBe(2);
  });
});

describe("POST /sync", () => {
  it("attempts to sync resolutions", async () => {
    await req("POST", "/calls", {
      caller_name: "Syncer", caller_wallet: "w",
      prediction: "BTC hits $100k by end of March 2026",
    });
    const res = await req("POST", "/sync");
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(typeof data.checked).toBe("number");
  });
});

describe("Pari-mutuel v6.3 timing rules", () => {
  it("validates Type A: close >= 24h before event", async () => {
    // Our parser auto-sets 25h gap, so standard calls should pass
    const res = await req("POST", "/calls", {
      caller_name: "Timer",
      caller_wallet: "w",
      prediction: "BTC will hit $100k by March 15, 2026",
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.call.market_type).toBe("A");
  });
});
