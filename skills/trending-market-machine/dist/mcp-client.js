"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpClient = void 0;
/**
 * MCP Client for Baozi Market Factory.
 * Communicates with @baozi.bet/mcp-server via stdio JSON-RPC.
 */
const child_process_1 = require("child_process");
class McpClient {
    constructor() {
        this.process = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.buffer = '';
        this.initialized = false;
    }
    async start() {
        if (this.process)
            return;
        this.process = (0, child_process_1.spawn)('npx', ['@baozi.bet/mcp-server'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_ENV: 'production' },
        });
        this.process.stdout.on('data', (data) => {
            this.buffer += data.toString();
            this.processBuffer();
        });
        this.process.stderr.on('data', (data) => {
            // MCP server logs to stderr - just log it
            const msg = data.toString().trim();
            if (msg)
                console.log(`[MCP] ${msg}`);
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
        this.send({ jsonrpc: '2.0', method: 'notifications/initialized', id: 0 });
        this.initialized = true;
    }
    processBuffer() {
        // Look for Content-Length header pattern or raw JSON
        const lines = this.buffer.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            try {
                const parsed = JSON.parse(line);
                const pending = this.pendingRequests.get(parsed.id);
                if (pending) {
                    this.pendingRequests.delete(parsed.id);
                    if (parsed.error) {
                        pending.reject(new Error(parsed.error.message));
                    }
                    else {
                        pending.resolve(parsed.result);
                    }
                }
                // Remove processed line from buffer
                this.buffer = lines.slice(i + 1).join('\n');
                return;
            }
            catch {
                // Not valid JSON yet, keep accumulating
            }
        }
    }
    send(request) {
        if (!this.process?.stdin)
            throw new Error('MCP server not running');
        const json = JSON.stringify(request);
        this.process.stdin.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
    }
    async call(method, params, timeoutMs = 30000) {
        const id = ++this.requestId;
        const request = { jsonrpc: '2.0', id, method, params };
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
    async callTool(name, args = {}) {
        return this.call('tools/call', { name, arguments: args });
    }
    /**
     * Build a create lab market transaction via MCP.
     */
    async buildCreateLabMarketTransaction(params) {
        const result = await this.callTool('build_create_lab_market_transaction', params);
        return result;
    }
    /**
     * Validate a market question against v6.3 rules.
     */
    async validateMarketQuestion(question) {
        const result = await this.callTool('validate_market_question', { question });
        return result;
    }
    /**
     * Get pari-mutuel rules.
     */
    async getParimutuelRules() {
        return this.callTool('get_parimutuel_rules');
    }
    /**
     * Get timing rules.
     */
    async getTimingRules() {
        return this.callTool('get_timing_rules');
    }
    async stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }
}
exports.McpClient = McpClient;
//# sourceMappingURL=mcp-client.js.map