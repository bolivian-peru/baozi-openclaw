/**
 * Affiliate Transaction Builders
 *
 * Builds unsigned transactions for:
 * - Registering as an affiliate
 * - Toggling affiliate active status
 */
import { Connection, Transaction } from '@solana/web3.js';
export interface RegisterAffiliateResult {
    transaction: Transaction;
    serializedTx: string;
    affiliatePda: string;
    code: string;
}
/**
 * Build register_affiliate transaction
 *
 * Registers a new affiliate with a unique code.
 * The code must be 3-16 alphanumeric characters.
 */
export declare function buildRegisterAffiliateTransaction(params: {
    code: string;
    userWallet: string;
    connection?: Connection;
}): Promise<RegisterAffiliateResult>;
/**
 * Build toggle_affiliate transaction
 *
 * Toggles an affiliate's active status (active/inactive).
 */
export declare function buildToggleAffiliateTransaction(params: {
    code: string;
    active: boolean;
    userWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
    affiliatePda: string;
    newStatus: boolean;
}>;
