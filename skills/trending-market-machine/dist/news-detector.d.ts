export interface MarketProposal {
    question: string;
    category: string;
    closingTime: Date;
    source: string;
    sourceUrl: string;
    confidence: number;
    resolutionSource?: string;
}
/**
 * v7.0 compliance check: Is this market allowed?
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export declare function checkV7Compliance(question: string): {
    allowed: boolean;
    reason: string;
};
export interface TimingClassification {
    type: 'A';
    eventTime?: Date;
    valid: boolean;
    reason: string;
}
/**
 * Validate Type A timing: close_time must be <= event_time - 24h
 *
 * v7.0: Only Type A markets exist. Type B is banned.
 */
export declare function classifyAndValidateTiming(proposal: MarketProposal): TimingClassification;
/**
 * Adjust proposal closing time to comply with Type A timing rules.
 * Returns null if the market cannot be made compliant.
 */
export declare function enforceTimingRules(proposal: MarketProposal): MarketProposal | null;
export declare function scanRSSFeeds(): Promise<MarketProposal[]>;
/**
 * Generate curated event-based markets.
 * v7.0: ONLY unknowable-outcome events. NO price predictions.
 */
export declare function generateCuratedMarkets(): MarketProposal[];
export declare function detectMarketOpportunities(): Promise<MarketProposal[]>;
