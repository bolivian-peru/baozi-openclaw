/**
 * Wallet helpers: load keypair from SOLANA_PRIVATE_KEY env var.
 * Accepts either base58 string (64-byte secret key) or JSON array.
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export function loadKeypair() {
  const key = process.env.SOLANA_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      'SOLANA_PRIVATE_KEY environment variable is required for this command.\n' +
      'Export a base58-encoded 64-byte secret key or a JSON array of 64 numbers.'
    );
  }

  // JSON array form
  if (key.trim().startsWith('[')) {
    const arr = JSON.parse(key);
    if (!Array.isArray(arr) || arr.length !== 64) {
      throw new Error('SOLANA_PRIVATE_KEY JSON array must have exactly 64 numbers');
    }
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }

  // Base58 form
  const decoded = bs58.decode(key.trim());
  if (decoded.length !== 64) {
    throw new Error(`SOLANA_PRIVATE_KEY must decode to 64 bytes, got ${decoded.length}`);
  }
  return Keypair.fromSecretKey(decoded);
}

export function getRpcUrl() {
  return (
    process.env.SOLANA_RPC_URL ||
    process.env.HELIUS_RPC_URL ||
    'https://api.mainnet-beta.solana.com'
  );
}
