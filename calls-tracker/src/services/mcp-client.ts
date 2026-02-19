/**
 * MCP Client for @baozi.bet/mcp-server
 * 
 * Executes MCP tools via JSON-RPC over stdio to interact with
 * the Baozi prediction market protocol on Solana.
 */
import { spawn } from "node:child_process";
import type { McpResult } from "../types/index.js";

const MCP_INIT_DELAY = 2000;
const MCP_CALL_DELAY = 1000;
const MCP_TIMEOUT = 60000;

/**
 * Execute an MCP tool via the @baozi.bet/mcp-server subprocess
 */
export async function execMcpTool(toolName: string, params: Record<string, any>): Promise<McpResult> {
  return new Promise((resolve) => {
    const jsonRpcRequest = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: params,
      },
    });

    const proc = spawn("npx", ["@baozi.bet/mcp-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "",
        SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY || "",
      },
      timeout: MCP_TIMEOUT,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    // Initialize MCP connection, then send tool call
    setTimeout(() => {
      const initRequest = JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "calls-tracker", version: "1.0.0" },
        },
      });
      proc.stdin.write(initRequest + "\n");

      setTimeout(() => {
        proc.stdin.write(jsonRpcRequest + "\n");
        proc.stdin.end();
      }, MCP_CALL_DELAY);
    }, MCP_INIT_DELAY);

    proc.on("close", (code) => {
      if (code !== 0 && !stdout) {
        resolve({ success: false, error: `MCP process exited with code ${code}: ${stderr}` });
        return;
      }

      try {
        const lines = stdout.split("\n").filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]);
            if (parsed.id === 1) {
              if (parsed.error) {
                resolve({ success: false, error: parsed.error.message || JSON.stringify(parsed.error) });
              } else {
                resolve({ success: true, data: parsed.result });
              }
              return;
            }
          } catch {
            continue;
          }
        }
        resolve({ success: false, error: `No matching response in MCP output` });
      } catch {
        resolve({ success: false, error: `Failed to parse MCP response: ${stdout.slice(0, 500)}` });
      }
    });

    proc.on("error", (err) => {
      resolve({ success: false, error: `Failed to spawn MCP: ${err.message}` });
    });
  });
}

/**
 * Execute MCP tool via HTTP proxy (alternative)
 */
export async function execMcpToolHttp(
  toolName: string,
  params: Record<string, any>,
  proxyUrl: string = "http://localhost:3000"
): Promise<McpResult> {
  try {
    const resp = await fetch(`${proxyUrl}/tools/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: toolName, arguments: params }),
    });
    if (!resp.ok) {
      return { success: false, error: `MCP HTTP ${resp.status}: ${await resp.text()}` };
    }
    return { success: true, data: await resp.json() };
  } catch (err) {
    return { success: false, error: `MCP HTTP error: ${err}` };
  }
}
