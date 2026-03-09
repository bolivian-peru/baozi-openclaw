/**
 * Market Creation Validation Rules (v6.3 Compliant)
 *
 * Implements validation for:
 * - Rule A: Event-based markets (12-24h buffer before event)
 * - Rule B: Measurement-period markets (close before measurement starts)
 * - Rule C: Objective verifiability (v6.3) - blocks subjective outcomes
 * - Rule D: Manipulation prevention (v6.3) - blocks self-referential markets
 * - Rule E: Approved data sources (v6.3) - enforces verifiable resolution
 * - Race market outcome validation
 * - Question and timing constraints
 */
export interface CreateMarketParams {
    question: string;
    closingTime: Date;
    resolutionTime: Date;
    layer: 'official' | 'lab' | 'private';
    marketType?: 'event' | 'measurement';
    eventTime?: Date;
    measurementStart?: Date;
    measurementEnd?: Date;
    outcomes?: string[];
    inviteHash?: string;
}
export interface CreationValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
    computed: {
        ruleType: 'A' | 'B' | 'unknown';
        bufferHours?: number;
        recommendedClosingTime?: string;
        creationFeeSol: number;
        platformFeeBps: number;
        estimatedRentSol: number;
    };
}
/**
 * Validate market creation parameters
 */
export declare function validateMarketCreation(params: CreateMarketParams): CreationValidationResult;
/**
 * Calculate recommended resolution time from closing time
 */
export declare function calculateResolutionTime(closingTime: Date, marketType: 'event' | 'measurement', eventTime?: Date): Date;
/**
 * Calculate recommended closing time for event
 */
export declare function calculateRecommendedClosingTime(eventTime: Date, bufferHours?: number): Date;
/**
 * Get creation fee for layer
 */
export declare function getCreationFee(layer: 'official' | 'lab' | 'private'): {
    lamports: number;
    sol: number;
};
/**
 * Validate question format
 */
export declare function validateQuestion(question: string): {
    valid: boolean;
    errors: string[];
    suggestions: string[];
};
/**
 * Validate race outcomes
 */
export declare function validateRaceOutcomes(outcomes: string[]): {
    valid: boolean;
    errors: string[];
};
