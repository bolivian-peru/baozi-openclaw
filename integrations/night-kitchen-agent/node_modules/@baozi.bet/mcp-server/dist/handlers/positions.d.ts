export interface Position {
    publicKey: string;
    user: string;
    marketId: string;
    yesAmountSol: number;
    noAmountSol: number;
    totalAmountSol: number;
    side: 'Yes' | 'No' | 'Both';
    claimed: boolean;
    referredBy: string | null;
    affiliateFeePaidSol: number;
    marketPda?: string;
    marketQuestion?: string;
    marketStatus?: string;
    marketOutcome?: string | null;
    potentialPayout?: number;
}
export interface PositionSummary {
    wallet: string;
    totalPositions: number;
    totalBetSol: number;
    activePositions: number;
    claimedPositions: number;
    winningPositions: number;
    losingPositions: number;
    pendingPositions: number;
    positions: Position[];
}
/**
 * Get all positions for a wallet
 */
export declare function getPositions(walletAddress: string): Promise<Position[]>;
/**
 * Get positions with enriched market data
 */
export declare function getPositionsEnriched(walletAddress: string): Promise<Position[]>;
/**
 * Get position summary with statistics
 */
export declare function getPositionsSummary(walletAddress: string): Promise<PositionSummary>;
