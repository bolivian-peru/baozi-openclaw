import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export const PROGRAM_ID = new PublicKey('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');

export const SEEDS = {
  MARKET: Buffer.from('market'),
  POSITION: Buffer.from('position'),
  RACE_POSITION: Buffer.from('race_position'),
} as const;

export const DISCRIMINATORS = {
  // Boolean Market
  MARKET: Buffer.from([219, 190, 213, 55, 0, 227, 198, 154]),
  // User Position (Boolean)
  USER_POSITION: Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]),
  // Race Market
  RACE_MARKET: Buffer.from([235, 196, 111, 75, 230, 113, 118, 238]),
  // Race Position
  RACE_POSITION: Buffer.from([44, 182, 16, 1, 230, 14, 174, 46]),
} as const;

export const MARKET_STATUS_NAMES: Record<number, string> = {
  0: 'Active', 1: 'Closed', 2: 'Resolved', 3: 'Cancelled',
  4: 'Paused', 5: 'ResolvedPending', 6: 'Disputed',
};

export const MARKET_LAYER_NAMES: Record<number, string> = {
  0: 'Official', 1: 'Lab', 2: 'Private',
};

export const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1_000_000_000;
}
