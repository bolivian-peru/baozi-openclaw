/**
 * MCP Client Wrapper
 * Spawns @baozi.bet/mcp-server as a child process and calls tools via MCP protocol.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let client: Client | null = null;
let transport: StdioClientTransport | null = null;
let connecting = false;

/**
 * Get or create the MCP client connection
 */
async function getClient(): Promise<Client> {
    if (client) return client;
    if (connecting) {
        // Wait for in-progress connection
        while (connecting) {
            await new Promise((r) => setTimeout(r, 100));
        }
        if (client) return client;
    }

    connecting = true;
    try {
        const env: Record<string, string> = { ...process.env as Record<string, string> };
        if (process.env.SOLANA_RPC_URL) {
            env.SOLANA_RPC_URL = process.env.SOLANA_RPC_URL;
            env.HELIUS_RPC_URL = process.env.SOLANA_RPC_URL;
        }

        transport = new StdioClientTransport({
            command: 'npx',
            args: ['@baozi.bet/mcp-server'],
            env,
        });

        client = new Client({ name: 'baozi-discord-bot', version: '1.0.0' }, { capabilities: {} });
        await client.connect(transport);

        // Auto-reconnect if MCP server crashes
        transport.onclose = () => {
            console.warn('[MCP] Connection lost — will reconnect on next request');
            client = null;
            transport = null;
        };

        console.log('[MCP] Connected to @baozi.bet/mcp-server');
        return client;
    } catch (err) {
        client = null;
        transport = null;
        throw err;
    } finally {
        connecting = false;
    }
}

/**
 * Call an MCP tool and return the parsed result
 */
async function callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const c = await getClient();
    const result = await c.callTool({ name, arguments: args });

    // MCP returns content array; parse first text block
    if (result.content && Array.isArray(result.content)) {
        const textBlock = result.content.find((b: any) => b.type === 'text');
        if (textBlock && 'text' in textBlock) {
            try {
                return JSON.parse(textBlock.text as string);
            } catch {
                return textBlock.text;
            }
        }
    }
    return result;
}

// ─── Typed Wrappers ──────────────────────────────────────────────────────────

export interface BooleanMarket {
    publicKey: string;
    marketId: string;
    question: string;
    closingTime: string;
    resolutionTime: string;
    status: string;
    statusCode: number;
    winningOutcome: string | null;
    currencyType: string;
    yesPoolSol: number;
    noPoolSol: number;
    totalPoolSol: number;
    yesPercent: number;
    noPercent: number;
    platformFeeBps: number;
    layer: string;
    layerCode: number;
    accessGate: string;
    creator: string;
    hasBets: boolean;
    isBettingOpen: boolean;
    creatorFeeBps: number;
}

export interface RaceMarket {
    publicKey: string;
    marketId: string;
    question: string;
    closingTime: string;
    resolutionTime: string;
    status: string;
    totalPoolSol: number;
    outcomes: { label: string; poolSol: number; percent: number }[];
    layer: string;
    creator: string;
    isBettingOpen: boolean;
}

export interface Position {
    marketId: string;
    publicKey: string;
    marketQuestion: string;
    side: string;
    totalAmountSol: number;
    status: string;
    winningOutcome: string | null;
    claimed: boolean;
}

export interface PositionsSummary {
    wallet: string;
    totalPositions: number;
    activePositions: number;
    totalBetSol: number;
    positions: Position[];
}

export interface QuoteResult {
    market: string;
    side: string;
    betAmount: number;
    currentOdds: { yes: number; no: number };
    expectedPayout: number;
    profit: number;
    newOdds: { yes: number; no: number };
    platformFee: number;
}

/**
 * List all boolean markets, optionally filtered by status
 */
export async function listMarkets(status?: string, layer?: string): Promise<BooleanMarket[]> {
    const args: Record<string, unknown> = {};
    if (status) args.status = status;
    if (layer) args.layer = layer;
    const result = await callTool('list_markets', args);
    if (Array.isArray(result)) return result as BooleanMarket[];
    // Sometimes result is wrapped in an object
    if (result && typeof result === 'object' && 'markets' in (result as any)) {
        return (result as any).markets as BooleanMarket[];
    }
    return [];
}

/**
 * Get a specific boolean market by public key
 */
export async function getMarket(publicKey: string): Promise<BooleanMarket | null> {
    const result = await callTool('get_market', { publicKey });
    // MCP wraps in { success, network, market: {...} }
    const data = result as any;
    return (data?.market as BooleanMarket) || null;
}

/**
 * Get a bet quote for a boolean market
 */
export async function getQuote(market: string, side: string, amount: number): Promise<QuoteResult | null> {
    const result = await callTool('get_quote', { market, side, amount });
    // MCP wraps in { success, network, quote: {...} }
    const data = result as any;
    return (data?.quote as QuoteResult) || null;
}

/**
 * List all race markets, optionally filtered by status
 */
export async function listRaceMarkets(status?: string): Promise<RaceMarket[]> {
    const args: Record<string, unknown> = {};
    if (status) args.status = status;
    const result = await callTool('list_race_markets', args);
    if (Array.isArray(result)) return result as RaceMarket[];
    if (result && typeof result === 'object' && 'markets' in (result as any)) {
        return (result as any).markets as RaceMarket[];
    }
    return [];
}

/**
 * Get a specific race market by public key
 */
export async function getRaceMarket(publicKey: string): Promise<RaceMarket | null> {
    const result = await callTool('get_race_market', { publicKey });
    // MCP wraps in { success, network, market: {...} }
    const data = result as any;
    return (data?.market as RaceMarket) || null;
}

/**
 * Get a quote for a race market outcome
 */
export async function getRaceQuote(market: string, outcomeIndex: number, amount: number): Promise<unknown> {
    return callTool('get_race_quote', { market, outcomeIndex, amount });
}

/**
 * Get positions for a wallet
 */
export async function getPositions(wallet: string): Promise<PositionsSummary | null> {
    const result = await callTool('get_positions', { wallet });
    // MCP wraps in { success, network, portfolio: {...} }
    const data = result as any;
    return (data?.portfolio as PositionsSummary) || null;
}

/**
 * Disconnect the MCP client
 */
export async function disconnect(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        transport = null;
        console.log('[MCP] Disconnected');
    }
}
