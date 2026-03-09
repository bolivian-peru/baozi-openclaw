/**
 * Creator Profile Transaction Builders
 *
 * Builds unsigned transactions for:
 * - Creating creator profiles
 * - Updating creator profiles
 * - Claiming creator fees
 */
import { Connection, Transaction } from '@solana/web3.js';
/**
 * Build create_creator_profile transaction
 * Creates an on-chain creator profile for reputation and fee settings
 */
export declare function buildCreateCreatorProfileTransaction(params: {
    displayName: string;
    creatorFeeBps: number;
    creatorWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
    creatorProfilePda: string;
}>;
/**
 * Build update_creator_profile transaction
 * Updates display name and fee settings (both required per IDL)
 * IDL Accounts: creator_profile, owner (NO config!)
 */
export declare function buildUpdateCreatorProfileTransaction(params: {
    displayName: string;
    defaultFeeBps: number;
    creatorWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build claim_creator_sol transaction
 * Claims accumulated creator fees from sol_treasury
 * IDL Accounts: config, creator_profile, sol_treasury, owner, system_program
 */
export declare function buildClaimCreatorTransaction(params: {
    creatorWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
