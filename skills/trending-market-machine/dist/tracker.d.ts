export interface MarketRecord {
    id?: number;
    market_pda: string;
    market_id: number;
    question: string;
    category: string;
    source: string;
    source_url: string;
    closing_time: string;
    created_at: string;
    status: string;
    resolution_outcome: string | null;
    volume_sol: number;
    fees_earned_sol: number;
}
export interface CategoryStats {
    category: string;
    markets_created: number;
    total_volume_sol: number;
    total_fees_sol: number;
    avg_volume_sol: number;
}
export declare function recordMarket(record: Omit<MarketRecord, 'id' | 'created_at' | 'status' | 'volume_sol' | 'fees_earned_sol'> & {
    tx_signature?: string;
}): void;
export declare function updateMarketStatus(marketPda: string, status: string, outcome?: string): void;
export declare function updateMarketVolume(marketPda: string, volumeSol: number, feesSol: number): void;
export declare function getActiveMarkets(): MarketRecord[];
export declare function getAllMarkets(): MarketRecord[];
export declare function getMarketByPda(pda: string): MarketRecord | undefined;
export declare function isDuplicate(question: string): boolean;
export declare function recordSeenEvent(eventHash: string, title: string, source: string): boolean;
export declare function isEventSeen(eventHash: string): boolean;
export declare function getCategoryStats(): CategoryStats[];
export declare function getTotalStats(): {
    markets: number;
    volume: number;
    fees: number;
    resolved: number;
};
export declare function getMarketsNeedingResolution(): MarketRecord[];
