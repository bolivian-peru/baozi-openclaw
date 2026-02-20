/**
 * MCP Client for Baozi Market Factory.
 * Communicates with @baozi.bet/mcp-server via stdio JSON-RPC.
 */
import { spawn, ChildProcess } from 'child_process';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: { code: number; message: string };
}

export class McpClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private buffer = '';
  private initialized = false;

  async start(): Promise<void> {
    if (this.process) return;

    this.process = spawn('npx', ['@baozi.bet/mcp-server'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' },
    });

    this.process.stdout!.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.process.stderr!.on('data', (data: Buffer) => {
      // MCP server logs to stderr - just log it
      const msg = data.toString().trim();
      if (msg) console.log(`[MCP] ${msg}`);
    });

    this.process.on('exit', (code) => {
      console.log(`[MCP] Server exited with code ${code}`);
      this.process = null;
      this.initialized = false;
    });

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Initialize MCP protocol
    await this.call('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'baozi-market-factory', version: '1.0.0' },
    });

    // Send initialized notification
    this.send({ jsonrpc: '2.0', method: 'notifications/initialized', id: 0 } as any);
    this.initialized = true;
  }

  private processBuffer(): void {
    // Look for Content-Length header pattern or raw JSON
    const lines = this.buffer.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const parsed = JSON.parse(line) as JsonRpcResponse;
        const pending = this.pendingRequests.get(parsed.id);
        if (pending) {
          this.pendingRequests.delete(parsed.id);
          if (parsed.error) {
            pending.reject(new Error(parsed.error.message));
          } else {
            pending.resolve(parsed.result);
          }
        }
        // Remove processed line from buffer
        this.buffer = lines.slice(i + 1).join('\n');
        return;
      } catch {
        // Not valid JSON yet, keep accumulating
      }
    }
  }

  private send(request: JsonRpcRequest): void {
    if (!this.process?.stdin) throw new Error('MCP server not running');
    const json = JSON.stringify(request);
    this.process.stdin.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
  }

  async call(method: string, params?: any, timeoutMs = 30000): Promise<any> {
    const id = ++this.requestId;
    const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP call ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });

      this.send(request);
    });
  }

  /**
   * Call an MCP tool by name.
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    return this.call('tools/call', { name, arguments: args });
  }

  /**
   * Build a create lab market transaction via MCP.
   */
  async buildCreateLabMarketTransaction(params: {
    question: string;
    closingTime: string;
    creatorWallet: string;
    resolutionMode?: string;
    councilMembers?: string[];
  }): Promise<{ transaction: string; marketPda: string }> {
    const result = await this.callTool('build_create_lab_market_transaction', params);
    return result;
  }

  /**
   * Validate a market question against v6.3 rules.
   */
  async validateMarketQuestion(question: string): Promise<{ valid: boolean; issues: string[] }> {
    const result = await this.callTool('validate_market_question', { question });
    return result;
  }

  /**
   * Get pari-mutuel rules.
   */
  async getParimutuelRules(): Promise<any> {
    return this.callTool('get_parimutuel_rules');
  }

  /**
   * Get timing rules.
   */
  async getTimingRules(): Promise<any> {
    return this.callTool('get_timing_rules');
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
