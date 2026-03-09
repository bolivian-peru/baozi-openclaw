/**
 * Market Creation Handler
 *
 * Provides high-level functions for creating markets:
 * - Validation against v6.3 rules
 * - Fee calculation
 * - Transaction building
 * - PDA derivation helpers
 */
import { Connection } from '@solana/web3.js';
import { CreationValidationResult } from '../validation/creation-rules.js';
export interface MarketCreationPreview {
    validation: CreationValidationResult;
    marketPda?: string;
    marketId?: string;
    creationFeeSol: number;
    platformFeeBps: number;
    estimatedRentSol: number;
    totalCostSol: number;
    recommendedTiming?: {
        closingTime: string;
        resolutionTime: string;
    };
}
export interface CreateMarketRequest {
    question: string;
    layer: 'lab' | 'private';
    closingTime: string;
    resolutionTime?: string;
    marketType?: 'event' | 'measurement';
    eventTime?: string;
    measurementStart?: string;
    measurementEnd?: string;
    inviteHash?: string;
    creatorWallet: string;
}
export interface CreateRaceMarketRequest {
    question: string;
    outcomes: string[];
    closingTime: string;
    resolutionTime?: string;
    creatorWallet: string;
}
/**
 * Preview market creation - validates and returns costs without building tx
 */
export declare function previewMarketCreation(params: CreateMarketRequest, connection?: Connection): Promise<MarketCreationPreview>;
/**
 * Preview race market creation
 */
export declare function previewRaceMarketCreation(params: CreateRaceMarketRequest, connection?: Connection): Promise<MarketCreationPreview>;
/**
 * Build lab market creation transaction with full validation
 */
export declare function createLabMarket(params: CreateMarketRequest, connection?: Connection): Promise<{
    success: boolean;
    error?: string;
    validation: CreationValidationResult;
    transaction?: {
        serialized: string;
        marketPda: string;
        marketId: string;
    };
    simulation?: {
        success: boolean;
        error?: string;
        unitsConsumed?: number;
    };
}>;
/**
 * Build private market creation transaction
 */
export declare function createPrivateMarket(params: CreateMarketRequest, connection?: Connection): Promise<{
    success: boolean;
    error?: string;
    validation: CreationValidationResult;
    transaction?: {
        serialized: string;
        marketPda: string;
        marketId: string;
    };
    simulation?: {
        success: boolean;
        error?: string;
    };
}>;
/**
 * Build race market creation transaction
 */
export declare function createRaceMarket(params: CreateRaceMarketRequest, connection?: Connection): Promise<{
    success: boolean;
    error?: string;
    validation: CreationValidationResult;
    transaction?: {
        serialized: string;
        raceMarketPda: string;
        marketId: string;
    };
    simulation?: {
        success: boolean;
        error?: string;
    };
}>;
/**
 * Get creation fees for all layers
 */
export declare function getAllCreationFees(): {
    official: {
        sol: number;
        lamports: number;
    };
    lab: {
        sol: number;
        lamports: number;
    };
    private: {
        sol: number;
        lamports: number;
    };
};
/**
 * Get platform fees for all layers
 */
export declare function getAllPlatformFees(): {
    official: {
        bps: number;
        percent: string;
    };
    lab: {
        bps: number;
        percent: string;
    };
    private: {
        bps: number;
        percent: string;
    };
};
/**
 * Get timing constraints
 */
export declare function getTimingConstraints(): {
    minEventBufferHours: number;
    recommendedEventBufferHours: number;
    bettingFreezeSeconds: number;
    maxMarketDurationDays: number;
};
/**
 * Generate invite hash for private market
 */
export declare function generateInviteHash(): string;
/**
 * Derive invite link from hash
 */
export declare function getInviteLink(marketPda: string, inviteHash: string): string;
