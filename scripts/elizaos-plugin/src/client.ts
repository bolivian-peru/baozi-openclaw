/**
 * Baozi MCP Client — singleton that manages the MCP server process.
 * Spawns @baozi.bet/mcp-server and communicates via JSON-RPC over stdio.
 */

import { spawn, ChildProcess } from "child_process";

export interface MCPToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

class BaoziMCPClient {
  private proc: ChildProcess | null = null;
  private buffer = "";
  private pendingResolves: Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  > = new Map();
  private requestId = 0;
  private ready = false;
  private connectPromise: Promise<void> | null = null;

  async ensureConnected(): Promise<void> {
    if (this.ready) return;
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this.connect();
    return this.connectPromise;
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.proc = spawn("npx", ["@baozi.bet/mcp-server@latest"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          SOLANA_RPC_URL:
            process.env.SOLANA_RPC_URL ||
            "https://api.mainnet-beta.solana.com",
        },
      });

      this.proc.on("error", (err) => {
        reject(new Error(`Failed to start Baozi MCP server: ${err.message}`));
      });

      this.proc.stdout!.on("data", (data: Buffer) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.proc.stderr!.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg.toLowerCase().includes("error")) {
          console.error("[baozi-plugin] MCP stderr:", msg);
        }
      });

      // Initialize handshake
      this.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "eliza-plugin-baozi", version: "1.0.0" },
      })
        .then(() => {
          this.sendNotification("notifications/initialized", {});
          this.ready = true;
          resolve();
        })
        .catch(reject);
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as {
          id?: number;
          error?: unknown;
          result?: unknown;
        };
        if (msg.id !== undefined && this.pendingResolves.has(msg.id)) {
          const { resolve, reject } = this.pendingResolves.get(msg.id)!;
          this.pendingResolves.delete(msg.id);
          if (msg.error) {
            reject(new Error(JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      } catch {
        // Non-JSON line — ignore
      }
    }
  }

  private sendRequest(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.requestId++;
      const id = this.requestId;
      this.pendingResolves.set(id, { resolve, reject });

      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      this.proc!.stdin!.write(msg);

      setTimeout(() => {
        if (this.pendingResolves.has(id)) {
          this.pendingResolves.delete(id);
          reject(new Error(`Timeout waiting for MCP response to ${method}`));
        }
      }, 30000);
    });
  }

  private sendNotification(method: string, params: unknown): void {
    const msg = JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n";
    this.proc!.stdin!.write(msg);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    await this.ensureConnected();
    const result = (await this.sendRequest("tools/call", {
      name,
      arguments: args,
    })) as MCPToolResult;
    return result;
  }

  /**
   * Extract text content from a tool result.
   */
  extractText(result: MCPToolResult): string {
    return (result.content || [])
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join("\n");
  }

  close(): void {
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
      this.ready = false;
      this.connectPromise = null;
    }
  }
}

// Singleton instance shared across all actions
export const baoziClient = new BaoziMCPClient();
