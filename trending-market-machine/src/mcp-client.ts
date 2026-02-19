/**
 * MCP Client wrapper
 * Executes @baozi.bet/mcp-server tools via subprocess or direct HTTP
 *
 * The MCP server provides 68 tools for interacting with Baozi on-chain.
 * This module wraps the key ones we need for market creation.
 */

import { spawn } from "node:child_process";

interface McpResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute an MCP tool via the @baozi.bet/mcp-server
 *
 * Uses JSON-RPC over stdio to communicate with the MCP server process.
 */
export async function execMcpTool(
  toolName: string,
  params: Record<string, unknown>
): Promise<McpResult> {
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
        // MCP server reads these from env
        SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "",
        SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY || "",
      },
      timeout: 60000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    // Send the JSON-RPC request after a brief initialization delay
    setTimeout(() => {
      // First, initialize the MCP connection
      const initRequest = JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "trending-market-machine", version: "1.0.0" },
        },
      });

      proc.stdin.write(initRequest + "\n");

      // Then send the tool call
      setTimeout(() => {
        proc.stdin.write(jsonRpcRequest + "\n");
        proc.stdin.end();
      }, 1000);
    }, 2000);

    proc.on("close", (code) => {
      if (code !== 0 && !stdout) {
        resolve({
          success: false,
          error: `MCP process exited with code ${code}: ${stderr}`,
        });
        return;
      }

      try {
        // Parse JSON-RPC responses (may have multiple, take the last tool response)
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

        // If no matching response found, try parsing entire stdout
        const parsed = JSON.parse(stdout);
        if (parsed.error) {
          resolve({ success: false, error: parsed.error.message || JSON.stringify(parsed.error) });
        } else {
          resolve({ success: true, data: parsed.result || parsed });
        }
      } catch {
        resolve({
          success: false,
          error: `Failed to parse MCP response: ${stdout.slice(0, 500)}`,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        error: `Failed to spawn MCP process: ${err.message}`,
      });
    });
  });
}

/**
 * Alternative: call MCP tools via HTTP if an MCP proxy is running
 */
export async function execMcpToolHttp(
  toolName: string,
  params: Record<string, unknown>,
  mcpProxyUrl = "http://localhost:3000"
): Promise<McpResult> {
  try {
    const resp = await fetch(`${mcpProxyUrl}/tools/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: toolName,
        arguments: params,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { success: false, error: `MCP HTTP ${resp.status}: ${text}` };
    }

    const data = await resp.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: `MCP HTTP error: ${err}` };
  }
}
