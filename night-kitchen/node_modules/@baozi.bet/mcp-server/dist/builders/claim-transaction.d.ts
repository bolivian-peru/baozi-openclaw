/**
 * Claim Transaction Builders
 *
 * Builds unsigned transactions for:
 * - Claiming winnings
 * - Claiming refunds
 * - Claiming affiliate earnings
 * - Claiming creator fees
 */
import { Connection, Transaction } from '@solana/web3.js';
export interface ClaimTransactionResult {
    transaction: Transaction;
    serializedTx: string;
    claimType: 'winnings' | 'refund' | 'affiliate' | 'creator';
}
/**
 * Build claim_winnings_sol transaction
 */
export declare function buildClaimWinningsTransaction(params: {
    marketPda: string;
    positionPda: string;
    userWallet: string;
    connection?: Connection;
}): Promise<ClaimTransactionResult>;
/**
 * Build claim_refund_sol transaction
 */
export declare function buildClaimRefundTransaction(params: {
    marketPda: string;
    positionPda: string;
    userWallet: string;
    connection?: Connection;
}): Promise<ClaimTransactionResult>;
/**
 * Build claim_affiliate_sol transaction
 */
export declare function buildClaimAffiliateTransaction(params: {
    affiliateCode: string;
    userWallet: string;
    connection?: Connection;
}): Promise<ClaimTransactionResult>;
/**
 * Build batch claim transaction for multiple positions
 */
export declare function buildBatchClaimTransaction(params: {
    claims: Array<{
        marketPda: string;
        positionPda: string;
        claimType: 'winnings' | 'refund';
    }>;
    userWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
    claimCount: number;
}>;
