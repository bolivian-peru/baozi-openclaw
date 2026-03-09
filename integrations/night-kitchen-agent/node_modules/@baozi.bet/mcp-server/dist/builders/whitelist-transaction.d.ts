/**
 * Whitelist Transaction Builders
 *
 * IMPORTANT: Account structures verified against IDL v4.7.6
 */
import { Connection, Transaction } from '@solana/web3.js';
/**
 * Build add_to_whitelist transaction
 * IDL Accounts: market, whitelist, creator
 */
export declare function buildAddToWhitelistTransaction(params: {
    marketPda: string;
    userToAdd: string;
    creatorWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
    whitelistPda: string;
}>;
/**
 * Build remove_from_whitelist transaction
 * IDL Accounts: market, whitelist, creator
 */
export declare function buildRemoveFromWhitelistTransaction(params: {
    marketPda: string;
    userToRemove: string;
    creatorWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build create_race_whitelist transaction
 * IDL Accounts: race_market, whitelist, creator, system_program
 */
export declare function buildCreateRaceWhitelistTransaction(params: {
    raceMarketPda: string;
    creatorWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
    whitelistPda: string;
}>;
/**
 * Build add_to_race_whitelist transaction
 * IDL Accounts: race_market, whitelist, creator
 */
export declare function buildAddToRaceWhitelistTransaction(params: {
    raceMarketPda: string;
    userToAdd: string;
    creatorWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build remove_from_race_whitelist transaction
 * IDL Accounts: race_market, whitelist, creator
 */
export declare function buildRemoveFromRaceWhitelistTransaction(params: {
    raceMarketPda: string;
    userToRemove: string;
    creatorWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
