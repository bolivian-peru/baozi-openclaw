/**
 * Dispute Transaction Builders
 *
 * IMPORTANT: Account structures verified against IDL v4.7.6
 */
import { Connection, Transaction } from '@solana/web3.js';
/**
 * Build flag_dispute transaction
 * IDL Accounts: config, market, dispute_meta, authority
 */
export declare function buildFlagDisputeTransaction(params: {
    marketPda: string;
    disputerWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build vote_council transaction
 * IDL Accounts: config, market, council_vote, dispute_meta, voter, system_program
 */
export declare function buildVoteCouncilTransaction(params: {
    marketPda: string;
    voteYes: boolean;
    voterWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build change_council_vote transaction
 * IDL Accounts: config, market, council_vote, dispute_meta, voter
 */
export declare function buildChangeCouncilVoteTransaction(params: {
    marketPda: string;
    newVoteYes: boolean;
    voterWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build flag_race_dispute transaction
 * IDL Accounts: config, race_market, dispute_meta, authority
 */
export declare function buildFlagRaceDisputeTransaction(params: {
    raceMarketPda: string;
    disputerWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build vote_council_race transaction
 * IDL Accounts: config, race_market, vote_record, dispute_meta, voter, system_program
 */
export declare function buildVoteCouncilRaceTransaction(params: {
    raceMarketPda: string;
    voteOutcomeIndex: number;
    voterWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
/**
 * Build change_council_vote_race transaction
 */
export declare function buildChangeCouncilVoteRaceTransaction(params: {
    raceMarketPda: string;
    newVoteOutcomeIndex: number;
    voterWallet: string;
    connection?: Connection;
}): Promise<{
    transaction: Transaction;
    serializedTx: string;
}>;
