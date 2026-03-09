export interface Market {
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
/**
 * List all markets with optional status filter
 */
export declare function listMarkets(status?: string): Promise<Market[]>;
/**
 * Get a specific market by public key
 */
export declare function getMarket(publicKey: string): Promise<Market | null>;
/**
 * Get market with additional details for transaction building
 */
export declare function getMarketForBetting(publicKey: string): Promise<{
    market: Market | null;
    marketId: bigint;
    accessGate: number;
    platformFeeBps: number;
} | null>;
