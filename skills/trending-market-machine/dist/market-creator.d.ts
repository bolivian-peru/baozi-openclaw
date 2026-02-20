import { MarketProposal } from './news-detector';
export interface CreateMarketResult {
    success: boolean;
    marketPda: string;
    marketId: number;
    txSignature: string;
    error?: string;
}
/**
 * Create a lab market using MCP server's build_create_lab_market_transaction.
 *
 * Pipeline:
 *   1. Validate & enforce pari-mutuel v6.3 timing rules (local)
 *   2. Validate question via MCP server
 *   3. Build unsigned tx via MCP build_create_lab_market_transaction
 *   4. Sign locally, submit to Solana with exponential-backoff retry
 *   5. Record in local tracker DB
 */
export declare function createLabMarket(proposal: MarketProposal): Promise<CreateMarketResult>;
export declare function getWalletBalance(): Promise<number>;
export declare function canAffordMarketCreation(): Promise<boolean>;
export declare function shutdownMcp(): Promise<void>;
