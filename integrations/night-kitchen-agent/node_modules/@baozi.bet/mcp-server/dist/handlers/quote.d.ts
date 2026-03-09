export interface Quote {
    valid: boolean;
    error?: string;
    warnings: string[];
    market: string;
    marketQuestion?: string;
    side: 'Yes' | 'No';
    betAmountSol: number;
    expectedPayoutSol: number;
    potentialProfitSol: number;
    impliedOdds: number;
    decimalOdds: number;
    feeSol: number;
    feeBps: number;
    newYesPoolSol: number;
    newNoPoolSol: number;
    currentYesPercent: number;
    currentNoPercent: number;
    newYesPercent: number;
    newNoPercent: number;
}
/**
 * Calculate a quote for a potential bet
 */
export declare function getQuote(marketPubkey: string, side: 'Yes' | 'No', amountSol: number): Promise<Quote>;
/**
 * Calculate quote with additional market data for transaction building
 */
export declare function getQuoteWithMarketData(marketPubkey: string, side: 'Yes' | 'No', amountSol: number): Promise<{
    quote: Quote;
    marketId?: bigint;
    accessGate?: number;
}>;
