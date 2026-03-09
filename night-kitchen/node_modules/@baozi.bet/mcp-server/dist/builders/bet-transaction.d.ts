/**
 * Bet Transaction Builder
 *
 * Builds unsigned transactions for placing bets on Baozi markets.
 * Agent builds, user signs. No private keys in agent.
 */
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
export interface BuildBetTransactionParams {
    marketPda: PublicKey;
    marketId: bigint;
    userWallet: PublicKey;
    outcome: 'yes' | 'no';
    amountSol: number;
    affiliatePda?: PublicKey;
    affiliateOwner?: PublicKey;
    whitelistRequired?: boolean;
}
export interface BuildBetTransactionResult {
    transaction: Transaction;
    positionPda: PublicKey;
    serializedTx: string;
}
/**
 * Build an unsigned bet transaction
 *
 * @param params - Transaction parameters
 * @param connection - Optional connection (will create if not provided)
 * @returns Unsigned transaction ready for user signing
 */
export declare function buildBetTransaction(params: BuildBetTransactionParams, connection?: Connection): Promise<BuildBetTransactionResult>;
/**
 * Simulate a bet transaction
 */
export declare function simulateBetTransaction(transaction: Transaction, userWallet: PublicKey, connection?: Connection): Promise<{
    success: boolean;
    logs: string[];
    unitsConsumed?: number;
    error?: string;
}>;
/**
 * Extract market_id from market account data
 * V4.7.6 Market struct layout:
 * - discriminator (8 bytes)
 * - market_id (u64, 8 bytes) <-- First field!
 * - question (string: 4 byte len + content)
 * - ...rest of fields
 */
export declare function extractMarketIdFromData(data: Buffer): bigint;
/**
 * Extract layer and access_gate from market data to determine if whitelist is needed
 * Returns { layer, accessGate }
 *
 * Layer values: 0 = Official, 1 = Lab, 2 = Private
 * AccessGate values: 0 = Public, 1 = Whitelist, 2 = InviteHash
 *
 * IMPORTANT: Only Private markets (layer=2) can have whitelist.
 * Lab and Official markets are ALWAYS public.
 */
export declare function extractMarketAccessInfo(data: Buffer): {
    layer: number;
    accessGate: number;
};
/**
 * Determine if whitelist is required for betting
 * ONLY Private markets (layer=2) with AccessGate::Whitelist need whitelist
 * Lab (layer=1) and Official (layer=0) markets are ALWAYS public
 */
export declare function isWhitelistRequired(data: Buffer): boolean;
export declare function extractAccessGateFromData(data: Buffer): number;
/**
 * Fetch market data and build bet transaction
 * Convenience function that handles market fetching and market_id extraction
 */
export declare function fetchAndBuildBetTransaction(params: {
    marketPda: string;
    userWallet: string;
    outcome: 'yes' | 'no';
    amountSol: number;
    affiliatePda?: string;
    affiliateOwner?: string;
    connection?: Connection;
}): Promise<{
    transaction: BuildBetTransactionResult | null;
    marketId: bigint;
    error?: string;
}>;
