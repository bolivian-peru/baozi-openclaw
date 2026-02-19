/**
 * Boolean market decoder and fetcher
 * Reads directly from Solana V4.7.6 program
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
import type { Market } from './types.js';

/**
 * Decode boolean Market account data from V4.7.6 struct
 */
function decodeMarket(data: Buffer, pubkey: PublicKey): Market | null {
  try {
    let offset = 8; // Skip discriminator

    // market_id (u64)
    const marketId = data.readBigUInt64LE(offset);
    offset += 8;

    // question (String: 4 byte len + UTF-8 bytes)
    const questionLen = data.readUInt32LE(offset);
    offset += 4;
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

    // yes_pool (u64)
    const yesPool = data.readBigUInt64LE(offset);
    offset += 8;

    // no_pool (u64)
    const noPool = data.readBigUInt64LE(offset);
    offset += 8;

    // snapshot pools - skip
    offset += 16;

    // status (enum, 1 byte)
    const statusCode = data.readUInt8(offset);
    offset += 1;

    // winning_outcome (Option<bool>)
    const hasWinningOutcome = data.readUInt8(offset);
    offset += 1;
    let winningOutcome: boolean | null = null;
    if (hasWinningOutcome === 1) {
      winningOutcome = data.readUInt8(offset) === 1;
      offset += 1;
    }

    // currency_type (enum, 1)
    offset += 1;
    // _reserved_usdc_vault (33)
    offset += 33;
    // creator_bond, total_claimed, platform_fee_collected, last_bet_time (4 * 8)
    offset += 32;
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

    // council (5 * 32 = 160)
    offset += 160;
    // council sizes (4)
    offset += 4;
    // total_affiliate_fees (8)
    offset += 8;

    // invite_hash (Option<[u8;32]>)
    const hasInviteHash = data.readUInt8(offset);
    offset += 1;
    if (hasInviteHash === 1) offset += 32;

    // creator_fee_bps (u16)
    offset += 2;
    // total_creator_fees (u64)
    offset += 8;

    // creator_profile (Option<Pubkey>)
    const hasCreatorProfile = data.readUInt8(offset);
    offset += 1;
    if (hasCreatorProfile === 1) offset += 32;

    // platform_fee_bps_at_creation (u16)
    const platformFeeBps = data.readUInt16LE(offset);
    offset += 2;
    // affiliate_fee_bps_at_creation (u16)
    offset += 2;

    // betting_freeze_seconds_at_creation (i64)
    const bettingFreezeSeconds = data.readBigInt64LE(offset);
    offset += 8;

    // has_bets (bool)
    const hasBets = data.readUInt8(offset) === 1;

    // Derived fields
    const yesPoolSol = lamportsToSol(yesPool);
    const noPoolSol = lamportsToSol(noPool);
    const totalPoolSol = yesPoolSol + noPoolSol;
    const yesPercent = totalPoolSol > 0 ? (yesPoolSol / totalPoolSol) * 100 : 50;
    const noPercent = totalPoolSol > 0 ? (noPoolSol / totalPoolSol) * 100 : 50;

    const now = BigInt(Math.floor(Date.now() / 1000));
    const freezeTime = closingTime - bettingFreezeSeconds;
    const isBettingOpen = statusCode === 0 && now < freezeTime;

    const status = MARKET_STATUS_NAMES[statusCode] || 'Unknown';
    const layer = MARKET_LAYER_NAMES[layerCode] || 'Unknown';

    let winningOutcomeStr: string | null = null;
    if (winningOutcome !== null) {
      winningOutcomeStr = winningOutcome ? 'Yes' : 'No';
    }

    return {
      publicKey: pubkey.toBase58(),
      marketId: marketId.toString(),
      question,
      closingTime: new Date(Number(closingTime) * 1000).toISOString(),
      resolutionTime: new Date(Number(resolutionTime) * 1000).toISOString(),
      status,
      statusCode,
      winningOutcome: winningOutcomeStr,
      yesPoolSol: round4(yesPoolSol),
      noPoolSol: round4(noPoolSol),
      totalPoolSol: round4(totalPoolSol),
      yesPercent: round2(yesPercent),
      noPercent: round2(noPercent),
      platformFeeBps,
      layer,
      layerCode,
      creator: creator.toBase58(),
      hasBets,
      isBettingOpen,
    };
  } catch (err) {
    console.error('Error decoding market:', err);
    return null;
  }
}

/**
 * List all boolean markets
 */
export async function listMarkets(status?: string): Promise<Market[]> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(DISCRIMINATORS.MARKET),
        },
      },
    ],
  });

  const markets: Market[] = [];

  for (const { account, pubkey } of accounts) {
    const market = decodeMarket(account.data as Buffer, pubkey);
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
 * Get a specific market by public key
 */
export async function getMarket(publicKey: string): Promise<Market | null> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  try {
    const pubkey = new PublicKey(publicKey);
    const account = await connection.getAccountInfo(pubkey);
    if (!account) return null;
    return decodeMarket(account.data as Buffer, pubkey);
  } catch {
    return null;
  }
}
