import { describe, it, expect, beforeEach } from "bun:test";
import { app, resetTracker } from "./server";

function req(method: string, path: string, body?: any) {
  return app.request(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => resetTracker());

describe("Health", () => {
  it("GET / returns HTML dashboard", async () => {
    const res = await req("GET", "/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Agent Arena");
    expect(html).toContain("Leaderboard");
    expect(html).toContain("meta http-equiv=\"refresh\"");
  });

  it("GET /api returns service info", async () => {
    const res = await req("GET", "/api");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.service).toBe("agent-arena");
    expect(data.endpoints.length).toBeGreaterThan(0);
  });
});

describe("POST /api/agents", () => {
  it("adds an agent to track", async () => {
    const res = await req("POST", "/api/agents", {
      wallet: "F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt",
      name: "CryptoOracle",
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.agent.name).toBe("CryptoOracle");
    expect(data.agent.wallet).toBe("F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt");
  });

  it("auto-generates name from wallet", async () => {
    const res = await req("POST", "/api/agents", {
      wallet: "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf",
    });
    const data = await res.json() as any;
    expect(data.agent.name).toBe("A6M8icBw...");
  });

  it("rejects missing wallet", async () => {
    const res = await req("POST", "/api/agents", { name: "test" });
    expect(res.status).toBe(400);
  });

  it("deduplicates agents", async () => {
    await req("POST", "/api/agents", { wallet: "abc123" });
    await req("POST", "/api/agents", { wallet: "abc123" });
    const list = await req("GET", "/api/agents");
    const data = await list.json() as any;
    expect(data.count).toBe(1);
  });
});

describe("GET /api/agents", () => {
  it("lists tracked agents", async () => {
    await req("POST", "/api/agents", { wallet: "w1", name: "Agent1" });
    await req("POST", "/api/agents", { wallet: "w2", name: "Agent2" });
    await req("POST", "/api/agents", { wallet: "w3", name: "Agent3" });
    const res = await req("GET", "/api/agents");
    const data = await res.json() as any;
    expect(data.count).toBe(3);
    expect(data.agents[0].name).toBe("Agent1");
  });
});

describe("DELETE /api/agents/:wallet", () => {
  it("removes an agent", async () => {
    await req("POST", "/api/agents", { wallet: "w1", name: "Agent1" });
    const res = await req("DELETE", "/api/agents/w1");
    expect(res.status).toBe(200);
    const list = await req("GET", "/api/agents");
    const data = await list.json() as any;
    expect(data.count).toBe(0);
  });

  it("returns 404 for unknown agent", async () => {
    const res = await req("DELETE", "/api/agents/unknown");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/agents/:wallet", () => {
  it("returns 404 for untracked agent", async () => {
    const res = await req("GET", "/api/agents/unknown");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/arena", () => {
  it("returns full arena snapshot", async () => {
    await req("POST", "/api/agents", { wallet: "w1", name: "A1" });
    await req("POST", "/api/agents", { wallet: "w2", name: "A2" });
    const res = await req("GET", "/api/arena");
    const data = await res.json() as any;
    expect(data.total_agents).toBe(2);
    expect(data.timestamp).toBeTruthy();
    expect(Array.isArray(data.agents)).toBe(true);
    expect(Array.isArray(data.markets)).toBe(true);
  });
});

describe("GET /api/leaderboard", () => {
  it("returns empty leaderboard", async () => {
    const res = await req("GET", "/api/leaderboard");
    const data = await res.json() as any;
    expect(data.total).toBe(0);
    expect(data.leaderboard).toEqual([]);
  });
});

describe("GET /api/markets", () => {
  it("returns markets list", async () => {
    const res = await req("GET", "/api/markets");
    const data = await res.json() as any;
    expect(Array.isArray(data.markets)).toBe(true);
  });
});

describe("POST /api/refresh", () => {
  it("triggers data refresh", async () => {
    await req("POST", "/api/agents", { wallet: "w1", name: "TestAgent" });
    const res = await req("POST", "/api/refresh");
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(typeof data.refresh_ms).toBe("number");
    expect(data.agents).toBe(1);
  });
});

describe("Dashboard HTML", () => {
  it("includes all key sections", async () => {
    await req("POST", "/api/agents", { wallet: "w1", name: "TestBot" });
    const res = await req("GET", "/");
    const html = await res.text();
    expect(html).toContain("Agent Arena");
    expect(html).toContain("Leaderboard");
    expect(html).toContain("Active Markets");
    expect(html).toContain("Auto-refresh");
    expect(html).toContain("baozi.bet");
  });

  it("shows agent count in stats bar", async () => {
    await req("POST", "/api/agents", { wallet: "w1", name: "A1" });
    await req("POST", "/api/agents", { wallet: "w2", name: "A2" });
    await req("POST", "/api/agents", { wallet: "w3", name: "A3" });
    const res = await req("GET", "/");
    const html = await res.text();
    expect(html).toContain(">3<");  // stat-value shows 3 agents
  });
});

describe("Full workflow", () => {
  it("add 3 agents → refresh → check leaderboard", async () => {
    // Add 3 agents
    await req("POST", "/api/agents", { wallet: "F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt", name: "Oracle" });
    await req("POST", "/api/agents", { wallet: "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf", name: "Analyst" });
    await req("POST", "/api/agents", { wallet: "75Hj7EUtHMBvnUL8XAbhRarSe387A2Dcp8VDhHsUmaty", name: "Trader" });

    // Refresh
    const refreshRes = await req("POST", "/api/refresh");
    const refreshData = await refreshRes.json() as any;
    expect(refreshData.success).toBe(true);
    expect(refreshData.agents).toBe(3);

    // Check arena
    const arenaRes = await req("GET", "/api/arena");
    const arena = await arenaRes.json() as any;
    expect(arena.total_agents).toBe(3);

    // Check leaderboard
    const lbRes = await req("GET", "/api/leaderboard");
    const lb = await lbRes.json() as any;
    expect(lb.total).toBe(3);

    // Check dashboard HTML
    const dashRes = await req("GET", "/");
    const html = await dashRes.text();
    expect(html).toContain("Oracle");
    expect(html).toContain("Analyst");
    expect(html).toContain("Trader");
  });
});
