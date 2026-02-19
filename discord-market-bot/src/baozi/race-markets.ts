/**
 * Race (multi-outcome) market decoder and fetcher
 */
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  PROGRAM_ID,
  RPC_ENDPOINT,
  DISCRIMINATORS,
  MARKET_STATUS_NAMES,
  MARKET_LAYER_NAMES,
  lamportsToSol,
  round2,
  round4,
} from './config.js';
import type { RaceMarket, RaceOutcome } from './types.js';

/**
 * Decode RaceMarket account data
 */
function decodeRaceMarket(data: Buffer, pubkey: PublicKey): RaceMarket | null {
  try {
    if (data.length < 500) return null;

    let offset = 8; // Skip discriminator

    // market_id (u64)
    const marketId = data.readBigUInt64LE(offset);
    offset += 8;

    // question (String)
    const questionLen = data.readUInt32LE(offset);
    offset += 4;
    if (questionLen > 500 || questionLen + offset > data.length) return null;
    const question = data.slice(offset, offset + questionLen).toString('utf8');
    offset += questionLen;

    // closing_time (i64)
    const closingTime = data.readBigInt64LE(offset);
    offset += 8;

    // resolution_time (i64)
    const resolutionTime = data.readBigInt64LE(offset);
    offset += 8;

    // auto_stop_buffer (i64) - skip
    offset += 8;

    // outcome_count (u8)
    const outcomeCount = data.readUInt8(offset);
    offset += 1;

    // outcome_labels: [[u8; 32]; 10] = 320 bytes FIXED
    const outcomeLabels: string[] = [];
    for (let i = 0; i < 10; i++) {
      const labelBytes = data.slice(offset, offset + 32);
      let labelEnd = 32;
      for (let j = 0; j < 32; j++) {
        if (labelBytes[j] === 0) { labelEnd = j; break; }
      }
      if (i < outcomeCount) {
        outcomeLabels.push(labelBytes.slice(0, labelEnd).toString('utf8'));
      }
      offset += 32;
    }

    // outcome_pools: [u64; 10] = 80 bytes FIXED
    const outcomePools: bigint[] = [];
    for (let i = 0; i < 10; i++) {
      const pool = data.readBigUInt64LE(offset);
      if (i < outcomeCount) outcomePools.push(pool);
      offset += 8;
    }

    // total_pool (u64)
    const totalPoolLamports = data.readBigUInt64LE(offset);
    offset += 8;

    // snapshot_pools + snapshot_total (88 bytes) - skip
    offset += 88;

    // status (enum, 1)
    const statusCode = data.readUInt8(offset);
    offset += 1;

    // winning_outcome (Option<u8>)
    const hasWinningOutcome = data.readUInt8(offset);
    offset += 1;
    let winningOutcomeIndex: number | null = null;
    if (hasWinningOutcome === 1) {
      winningOutcomeIndex = data.readUInt8(offset);
      offset += 1;
    }

    // currency_type (1)
    offset += 1;
    // platform_fee_collected (8)
    offset += 8;
    // creator_fee_collected (8)
    offset += 8;
    // total_claimed (8)
    offset += 8;
    // last_bet_time (8)
    offset += 8;
    // bump (1)
    offset += 1;

    // layer (enum, 1)
    const layerCode = data.readUInt8(offset);
    offset += 1;

    // resolution_mode (1)
    offset += 1;
    // access_gate (1)
    offset += 1;

    // creator (Pubkey, 32)
    const creator = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // oracle_host (Option<Pubkey>)
    const hasOracleHost = data.readUInt8(offset);
    offset += 1;
    if (hasOracleHost === 1) offset += 32;

    // council (160)
    offset += 160;
    // council_size (1)
    offset += 1;
    // council_votes ([u8; 10], 10)
    offset += 10;
    // council_threshold (1)
    offset += 1;
    // creator_fee_bps (2)
    offset += 2;

    // creator_profile (Option<Pubkey>)
    const hasCreatorProfile = data.readUInt8(offset);
    offset += 1;
    if (hasCreatorProfile === 1) offset += 32;

    // platform_fee_bps_at_creation (u16)
    const platformFeeBps = data.readUInt16LE(offset);

    // Derived fields
    const totalPoolSol = lamportsToSol(totalPoolLamports);

    const outcomes: RaceOutcome[] = outcomeLabels.map((label, i) => {
      const poolSol = lamportsToSol(outcomePools[i] || 0n);
      const percent = totalPoolSol > 0 ? (poolSol / totalPoolSol) * 100 : 100 / outcomeLabels.length;
      return {
        index: i,
        label,
        poolSol: round4(poolSol),
        percent: round2(percent),
      };
    });

    const now = BigInt(Math.floor(Date.now() / 1000));
    const freezeTime = closingTime - 300n;
    const isBettingOpen = statusCode === 0 && now < freezeTime;

    return {
      publicKey: pubkey.toBase58(),
      marketId: marketId.toString(),
      question,
      outcomes,
      closingTime: new Date(Number(closingTime) * 1000).toISOString(),
      resolutionTime: new Date(Number(resolutionTime) * 1000).toISOString(),
      status: MARKET_STATUS_NAMES[statusCode] || 'Unknown',
      statusCode,
      winningOutcomeIndex,
      totalPoolSol: round4(totalPoolSol),
      layer: MARKET_LAYER_NAMES[layerCode] || 'Unknown',
      layerCode,
      creator: creator.toBase58(),
      platformFeeBps,
      isBettingOpen,
    };
  } catch (err) {
    console.error('Error decoding race market:', err);
    return null;
  }
}

/**
 * List all race markets
 */
export async function listRaceMarkets(status?: string): Promise<RaceMarket[]> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(DISCRIMINATORS.RACE_MARKET),
        },
      },
    ],
  });

  const markets: RaceMarket[] = [];

  for (const { account, pubkey } of accounts) {
    const market = decodeRaceMarket(account.data as Buffer, pubkey);
    if (market) {
      if (!status || market.status.toLowerCase() === status.toLowerCase()) {
        markets.push(market);
      }
    }
  }

  markets.sort((a, b) => {
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    return new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime();
  });

  return markets;
}

/**
 * Get a specific race market
 */
export async function getRaceMarket(publicKey: string): Promise<RaceMarket | null> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  try {
    const pubkey = new PublicKey(publicKey);
    const account = await connection.getAccountInfo(pubkey);
    if (!account) return null;
    return decodeRaceMarket(account.data as Buffer, pubkey);
  } catch {
    return null;
  }
}
