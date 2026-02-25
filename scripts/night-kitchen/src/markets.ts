/**
 * markets.ts — fetch live market data from baozi via MCP
 *
 * uses @baozi.bet/mcp-server (69 tools) via stdio JSON-RPC.
 * tools used: list_markets, list_race_markets
 */

import { spawn, type ChildProcess } from "child_process";
import * as readline from "readline";

export interface BooleanMarket {
  type: "boolean";
  publicKey: string;
  marketId: number;
  question: string;
  yesPrice: number;
  noPrice: number;
  poolSol: number;
  closingTime: string;
  eventTime: string;
  resolved: boolean;
  status: string;
  outcome?: string;
  category?: string;
}

export interface RaceMarket {
  type: "race";
  publicKey: string;
  question: string;
  options: Array<{ name: string; probability: number }>;
  poolSol: number;
  closingTime: string;
  eventTime: string;
  resolved: boolean;
  outcome?: string;
  category?: string;
}

export type Market = BooleanMarket | RaceMarket;

let mcpProcess: ChildProcess | null = null;

function inferCategory(question: string): string {
  const q = question.toLowerCase();
  if (/btc|eth|sol|crypto|token|defi|nft/.test(q)) return "crypto";
  if (/nba|nfl|mlb|sports|game|match|team|mvp/.test(q)) return "sports";
  if (/election|president|vote|congress/.test(q)) return "elections";
  if (/weather|temperature|rain|snow/.test(q)) return "weather";
  return "general";
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

interface McpMessage {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  result?: unknown;
  error?: { code: number; message: string };
}

async function callMcpTool(
  proc: ChildProcess,
  rl: readline.Interface,
  id: number,
  tool: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`MCP tool ${tool} timed out`)), 15000);

    const handler = (line: string) => {
      try {
        const msg = JSON.parse(line) as McpMessage;
        if (msg.id === id) {
          clearTimeout(timeout);
          rl.off("line", handler);
          if (msg.error) {
            reject(new Error(`MCP error: ${msg.error.message}`));
          } else {
            resolve(msg.result);
          }
        }
      } catch {
        // ignore non-JSON lines
      }
    };

    rl.on("line", handler);

    const request = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name: tool, arguments: args },
    });

    proc.stdin!.write(request + "\n");
  });
}

async function initMcp(): Promise<{ proc: ChildProcess; rl: readline.Interface }> {
  const proc = spawn("npx", ["@baozi.bet/mcp-server@latest"], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
  });

  mcpProcess = proc;

  const rl = readline.createInterface({ input: proc.stdout! });

  // wait for ready signal or just proceed after initialize
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => resolve(), 5000); // proceed after 5s regardless
    const handler = (line: string) => {
      try {
        const msg = JSON.parse(line) as McpMessage;
        if (msg.id === 1) {
          clearTimeout(timeout);
          rl.off("line", handler);
          resolve();
        }
      } catch {
        // ignore
      }
    };
    rl.on("line", handler);

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    // send initialize
    proc.stdin!.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "night-kitchen", version: "1.0.0" },
        },
      }) + "\n"
    );
  });

  // send initialized notification
  proc.stdin!.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n"
  );

  return { proc, rl };
}

function parseBooleanMarket(m: Record<string, unknown>): BooleanMarket {
  // MCP fields: yesPercent (0-100), noPercent (0-100), totalPoolSol, closingTime, status, winningOutcome
  const yesPercent = Number(m.yesPercent ?? m.yes_pool_sol ?? m.yes_pool ?? 50);
  const noPercent = Number(m.noPercent ?? m.no_pool_sol ?? m.no_pool ?? 50);
  const yesPrice = round4(yesPercent / 100);
  const noPrice = round4(noPercent / 100);
  const poolSol = round4(Number(m.totalPoolSol ?? m.pool_sol ?? 0));
  const status = String(m.status ?? "active").toLowerCase();
  const resolved = status === "resolved" || m.winningOutcome != null;

  return {
    type: "boolean",
    publicKey: String(m.publicKey ?? m.pubkey ?? ""),
    marketId: Number(m.marketId ?? m.market_id ?? 0),
    question: String(m.question ?? ""),
    yesPrice,
    noPrice,
    poolSol,
    closingTime: String(m.closingTime ?? m.closing_time ?? ""),
    eventTime: String(m.eventTime ?? m.event_time ?? m.closingTime ?? ""),
    resolved,
    status,
    outcome: m.winningOutcome ? String(m.winningOutcome) : undefined,
    category: String(m.category ?? inferCategory(String(m.question ?? ""))),
  };
}

function parseRaceMarket(m: Record<string, unknown>): RaceMarket {
  const rawOptions = (m.options as Array<Record<string, unknown>>) ?? [];
  const options = rawOptions.map((o) => ({
    name: String(o.name ?? o.label ?? ""),
    probability: round4(Number(o.probability ?? o.pct ?? o.odds ?? 0)),
  }));

  const status = String(m.status ?? "active");

  return {
    type: "race",
    publicKey: String(m.pubkey ?? m.public_key ?? m.id ?? ""),
    question: String(m.question ?? m.title ?? ""),
    options,
    poolSol: round4(Number(m.pool_sol ?? 0)),
    closingTime: String(m.closing_time ?? m.close_time ?? ""),
    eventTime: String(m.event_time ?? m.resolution_time ?? ""),
    resolved: status === "resolved",
    outcome: m.outcome ? String(m.outcome) : undefined,
    category: String(m.category ?? inferCategory(String(m.question ?? ""))),
  };
}

function parseToolResult(result: unknown): Market[] {
  const markets: Market[] = [];

  // MCP returns { content: [{ type: "text", text: "..." }] }
  const content = (result as { content?: Array<{ type: string; text?: string }> })?.content ?? [];

  for (const item of content) {
    if (item.type !== "text" || !item.text) continue;

    let data: unknown;
    try {
      data = JSON.parse(item.text);
    } catch {
      continue;
    }

    const items = Array.isArray(data) ? data : (data as { markets?: unknown[] })?.markets ?? [];

    for (const m of items as Record<string, unknown>[]) {
      if (!m || typeof m !== "object") continue;

      // detect race market by presence of options array
      if (Array.isArray(m.options) && m.options.length > 0) {
        markets.push(parseRaceMarket(m));
      } else {
        markets.push(parseBooleanMarket(m));
      }
    }
  }

  return markets;
}

export async function fetchMarkets(): Promise<Market[]> {
  let proc: ChildProcess | undefined;
  let rl: readline.Interface | undefined;

  try {
    ({ proc, rl } = await initMcp());

    const booleanResult = await callMcpTool(proc, rl, 2, "list_markets", {});
    const booleanMarkets = parseToolResult(booleanResult);

    let raceMarkets: Market[] = [];
    try {
      const raceResult = await callMcpTool(proc, rl, 3, "list_race_markets", {});
      raceMarkets = parseToolResult(raceResult);
    } catch (err) {
      console.error("race markets fetch failed (ok):", err instanceof Error ? err.message : err);
    }

    return [...booleanMarkets, ...raceMarkets];
  } catch (err) {
    console.error("MCP fetch failed:", err instanceof Error ? err.message : err);
    return [];
  } finally {
    rl?.close();
    if (proc) {
      proc.stdin?.end();
      proc.kill();
      mcpProcess = null;
    }
  }
}

export function closeMcp(): void {
  if (mcpProcess) {
    mcpProcess.stdin?.end();
    mcpProcess.kill();
    mcpProcess = null;
  }
}
