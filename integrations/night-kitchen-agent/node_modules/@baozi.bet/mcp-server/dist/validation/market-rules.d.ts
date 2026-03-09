/**
 * Market Validation Rules (v6.3)
 *
 * Implements timing validation for market creation based on:
 * - Rule A: Event-Based Markets (single point in time)
 * - Rule B: Measurement-Period Markets (outcome over time range)
 */
export interface MarketTimingParams {
    question: string;
    closingTime: Date;
    marketType: 'event' | 'measurement';
    eventTime?: Date;
    measurementStart?: Date;
    measurementEnd?: Date;
}
export interface MarketValidation {
    valid: boolean;
    ruleType: 'A' | 'B';
    errors: string[];
    warnings: string[];
    suggestions: string[];
    timing?: {
        bufferHours?: number;
        recommendedClose?: Date;
        measurementDays?: number;
    };
}
/**
 * Validate market timing parameters against v6.3 rules
 *
 * Rule A (Event-Based):
 * - Betting closes BEFORE the event occurs
 * - Minimum 12h buffer between close and event
 * - Recommended 18-24h buffer for safety
 *
 * Rule B (Measurement-Period):
 * - Betting must close BEFORE measurement starts
 * - Measurement period should be well-defined
 * - Prefer 2-7 day measurement periods for UX
 */
export declare function validateMarketTiming(params: MarketTimingParams): MarketValidation;
/**
 * Generate timing suggestions based on market parameters
 */
export declare function generateTimingSuggestions(params: MarketTimingParams): string[];
/**
 * Check if a market question follows best practices
 */
export declare function validateQuestionFormat(question: string): {
    valid: boolean;
    issues: string[];
};
/**
 * Calculate recommended times for a market
 */
export declare function calculateRecommendedTimes(eventOrMeasurementStart: Date, marketType: 'event' | 'measurement'): {
    recommendedClose: Date;
    latestClose: Date;
    earliestClose: Date;
};
