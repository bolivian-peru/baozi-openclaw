import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface Market {
    id: string;
    question: string;
    outcomes: string[];
    closingTime: string;
    totalPool: number;
    status: 'Active' | 'Closed' | 'Resolved' | 'Unknown';
    layer: string;
}

export class BaoziMcpClient {
    private client: Client | null = null;
    private mcpProcess: ChildProcess | null = null;
    private ready: boolean = false;

    constructor() {}

    async initialize(): Promise<void> {
        if (this.ready) return;

        console.log("Initializing MCP server...");

        this.mcpProcess = spawn('npx', ['-y', '@baozi.bet/mcp-server'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_ENV: 'production'
            }
        });

        const transport = new StdioClientTransport({
            command: 'npx',
            args: ['-y', '@baozi.bet/mcp-server']
        });

        this.client = new Client({
            name: 'night-kitchen-agent',
            version: '1.0.0'
        }, {
            capabilities: {}
        });

        await this.client.connect(transport);
        this.ready = true;
        console.log("MCP server initialized.");
    }

    async listMarkets(): Promise<Market[]> {
        await this.initialize();

        if (!this.client) {
            throw new Error("MCP client not initialized");
        }

        try {
            console.log("Fetching markets via MCP server...");

            const result = await this.client.callTool({
                name: 'list_markets',
                arguments: {
                    layer: 'Lab',
                    status: 'Active',
                    limit: 20
                }
            });

            const resultContent = result.content as Array<{ type: string; text: string }>;
            const marketsText = resultContent[0]?.type === 'text' 
                ? resultContent[0].text 
                : JSON.stringify(result.content);
            
            console.log("Raw MCP response:", marketsText.substring(0, 500));
            
            let marketsData: unknown;
            try {
                marketsData = JSON.parse(marketsText);
            } catch {
                marketsData = [];
            }

            let marketsArray: Array<unknown> = [];
            if (Array.isArray(marketsData)) {
                marketsArray = marketsData;
            } else if (marketsData && typeof marketsData === 'object') {
                marketsArray = (marketsData as Record<string, unknown>).markets as Array<unknown> || 
                              (marketsData as Record<string, unknown>).data as Array<unknown> || 
                              (marketsData as Record<string, unknown>).result as Array<unknown> ||
                              [];
            }
            
            const markets: Market[] = marketsArray.map((m: unknown) => {
                const rec = m as Record<string, unknown>;
                return {
                    id: (rec.publicKey as string) || (rec.pda as string) || (rec.market as string) || '',
                    question: (rec.question as string) || (rec.title as string) || 'Unknown',
                    outcomes: (rec.outcomes as string[]) || ['Yes', 'No'],
                    closingTime: (rec.closingTime as string) || (rec.closeTime as string) || new Date().toISOString(),
                    totalPool: (rec.totalPool as number) || (rec.pool as number) || (rec.volume as number) || 0,
                    status: ((rec.status as string) || 'Active') as 'Active' | 'Closed' | 'Resolved' | 'Unknown',
                    layer: (rec.layer as string) || 'Lab'
                };
            });

            console.log(`Found ${markets.length} active markets via MCP.`);
            return markets;

        } catch (error) {
            console.error("Failed to list markets via MCP:", error);
            return [];
        }
    }

    async getMarket(marketId: string): Promise<Market | null> {
        await this.initialize();

        if (!this.client) {
            throw new Error("MCP client not initialized");
        }

        try {
            const result = await this.client.callTool({
                name: 'get_market',
                arguments: {
                    market: marketId
                }
            });

            const resultContent = result.content as Array<{ type: string; text: string }>;
            const marketText = resultContent[0]?.type === 'text' 
                ? resultContent[0].text 
                : JSON.stringify(result.content);
            
            const m = JSON.parse(marketText);
            
            return {
                id: (m.publicKey as string) || (m.pda as string) || marketId,
                question: (m.question as string) || (m.title as string) || 'Unknown',
                outcomes: (m.outcomes as string[]) || ['Yes', 'No'],
                closingTime: (m.closingTime as string) || (m.closeTime as string) || new Date().toISOString(),
                totalPool: (m.totalPool as number) || (m.pool as number) || (m.volume as number) || 0,
                status: ((m.status as string) || 'Active') as 'Active' | 'Closed' | 'Resolved' | 'Unknown',
                layer: (m.layer as string) || 'Lab'
            };

        } catch (error) {
            console.error("Failed to get market:", error);
            return null;
        }
    }

    async postToAgentBook(content: string, marketId?: string): Promise<boolean> {
        const walletAddress = process.env.WALLET_PUBLIC_KEY;

        if (!walletAddress) {
            console.log(`[Mock Post] AgentBook:
Content: ${content}
Market: ${marketId || 'None'}
(Set WALLET_PUBLIC_KEY env var to post for real)`);
            return true;
        }

        try {
            console.log(`Posting to AgentBook as ${walletAddress}...`);
            const response = await axios.post('https://baozi.bet/api/agentbook/posts', {
                walletAddress,
                content,
                marketPda: marketId
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data.success) {
                console.log('✅ Successfully posted to AgentBook!');
                return true;
            } else {
                console.error('❌ Failed to post:', response.data.error);
                return false;
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string };
            console.error('❌ Error posting to AgentBook:', err.response?.data || err.message);
            return false;
        }
    }

    async close(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
        if (this.mcpProcess) {
            this.mcpProcess.kill();
            this.mcpProcess = null;
        }
        this.ready = false;
    }
}
