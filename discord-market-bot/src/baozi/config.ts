/**
 * Baozi on-chain configuration
 * Program ID, discriminators, constants for V4.7.6 mainnet
 */
import { PublicKey } from '@solana/web3.js';

// Network
export const PROGRAM_ID = new PublicKey(
  process.env.BAOZI_PROGRAM_ID || 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ'
);

export const RPC_ENDPOINT =
  process.env.HELIUS_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  'https://api.mainnet-beta.solana.com';

// Account discriminators (first 8 bytes of sha256 hash)
export const DISCRIMINATORS = {
  MARKET: Buffer.from([219, 190, 213, 55, 0, 227, 198, 154]),
  RACE_MARKET: Buffer.from([235, 196, 111, 75, 230, 113, 118, 238]),
  USER_POSITION: Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]),
  RACE_POSITION: Buffer.from([44, 182, 16, 1, 230, 14, 174, 46]),
} as const;

// Enums
export const MARKET_STATUS_NAMES: Record<number, string> = {
  0: 'Active',
  1: 'Closed',
  2: 'Resolved',
  3: 'Cancelled',
  4: 'Paused',
  5: 'ResolvedPending',
  6: 'Disputed',
};

export const MARKET_LAYER_NAMES: Record<number, string> = {
  0: 'Official',
  1: 'Lab',
  2: 'Private',
};

// Helpers
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
