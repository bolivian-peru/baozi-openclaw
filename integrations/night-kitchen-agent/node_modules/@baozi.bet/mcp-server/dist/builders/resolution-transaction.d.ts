/**
 * Resolution Transaction Builders
 *
 * IMPORTANT: Account structures verified against IDL v4.7.6
 */
import { Connection, Transaction } from '@solana/web3.js';
/**
 * Build propose_resolution transaction
 * IDL Accounts: config, market, dispute_meta, authority, system_program
 */
export declare function buildProposeResolutionTransaction(params: {
    marketPda: string;
    outcome: boolean;
    proposerWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build propose_resolution_host transaction
 * IDL Accounts: config, market, dispute_meta, host, system_program
 */
export declare function buildProposeResolutionHostTransaction(params: {
    marketPda: string;
    outcome: boolean;
    oracleWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build resolve_market transaction
 * IDL Accounts: config, market, authority
 */
export declare function buildResolveMarketTransaction(params: {
    marketPda: string;
    outcome: boolean;
    resolverWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build resolve_market_host transaction
 * IDL Accounts: config, market, host
 */
export declare function buildResolveMarketHostTransaction(params: {
    marketPda: string;
    outcome: boolean;
    oracleWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build finalize_resolution transaction
 * IDL Accounts: market, dispute_meta, finalizer
 */
export declare function buildFinalizeResolutionTransaction(params: {
    marketPda: string;
    callerWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build propose_race_resolution transaction
 * IDL Accounts: config, race_market, dispute_meta, resolver, system_program
 */
export declare function buildProposeRaceResolutionTransaction(params: {
    raceMarketPda: string;
    winningOutcomeIndex: number;
    proposerWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build resolve_race transaction (direct resolve by creator)
 * IDL Accounts: config, race_market, authority
 */
export declare function buildResolveRaceTransaction(params: {
    raceMarketPda: string;
    winningOutcomeIndex: number;
    resolverWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build finalize_race_resolution transaction
 * IDL Accounts: race_market, dispute_meta, finalizer
 */
export declare function buildFinalizeRaceResolutionTransaction(params: {
    raceMarketPda: string;
    callerWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
