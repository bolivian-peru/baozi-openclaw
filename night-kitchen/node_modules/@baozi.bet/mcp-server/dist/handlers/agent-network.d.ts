export interface AgentAffiliateProfile {
    affiliatePda: string;
    ownerWallet: string;
    affiliateCode: string;
    isActive: boolean;
    isVerified: boolean;
    totalEarnedSol: number;
    unclaimedSol: number;
    totalClaimedSol: number;
    totalReferrals: number;
    activeReferrals: number;
    agentName?: string;
    agentType?: string;
    registeredAt?: string;
}
export interface ReferralInfo {
    referredUserPda: string;
    userWallet: string;
    affiliateCode: string;
    totalBetsSol: number;
    totalCommissionSol: number;
    firstBetAt: string;
    lastBetAt: string;
}
export interface AgentNetworkStats {
    totalAgentAffiliates: number;
    totalNetworkEarningsSol: number;
    totalReferrals: number;
    topAgents: AgentAffiliateProfile[];
}
export interface AffiliateCodeSuggestion {
    code: string;
    available: boolean;
    reason?: string;
}
/**
 * Check if an affiliate code is available
 */
export declare function isAffiliateCodeAvailable(code: string): Promise<boolean>;
/**
 * Generate suggested affiliate codes for an agent
 */
export declare function suggestAffiliateCodes(agentName: string, count?: number): Promise<AffiliateCodeSuggestion[]>;
/**
 * Get affiliate profile by code
 */
export declare function getAffiliateByCode(code: string): Promise<AgentAffiliateProfile | null>;
/**
 * Get affiliate profile(s) by owner wallet
 */
export declare function getAffiliatesByOwner(walletAddress: string): Promise<AgentAffiliateProfile[]>;
/**
 * Get all users referred by an affiliate
 */
export declare function getReferralsByAffiliate(affiliateCode: string): Promise<ReferralInfo[]>;
/**
 * Get overall agent affiliate network statistics
 */
export declare function getAgentNetworkStats(): Promise<AgentNetworkStats>;
/**
 * Format affiliate link for sharing between agents
 */
export declare function formatAffiliateLink(affiliateCode: string, marketPda?: string): string;
/**
 * Parse affiliate code from a referral link
 */
export declare function parseAffiliateCode(url: string): string | null;
/**
 * Get recommended affiliate code for an agent to use
 * Prefers verified/high-reputation affiliates
 */
export declare function getRecommendedAffiliate(): Promise<AgentAffiliateProfile | null>;
/**
 * Commission structure info for agents
 */
export declare function getCommissionInfo(): {
    affiliateFeeBps: number;
    affiliateFeePercent: string;
    description: string;
    example: string;
};
