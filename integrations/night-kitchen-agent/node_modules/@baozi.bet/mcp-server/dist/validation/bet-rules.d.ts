/**
 * Bet Validation Rules
 *
 * Validates bet parameters against protocol constraints:
 * - Amount limits (0.01-100 SOL)
 * - Market state (active, not frozen, not paused)
 * - Whitelist access (for private markets)
 * - Timing constraints (betting freeze)
 */
export interface BetValidationParams {
    amountSol: number;
    marketStatus: number;
    closingTime: Date;
    isPaused: boolean;
    accessGate: number;
    userWhitelisted?: boolean;
    layer?: number;
}
export interface BetValidation {
    valid: boolean;
    error?: string;
    warnings: string[];
    details: {
        amountValid: boolean;
        marketStateValid: boolean;
        timingValid: boolean;
        accessValid: boolean;
    };
}
export interface ClaimValidationParams {
    marketStatus: number;
    marketOutcome: number;
    positionSide: 'Yes' | 'No';
    positionAmount: number;
    alreadyClaimed: boolean;
}
export interface ClaimValidation {
    valid: boolean;
    error?: string;
    canClaim: boolean;
    isWinner: boolean;
}
/**
 * Validate bet parameters before building transaction
 */
export declare function validateBet(params: BetValidationParams): BetValidation;
/**
 * Validate claim parameters before building claim transaction
 */
export declare function validateClaim(params: ClaimValidationParams): ClaimValidation;
/**
 * Calculate quote for a bet (pari-mutuel)
 */
export declare function calculateBetQuote(params: {
    betAmountSol: number;
    side: 'Yes' | 'No';
    currentYesPool: number;
    currentNoPool: number;
    platformFeeBps: number;
}): {
    expectedPayoutSol: number;
    potentialProfitSol: number;
    feeSol: number;
    impliedOdds: number;
    decimalOdds: number;
    newYesPool: number;
    newNoPool: number;
};
/**
 * Estimate claim amount for a winning position
 */
export declare function estimateClaimAmount(params: {
    positionAmount: number;
    positionSide: 'Yes' | 'No';
    totalYesPool: number;
    totalNoPool: number;
    platformFeeBps: number;
}): {
    grossPayout: number;
    fee: number;
    netPayout: number;
};
