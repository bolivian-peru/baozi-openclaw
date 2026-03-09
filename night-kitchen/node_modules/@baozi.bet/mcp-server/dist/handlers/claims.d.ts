export interface ClaimablePosition {
    positionPda: string;
    marketPda: string;
    marketQuestion: string;
    side: 'Yes' | 'No';
    betAmountSol: number;
    claimType: 'winnings' | 'refund' | 'cancelled';
    estimatedPayoutSol: number;
    marketStatus: string;
    marketOutcome: string | null;
}
export interface ClaimSummary {
    wallet: string;
    totalClaimableSol: number;
    winningsClaimableSol: number;
    refundsClaimableSol: number;
    claimablePositions: ClaimablePosition[];
    alreadyClaimedCount: number;
}
export interface AffiliateInfo {
    affiliatePda: string;
    owner: string;
    code: string;
    totalEarnedSol: number;
    unclaimedSol: number;
    referralCount: number;
    isActive: boolean;
}
export interface CreatorEarnings {
    wallet: string;
    totalCreatorFeesSol: number;
    unclaimedSol: number;
    marketsCreated: number;
}
/**
 * Get all claimable positions for a wallet
 * Checks which positions can be claimed (winnings or refunds)
 */
export declare function getClaimablePositions(walletAddress: string): Promise<ClaimSummary>;
/**
 * Get affiliate info by code
 */
export declare function getAffiliateByCode(code: string): Promise<AffiliateInfo | null>;
/**
 * Get affiliate info by owner wallet
 */
export declare function getAffiliateByOwner(walletAddress: string): Promise<AffiliateInfo[]>;
