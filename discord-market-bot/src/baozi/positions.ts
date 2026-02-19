/**
 * Position decoder and fetcher
 */
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  PROGRAM_ID,
  RPC_ENDPOINT,
  DISCRIMINATORS,
  lamportsToSol,
  round4,
} from './config.js';
import { getMarket } from './markets.js';
import type { Position, PositionSummary } from './types.js';

/**
 * Decode UserPosition account data
 */
function decodePosition(data: Buffer, pubkey: PublicKey): Position | null {
  try {
    let offset = 8; // Skip discriminator

    // user (Pubkey, 32)
    const user = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // market_id (u64)
    const marketId = data.readBigUInt64LE(offset);
    offset += 8;

    // yes_amount (u64)
    const yesAmount = data.readBigUInt64LE(offset);
    offset += 8;

    // no_amount (u64)
    const noAmount = data.readBigUInt64LE(offset);
    offset += 8;

    // claimed (bool)
    const claimed = data.readUInt8(offset) === 1;

    const yesAmountSol = round4(lamportsToSol(yesAmount));
    const noAmountSol = round4(lamportsToSol(noAmount));
    const totalAmountSol = round4(yesAmountSol + noAmountSol);

    let side: 'Yes' | 'No' | 'Both';
    if (yesAmount > 0n && noAmount > 0n) side = 'Both';
    else if (yesAmount > 0n) side = 'Yes';
    else side = 'No';

    return {
      publicKey: pubkey.toBase58(),
      user: user.toBase58(),
      marketId: marketId.toString(),
      yesAmountSol,
      noAmountSol,
      totalAmountSol,
      side,
      claimed,
    };
  } catch (err) {
    console.error('Error decoding position:', err);
    return null;
  }
}

/**
 * Derive market PDA from market_id
 */
function deriveMarketPda(marketId: string): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), buf],
    PROGRAM_ID
  );
  return pda.toBase58();
}

/**
 * Get all positions for a wallet
 */
export async function getPositions(walletAddress: string): Promise<Position[]> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    const wallet = new PublicKey(walletAddress);

    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: bs58.encode(DISCRIMINATORS.USER_POSITION),
          },
        },
        {
          memcmp: {
            offset: 8,
            bytes: wallet.toBase58(),
          },
        },
      ],
    });

    const positions: Position[] = [];

    for (const { account, pubkey } of accounts) {
      const position = decodePosition(account.data as Buffer, pubkey);
      if (position) positions.push(position);
    }

    positions.sort((a, b) => Number(BigInt(b.marketId) - BigInt(a.marketId)));
    return positions;
  } catch (err) {
    console.error('Error fetching positions:', err);
    return [];
  }
}

/**
 * Get position summary with enriched market data
 */
export async function getPositionSummary(walletAddress: string): Promise<PositionSummary> {
  const positions = await getPositions(walletAddress);

  // Derive PDAs and enrich with market data
  const enriched: Position[] = [];
  const uniqueMarkets = [...new Set(positions.map(p => deriveMarketPda(p.marketId)))];
  const marketMap = new Map<string, Awaited<ReturnType<typeof getMarket>>>();

  // Batch fetch (limited concurrency)
  const batchSize = 5;
  for (let i = 0; i < uniqueMarkets.length; i += batchSize) {
    const batch = uniqueMarkets.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(pda => getMarket(pda)));
    batch.forEach((pda, idx) => { if (results[idx]) marketMap.set(pda, results[idx]); });
  }

  let winningPositions = 0;
  let losingPositions = 0;
  let pendingPositions = 0;

  for (const pos of positions) {
    const pda = deriveMarketPda(pos.marketId);
    const market = marketMap.get(pda);
    const enrichedPos: Position = {
      ...pos,
      marketPda: pda,
      marketQuestion: market?.question,
      marketStatus: market?.status,
      marketOutcome: market?.winningOutcome,
    };
    enriched.push(enrichedPos);

    if (!market || market.status === 'Active' || market.status === 'Closed') {
      pendingPositions++;
    } else if (market.status === 'Resolved') {
      if (market.winningOutcome === pos.side) winningPositions++;
      else losingPositions++;
    } else {
      pendingPositions++;
    }
  }

  return {
    wallet: walletAddress,
    totalPositions: enriched.length,
    totalBetSol: round4(enriched.reduce((s, p) => s + p.totalAmountSol, 0)),
    activePositions: enriched.filter(p => !p.claimed).length,
    winningPositions,
    losingPositions,
    pendingPositions,
    positions: enriched,
  };
}
