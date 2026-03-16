/**
 * Baozi MCP Client
 *
 * Interfaces with @baozi.bet/mcp-server for market data
 */
import { Market, Quote, Position } from './types';
export declare function listMarkets(limit?: number): Promise<Market[]>;
export declare function getMarket(marketAddress: string): Promise<Market | null>;
export declare function getQuote(marketAddress: string): Promise<Quote | null>;
export declare function getPositions(walletAddress: string): Promise<Position[]>;
export declare function checkAffiliateCode(code: string): Promise<{
    valid: boolean;
    wallet?: string;
}>;
export declare function registerAffiliate(walletAddress: string, code: string): Promise<{
    success: boolean;
    txId?: string;
}>;
export declare function formatAffiliateLink(code: string, marketAddress?: string): string;
export declare function placeBet(marketAddress: string, side: 'YES' | 'NO', amount: number, affiliateCode?: string): Promise<{
    success: boolean;
    txId?: string;
}>;
export declare function getAgentProfile(walletAddress: string): Promise<any>;
export declare function healthCheck(): Promise<boolean>;
//# sourceMappingURL=mcp-client.d.ts.map