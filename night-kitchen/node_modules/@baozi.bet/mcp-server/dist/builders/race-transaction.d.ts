/**
 * Race Market Transaction Builders
 *
 * Builds unsigned transactions for:
 * - Placing bets on race (multi-outcome) markets
 * - Claiming race winnings
 * - Claiming race refunds
 */
import { Connection, Transaction } from '@solana/web3.js';
export interface RaceBetTransactionResult {
    transaction: Transaction;
    serializedTx: string;
    positionPda: string;
    marketId: bigint;
}
/**
 * Build bet_on_race_outcome_sol transaction
 */
export declare function buildRaceBetTransaction(params: {
    raceMarketPda: string;
    marketId: bigint;
    outcomeIndex: number;
    amountSol: number;
    userWallet: string;
    whitelistRequired?: boolean;
    affiliatePda?: string;
    connection?: Connection;
}): Promise<RaceBetTransactionResult>;
/**
 * Fetch race market data and build bet transaction
 */
export declare function fetchAndBuildRaceBetTransaction(params: {
    raceMarketPda: string;
    outcomeIndex: number;
    amountSol: number;
    userWallet: string;
    affiliatePda?: string;
    connection?: Connection;
}): Promise<{
    transaction: RaceBetTransactionResult | null;
    marketId: bigint;
    error?: string;
}>;
/**
 * Build claim_race_winnings_sol transaction
 */
export declare function buildClaimRaceWinningsTransaction(params: {
    raceMarketPda: string;
    positionPda: string;
    userWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build claim_race_refund transaction
 */
export declare function buildClaimRaceRefundTransaction(params: {
    raceMarketPda: string;
    positionPda: string;
    userWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
