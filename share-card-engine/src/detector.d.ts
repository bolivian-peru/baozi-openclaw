export interface Market {
    pda: string;
    question: string;
    status: 'active' | 'closed' | 'resolved';
    closingTime: number;
    poolSize: number;
    yesOdds?: number;
    noOdds?: number;
    layer: 'official' | 'labs';
}
export type EventType = 'NEW_MARKET' | 'LARGE_BET' | 'CLOSING_SOON' | 'ODDS_SHIFT' | 'JUST_RESOLVED';
export interface MarketEvent {
    type: EventType;
    market: Market;
    context: string;
    proverb: string;
}
export declare class MarketDetector {
    private state;
    processMarkets(newMarkets: Market[]): MarketEvent[];
}
//# sourceMappingURL=detector.d.ts.map