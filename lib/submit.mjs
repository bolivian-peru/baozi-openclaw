/**
 * Sign and submit a base64-encoded unsigned transaction from the MCP server.
 *
 * The MCP server's build_* tools return objects containing a base64 transaction.
 * This helper deserializes, signs with the local keypair, and submits.
 */

import {
  Connection,
  VersionedTransaction,
  Transaction,
} from '@solana/web3.js';
import { loadKeypair, getRpcUrl } from './wallet.mjs';

/**
 * Deserialize a base64 transaction, trying VersionedTransaction first,
 * falling back to legacy Transaction.
 */
function deserializeTx(base64) {
  const buf = Buffer.from(base64, 'base64');
  try {
    return { tx: VersionedTransaction.deserialize(buf), versioned: true };
  } catch {
    return { tx: Transaction.from(buf), versioned: false };
  }
}

/**
 * Extract base64 transaction string from common MCP tool response shapes.
 */
function extractTxBase64(result) {
  if (typeof result === 'string') return result;
  return (
    result?.transaction ||
    result?.tx ||
    result?.unsignedTransaction ||
    result?.data?.transaction ||
    null
  );
}

/**
 * Sign and submit a transaction returned by an MCP build_* tool.
 * Returns the submitted transaction signature.
 */
export async function signAndSubmit(mcpResult, { commitment = 'confirmed' } = {}) {
  const base64 = extractTxBase64(mcpResult);
  if (!base64) {
    throw new Error(
      'No transaction found in MCP result.\n' +
      JSON.stringify(mcpResult, null, 2)
    );
  }

  const keypair = loadKeypair();
  const connection = new Connection(getRpcUrl(), commitment);

  const { tx, versioned } = deserializeTx(base64);

  // Refresh blockhash to reduce expiry risk between build and sign
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);

  if (versioned) {
    tx.message.recentBlockhash = blockhash;
    tx.sign([keypair]);
  } else {
    tx.recentBlockhash = blockhash;
    tx.feePayer = keypair.publicKey;
    tx.sign(keypair);
  }

  const raw = tx.serialize();
  const sig = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
    maxRetries: 3,
  });

  await connection.confirmTransaction({
    signature: sig,
    blockhash,
    lastValidBlockHeight,
  }, commitment);

  return sig;
}
