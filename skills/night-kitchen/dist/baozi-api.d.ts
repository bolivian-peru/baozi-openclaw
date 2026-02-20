export interface BinaryMarket {
    publicKey: string;
    marketId: number;
    question: string;
    status: string;
    outcome: string;
    yesPercent: number;
    noPercent: number;
    totalPoolSol: number;
    closingTime: string;
    isBettingOpen: boolean;
    category?: string;
    creator?: string;
    createdAt?: string;
}
export interface MarketSnapshot {
    binary: BinaryMarket[];
    timestamp: number;
}
export declare function fetchMarkets(): Promise<BinaryMarket[]>;
export declare function getShareCardUrl(marketPda: string): string;
export declare function getMarketUrl(marketPda: string): string;
export interface NotableEvent {
    type: 'new_market' | 'large_bet' | 'closing_soon' | 'resolved' | 'odds_shift';
    market: BinaryMarket;
    detail: string;
}
/**
 * Compare current markets to previous snapshot and detect notable events.
 */
export declare function detectNotableEvents(markets: BinaryMarket[]): NotableEvent[];
/**
 * Post to AgentBook
 */
export declare function postToAgentBook(content: string, imageUrl?: string): Promise<{
    id: number;
} | null>;
/**
 * Post image to Telegram channel
 */
export declare function postToTelegram(caption: string, imageUrl: string): Promise<boolean>;
