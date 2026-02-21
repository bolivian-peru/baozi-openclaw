/**
 * MCP Client for Baozi Agent Arena.
 *
 * Communicates with @baozi.bet/mcp-server via stdio JSON-RPC.
 * The server is spawned as a subprocess via `npx @baozi.bet/mcp-server`.
 *
 * Adapted from skills/market-factory/src/mcp-client.ts with additional
 * tool wrappers for arena-specific queries.
 */

import { spawn, ChildProcess } from 'child_process';

// ---------------------------------------------------------------------------
// JSON-RPC types
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

// ---------------------------------------------------------------------------
// Tool response shapes — loosely typed since MCP can return varied shapes
// ---------------------------------------------------------------------------

export interface RawMarket {
  pda: string;
  question: string;
  status: string;
  layer: string;
  yes_pool?: number;
  no_pool?: number;
  total_pool?: number;
  closing_time?: string;
  resolved_outcome?: string;
  [key: string]: unknown;
}

export interface RawPosition {
  market_pda: string;
  question?: string;
  side: string;
  amount: number;
  resolved?: boolean;
  payout?: number;
  [key: string]: unknown;
}

export interface RawQuote {
  side: string;
  amount: number;
  payout: number;
  odds: number;
  [key: string]: unknown;
}

export interface RawRaceMarket {
  pda: string;
  question: string;
  status: string;
  layer: string;
  total_pool?: number;
  outcomes?: Array<{ label: string; pool: number; odds: number }>;
  closing_time?: string;
  resolved_outcome_index?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// MCP Client
// ---------------------------------------------------------------------------

export class McpClient {
  private proc: ChildProcess | null = null;
  private requestId = 0;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private buffer = '';
  private initialized = false;
  private stderr_lines: string[] = [];

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async start(): Promise<void> {
    if (this.proc) return;

    this.proc = spawn('npx', ['@baozi.bet/mcp-server'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' },
    });

    this.proc.stdout!.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.proc.stderr!.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        this.stderr_lines.push(msg);
        // Keep last 50 lines only
        if (this.stderr_lines.length > 50) this.stderr_lines.shift();
      }
    });

    this.proc.on('exit', (code) => {
      this.proc = null;
      this.initialized = false;
      // Reject all pending requests
      for (const [, pending] of this.pending) {
        pending.reject(new Error(`MCP server exited with code ${code}`));
      }
      this.pending.clear();
    });

    // Give the server time to boot
    await new Promise((r) => setTimeout(r, 3000));

    // MCP handshake
    await this.call('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'baozi-agent-arena', version: '1.0.0' },
    });

    this.sendRaw({ jsonrpc: '2.0', method: 'notifications/initialized', id: 0 } as JsonRpcRequest);
    this.initialized = true;
  }

  async stop(): Promise<void> {
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
  }

  getStderrLines(): string[] {
    return [...this.stderr_lines];
  }

  // -------------------------------------------------------------------------
  // Transport
  // -------------------------------------------------------------------------

  private processBuffer(): void {
    // The MCP server may send Content-Length framed messages or raw JSON lines.
    // Handle both: try Content-Length framing first, fall back to newline JSON.
    while (true) {
      // Try Content-Length framing
      const clMatch = this.buffer.match(/^Content-Length:\s*(\d+)\r?\n\r?\n/);
      if (clMatch) {
        const headerLen = clMatch[0].length;
        const bodyLen = parseInt(clMatch[1], 10);
        if (this.buffer.length < headerLen + bodyLen) break; // wait for more data
        const body = this.buffer.slice(headerLen, headerLen + bodyLen);
        this.buffer = this.buffer.slice(headerLen + bodyLen);
        this.dispatchMessage(body);
        continue;
      }

      // Try newline-delimited JSON
      const nlIdx = this.buffer.indexOf('\n');
      if (nlIdx === -1) break;
      const line = this.buffer.slice(0, nlIdx).trim();
      this.buffer = this.buffer.slice(nlIdx + 1);
      if (line) this.dispatchMessage(line);
    }
  }

  private dispatchMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as JsonRpcResponse;
      const handler = this.pending.get(msg.id);
      if (handler) {
        this.pending.delete(msg.id);
        if (msg.error) {
          handler.reject(new Error(`[${msg.error.code}] ${msg.error.message}`));
        } else {
          handler.resolve(msg.result);
        }
      }
    } catch {
      // Not valid JSON — ignore
    }
  }

  private sendRaw(request: JsonRpcRequest): void {
    if (!this.proc?.stdin) throw new Error('MCP server not running');
    const json = JSON.stringify(request);
    this.proc.stdin.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
  }

  // -------------------------------------------------------------------------
  // RPC primitives
  // -------------------------------------------------------------------------

  async call(method: string, params?: unknown, timeoutMs = 30_000): Promise<unknown> {
    const id = ++this.requestId;
    const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP call '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });

      this.sendRaw(request);
    });
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    return this.call('tools/call', { name, arguments: args });
  }

  // -------------------------------------------------------------------------
  // Arena-specific tool wrappers
  // -------------------------------------------------------------------------

  /**
   * List markets by layer and status.
   * Returns raw market data from the MCP server.
   */
  async listMarkets(
    layer: 'official' | 'lab' | 'private' | 'all' = 'all',
    status: 'active' | 'closed' | 'resolved' | 'all' = 'active',
  ): Promise<RawMarket[]> {
    const result = await this.callTool('list_markets', { layer, status });
    return this.extractArray<RawMarket>(result);
  }

  /**
   * Get detailed data for a single market PDA.
   */
  async getMarket(marketPda: string): Promise<RawMarket | null> {
    try {
      const result = await this.callTool('get_market', { market_pda: marketPda });
      return this.extractObject<RawMarket>(result);
    } catch {
      return null;
    }
  }

  /**
   * Get all open and resolved positions for a wallet.
   */
  async getPositions(wallet: string): Promise<RawPosition[]> {
    try {
      const result = await this.callTool('get_positions', { wallet });
      return this.extractArray<RawPosition>(result);
    } catch {
      return [];
    }
  }

  /**
   * Get a price quote for a hypothetical bet.
   */
  async getQuote(
    marketPda: string,
    side: 'YES' | 'NO',
    amount: number,
  ): Promise<RawQuote | null> {
    try {
      const result = await this.callTool('get_quote', {
        market_pda: marketPda,
        side,
        amount,
      });
      return this.extractObject<RawQuote>(result);
    } catch {
      return null;
    }
  }

  /**
   * Get race market data (multi-outcome markets).
   */
  async getRaceMarket(marketPda: string): Promise<RawRaceMarket | null> {
    try {
      const result = await this.callTool('get_race_market', { market_pda: marketPda });
      return this.extractObject<RawRaceMarket>(result);
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * MCP tool results arrive wrapped in a content/text envelope.
   * Extract the actual payload, which may be JSON-encoded text.
   */
  private unwrapToolResult(raw: unknown): unknown {
    if (!raw || typeof raw !== 'object') return raw;
    const obj = raw as Record<string, unknown>;

    // Standard MCP envelope: { content: [{ type: 'text', text: '...' }] }
    if (Array.isArray(obj['content'])) {
      const first = (obj['content'] as unknown[])[0];
      if (first && typeof first === 'object') {
        const item = first as Record<string, unknown>;
        if (item['type'] === 'text' && typeof item['text'] === 'string') {
          try {
            return JSON.parse(item['text']);
          } catch {
            return item['text'];
          }
        }
      }
    }

    // Direct result (no envelope)
    return raw;
  }

  private extractArray<T>(raw: unknown): T[] {
    const unwrapped = this.unwrapToolResult(raw);
    if (Array.isArray(unwrapped)) return unwrapped as T[];
    if (unwrapped && typeof unwrapped === 'object') {
      // Sometimes the array is nested under a key like 'markets' or 'positions'
      const obj = unwrapped as Record<string, unknown>;
      for (const key of ['markets', 'positions', 'data', 'items', 'results']) {
        if (Array.isArray(obj[key])) return obj[key] as T[];
      }
    }
    return [];
  }

  private extractObject<T>(raw: unknown): T | null {
    const unwrapped = this.unwrapToolResult(raw);
    if (unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
      return unwrapped as T;
    }
    return null;
  }
}
