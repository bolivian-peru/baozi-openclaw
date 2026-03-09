/**
 * Market Management Transaction Builders
 *
 * Builds unsigned transactions for:
 * - Closing markets (stopping betting)
 * - Extending market deadlines
 */
import { Connection, Transaction } from '@solana/web3.js';
/**
 * Build close_market transaction
 * Stops betting on a market (usually done by creator before resolution)
 */
export declare function buildCloseMarketTransaction(params: {
    marketPda: string;
    callerWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build extend_market transaction
 * Extends the closing time and/or resolution time
 */
export declare function buildExtendMarketTransaction(params: {
    marketPda: string;
    newClosingTime: number;
    newResolutionTime?: number;
    callerWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build close_race_market transaction
 */
export declare function buildCloseRaceMarketTransaction(params: {
    raceMarketPda: string;
    callerWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build extend_race_market transaction
 */
export declare function buildExtendRaceMarketTransaction(params: {
    raceMarketPda: string;
    newClosingTime: number;
    newResolutionTime?: number;
    callerWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build cancel_market transaction
 * Cancels a market and allows all bettors to claim refunds.
 * Only callable by admin or creator (depending on market status).
 */
export declare function buildCancelMarketTransaction(params: {
    marketPda: string;
    reason: string;
    authorityWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build cancel_race transaction
 * Cancels a race market and allows all bettors to claim refunds.
 */
export declare function buildCancelRaceTransaction(params: {
    raceMarketPda: string;
    reason: string;
    authorityWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
