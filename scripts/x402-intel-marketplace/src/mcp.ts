/**
 * MCP client for @baozi.bet/mcp-server
 * Uses stdio JSON-RPC to get real market data from Baozi mainnet
 */

import { spawn } from "child_process";

interface McpResponse {
  id: number;
  result?: { content: Array<{ type: string; text: string }> };
  error?: { code: number; message: string };
}

interface Market {
  publicKey: string;
  question: string;
  outcomes: string[];
  status: string;
  volume?: number;
  closingTime?: number;
}

let mcpProcess: ReturnType<typeof spawn> | null = null;
let msgId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let buffer = "";

function startMcp(): ReturnType<typeof spawn> {
  const proc = spawn("npx", ["@baozi.bet/mcp-server@latest"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production" },
  });

  proc.stdout?.setEncoding("utf8");
  proc.stdout?.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg: McpResponse = JSON.parse(line);
        const handler = pending.get(msg.id);
        if (handler) {
          pending.delete(msg.id);
          if (msg.error) handler.reject(new Error(msg.error.message));
          else handler.resolve(msg.result);
        }
      } catch {
        // non-JSON output — skip
      }
    }
  });

  proc.on("error", () => {
    mcpProcess = null;
  });

  proc.on("close", () => {
    mcpProcess = null;
    for (const [, { reject }] of pending) {
      reject(new Error("MCP process closed"));
    }
    pending.clear();
  });

  return proc;
}

async function mcpCall(method: string, params: Record<string, unknown>): Promise<unknown> {
  if (!mcpProcess || mcpProcess.killed) {
    mcpProcess = startMcp();
    // Initialize handshake
    await sendRaw({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "x402-intel-marketplace", version: "1.0.0" } } });
  }

  return sendRaw({
    jsonrpc: "2.0",
    id: msgId++,
    method: "tools/call",
    params: { name: method, arguments: params },
  });
}

function sendRaw(msg: object): Promise<unknown> {
  const id = (msg as { id: number }).id;
  return new Promise((resolve, reject) => {
    if (id !== 0) pending.set(id, { resolve, reject });
    mcpProcess!.stdin?.write(JSON.stringify(msg) + "\n");
    if (id === 0) setTimeout(() => resolve(null), 500);
  });
}

function parseMarkets(raw: unknown): Market[] {
  try {
    const result = raw as { content: Array<{ text: string }> };
    const text = result?.content?.[0]?.text ?? "[]";
    const data = JSON.parse(text);
    const markets: Market[] = Array.isArray(data) ? data : data.markets ?? [];
    return markets.filter((m) => m.status !== "resolved").slice(0, 20);
  } catch {
    return [];
  }
}

export async function getActiveMarkets(): Promise<Market[]> {
  try {
    const result = await Promise.race([
      mcpCall("list_markets", { limit: 30 }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
    ]);
    return parseMarkets(result);
  } catch {
    // Return empty — caller should handle gracefully
    return [];
  }
}

export async function getMarket(pda: string): Promise<Market | null> {
  try {
    const result = await Promise.race([
      mcpCall("get_market", { marketPda: pda }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
    ]);
    const r = result as { content: Array<{ text: string }> };
    const text = r?.content?.[0]?.text ?? "{}";
    return JSON.parse(text) as Market;
  } catch {
    return null;
  }
}

export async function buildAffiliateTx(
  affiliateWallet: string,
  affiliateCode: string
): Promise<string> {
  try {
    const result = await Promise.race([
      mcpCall("build_register_affiliate_transaction", {
        affiliateWallet,
        affiliateCode,
      }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
    ]);
    const r = result as { content: Array<{ text: string }> };
    return r?.content?.[0]?.text ?? "";
  } catch {
    return "";
  }
}

export function formatAffiliateLink(marketPda: string, affiliateCode: string): string {
  return `https://baozi.bet/markets/${marketPda}?ref=${affiliateCode}`;
}

export function stopMcp(): void {
  mcpProcess?.kill();
  mcpProcess = null;
}
