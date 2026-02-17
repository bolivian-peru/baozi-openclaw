/**
 * Baozi Protocol Constants
 * Derived from Baozi MCP Server V4.7.6
 */
import { PublicKey } from '@solana/web3.js';

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

export const PROGRAM_ID = new PublicKey('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');

// =============================================================================
// PDA SEEDS
// =============================================================================

export const SEEDS = {
  CONFIG: Buffer.from('config'),
  MARKET: Buffer.from('market'),
  POSITION: Buffer.from('position'),
  RACE: Buffer.from('race'),
  RACE_POSITION: Buffer.from('race_position'),
  WHITELIST: Buffer.from('whitelist'),
  RACE_WHITELIST: Buffer.from('race_whitelist'),
  AFFILIATE: Buffer.from('affiliate'),
  CREATOR_PROFILE: Buffer.from('creator_profile'),
  SOL_TREASURY: Buffer.from('sol_treasury'),
  REVENUE_CONFIG: Buffer.from('revenue_config'),
  DISPUTE_META: Buffer.from('dispute_meta'),
} as const;

// =============================================================================
// ACCOUNT DISCRIMINATORS (first 8 bytes of sha256 hash)
// =============================================================================

export const DISCRIMINATORS = {
  // Boolean Market
  MARKET: Buffer.from([219, 190, 213, 55, 0, 227, 198, 154]),
  
  // User Position (Boolean)
  USER_POSITION: Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]),
  
  // Affiliate - SHA256("account:Affiliate")
  AFFILIATE: Buffer.from([136, 95, 107, 149, 36, 195, 146, 35]),
} as const;

// =============================================================================
// MARKET CONSTANTS
// =============================================================================

export const MARKET_STATUS_NAMES: Record<number, string> = {
  0: 'Active',
  1: 'Closed',
  2: 'Resolved',
  3: 'Cancelled',
  4: 'Paused',
  5: 'ResolvedPending',
  6: 'Disputed',
};

export const MARKET_OUTCOME_NAMES: Record<number, string> = {
  0: 'Undecided',
  1: 'Invalid',
  2: 'Yes',
  3: 'No',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1_000_000_000;
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1_000_000_000));
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
