import { Market } from './markets.js';
export interface ResolutionStatus {
    marketPda: string;
    marketQuestion: string;
    status: string;
    isResolved: boolean;
    winningOutcome: string | null;
    proposedOutcome: string | null;
    closingTime: string;
    resolutionTime: string;
    canBeResolved: boolean;
    resolutionWindowOpen: boolean;
    isDisputed: boolean;
    disputeDeadline: string | null;
    disputeReason: string | null;
    councilSize: number;
    councilVotesYes: number;
    councilVotesNo: number;
    councilThreshold: number;
    resolutionMode: 'Creator' | 'Oracle' | 'Council' | 'Admin';
}
export interface DisputeMeta {
    publicKey: string;
    marketPda: string;
    disputer: string;
    reason: string;
    proposedOutcome: boolean | null;
    createdAt: string;
    deadline: string;
    resolved: boolean;
}
/**
 * Get detailed resolution status for a market
 */
export declare function getResolutionStatus(marketPda: string): Promise<ResolutionStatus | null>;
/**
 * Get all disputed markets
 */
export declare function getDisputedMarkets(): Promise<DisputeMeta[]>;
/**
 * Get markets pending resolution (closed but not resolved)
 */
export declare function getMarketsAwaitingResolution(): Promise<Market[]>;
