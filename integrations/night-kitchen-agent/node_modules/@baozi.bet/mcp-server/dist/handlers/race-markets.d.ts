export interface RaceOutcome {
    index: number;
    label: string;
    poolSol: number;
    percent: number;
}
export interface RaceMarket {
    publicKey: string;
    marketId: string;
    question: string;
    outcomes: RaceOutcome[];
    closingTime: string;
    resolutionTime: string;
    status: string;
    statusCode: number;
    winningOutcomeIndex: number | null;
    totalPoolSol: number;
    layer: string;
    layerCode: number;
    accessGate: string;
    creator: string;
    platformFeeBps: number;
    isBettingOpen: boolean;
}
export interface RacePosition {
    publicKey: string;
    user: string;
    raceMarketPda: string;
    marketId: string;
    outcomeIndex: number;
    amountSol: number;
    claimed: boolean;
    createdAt: string;
}
/**
 * List all race markets
 */
export declare function listRaceMarkets(status?: string): Promise<RaceMarket[]>;
/**
 * Get a specific race market
 */
export declare function getRaceMarket(publicKey: string): Promise<RaceMarket | null>;
/**
 * Get race quote for a potential bet
 */
export declare function getRaceQuote(market: RaceMarket, outcomeIndex: number, betAmountSol: number): {
    valid: boolean;
    error?: string;
    outcomeLabel: string;
    betAmountSol: number;
    expectedPayoutSol: number;
    impliedOdds: number;
    newOutcomePercent: number;
};
