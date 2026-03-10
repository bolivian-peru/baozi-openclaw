import { spawn } from "child_process";
import * as readline from "readline";

// Baozi MCP Client — wraps @baozi.bet/mcp-server stdio protocol
export class BaoziMCPClient {
  private proc: ReturnType<typeof spawn> | null = null;
  private rl: readline.Interface | null = null;
  private pendingResolvers = new Map<number, (v: any) => void>();
  private msgId = 1;

  async connect(): Promise<void> {
    this.proc = spawn("npx", ["-y", "@baozi.bet/mcp-server"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.rl = readline.createInterface({ input: this.proc.stdout! });
    this.rl.on("line", (line) => {
      try {
        const msg = JSON.parse(line);
        const resolver = this.pendingResolvers.get(msg.id);
        if (resolver) {
          resolver(msg);
          this.pendingResolvers.delete(msg.id);
        }
      } catch {}
    });

    await this.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "agent-recruiter", version: "2.0.0" },
    });
  }

  async send(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve) => {
      const id = this.msgId++;
      this.pendingResolvers.set(id, resolve);
      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      this.proc!.stdin!.write(msg);
    });
  }

  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    const resp = await this.send("tools/call", { name, arguments: args });
    const text = resp?.result?.content?.[0]?.text ?? "{}";
    return JSON.parse(text);
  }

  async listMarkets(limit = 10, status = "open") {
    return this.callTool("list_markets", { limit, status });
  }

  async checkAffiliateCode(code: string) {
    return this.callTool("check_affiliate_code", { code });
  }

  async formatAffiliateLink(code: string) {
    return this.callTool("format_affiliate_link", { code });
  }

  async getQuote(marketKey: string, side: string, amount: number) {
    return this.callTool("get_quote", {
      market_pubkey: marketKey,
      side,
      amount_sol: amount,
    });
  }

  disconnect() {
    this.proc?.kill();
  }
}
