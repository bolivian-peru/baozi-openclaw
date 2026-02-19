import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface McpToolCallResult {
  content: { type: string; text: string }[];
}

export class McpClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private initialized = false;

  constructor(private command: string = 'npx', private args: string[] = ['-y', '@baozi.bet/mcp-server']) {
    super();
  }

  async start() {
    if (this.process) return;

    console.log(`[McpClient] Spawning ${this.command} ${this.args.join(' ')}`);
    this.process = spawn(this.command, this.args, {
      stdio: ['pipe', 'pipe', process.stderr],
      shell: true // Use shell to ensure npx works
    });

    this.process.stdout?.on('data', (data) => this.handleData(data));
    this.process.on('error', (err) => console.error('[McpClient] Process error:', err));
    this.process.on('exit', (code) => console.log(`[McpClient] Process exited with code ${code}`));

    // Initialize MCP
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'baozi-claim-agent', version: '1.0.0' }
    });
    
    // Send initialized notification
    this.notify('notifications/initialized');
    this.initialized = true;
    console.log('[McpClient] Initialized');
  }

  async stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.initialized = false;
    }
  }

  async callTool(name: string, args: any): Promise<any> {
    if (!this.initialized) await this.start();
    
    const result = await this.request('tools/call', {
      name,
      arguments: args
    });

    return result;
  }

  private handleData(data: Buffer) {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined) {
          const p = this.pendingRequests.get(msg.id);
          if (p) {
            if (msg.error) p.reject(msg.error);
            else p.resolve(msg.result);
            this.pendingRequests.delete(msg.id);
          }
        }
      } catch (err) {
        console.error('[McpClient] Error parsing JSON:', line);
      }
    }
  }

  private async request(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) return reject(new Error('MCP process not started'));

      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });

      const req = { jsonrpc: '2.0', id, method, params };
      this.process.stdin.write(JSON.stringify(req) + '\n');
    });
  }

  private notify(method: string, params?: any) {
    if (!this.process || !this.process.stdin) return;
    const notif = { jsonrpc: '2.0', method, params };
    this.process.stdin.write(JSON.stringify(notif) + '\n');
  }
}
