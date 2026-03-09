/**
 * Market Creation Transaction Builders
 *
 * Builds unsigned transactions for:
 * - create_lab_market_sol (community markets)
 * - create_private_table_sol (invite-only markets)
 * - create_race_market_sol (multi-outcome markets)
 *
 * FIXED: Jan 2026 - Corrected discriminators, offsets, and instruction formats
 */
import { Connection, Transaction } from '@solana/web3.js';
export interface CreateMarketResult {
    transaction: Transaction;
    serializedTx: string;
    marketPda: string;
    marketId: bigint;
}
export interface CreateLabMarketParams {
    question: string;
    closingTime: Date;
    resolutionBuffer?: number;
    autoStopBuffer?: number;
    resolutionMode?: number;
    council?: string[];
    councilThreshold?: number;
    creatorWallet: string;
}
export interface CreatePrivateMarketParams {
    question: string;
    closingTime: Date;
    resolutionBuffer?: number;
    autoStopBuffer?: number;
    resolutionMode?: number;
    council?: string[];
    councilThreshold?: number;
    creatorWallet: string;
}
export interface CreateRaceMarketParams {
    question: string;
    outcomes: string[];
    closingTime: Date;
    resolutionBuffer?: number;
    autoStopBuffer?: number;
    layer?: number;
    resolutionMode?: number;
    accessGate?: number;
    council?: string[];
    councilThreshold?: number;
    creatorWallet: string;
}
export declare function getNextMarketId(connection?: Connection): Promise<{
    marketId: bigint;
    raceMarketId: bigint;
}>;
export declare function buildCreateLabMarketTransaction(params: CreateLabMarketParams, connection?: Connection): Promise<CreateMarketResult>;
export declare function buildCreatePrivateMarketTransaction(params: CreatePrivateMarketParams, connection?: Connection): Promise<CreateMarketResult>;
export declare function buildCreateRaceMarketTransaction(params: CreateRaceMarketParams, connection?: Connection): Promise<CreateMarketResult>;
export declare function previewMarketPda(marketId: bigint): {
    marketPda: string;
    bump: number;
};
export declare function previewRaceMarketPda(marketId: bigint): {
    raceMarketPda: string;
    bump: number;
};
