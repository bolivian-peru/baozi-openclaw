/**
 * Baozi Client — Real Solana on-chain data reader
 * Uses raw getProgramAccounts + manual buffer decoding
 * Patterns from baozi-mcp reference implementation (V4.7.6)
 */
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { PROGRAM_ID, DISCRIMINATORS, SEEDS } from './baozi-constants';

// =============================================================================
// STATUS/OUTCOME MAPS
// =============================================================================

const MARKET_STATUS_NAMES: Record<number, string> = {
  0: 'Active', 1: 'Closed', 2: 'Resolved', 3: 'Cancelled',
  4: 'Paused', 5: 'ResolvedPending', 6: 'Disputed',
};

// =============================================================================
// TYPES (matched to Monitor expectations)
// =============================================================================

export interface Position {
  publicKey: string;
  user: string;
  marketId: string;
  yesAmountSol: number;
  noAmountSol: number;
  totalAmountSol: number;
  side: 'Yes' | 'No' | 'Both';
  claimed: boolean;
}

export interface Market {
  publicKey: string;
  marketId: string;
  question: string;
  closingTime: Date;
  status: string;
  statusCode: number;
  winningOutcome: string | null;
  yesPoolSol: number;
  noPoolSol: number;
  totalPoolSol: number;
  yesPercent: number;
  noPercent: number;
  platformFeeBps: number;
}

export interface ClaimablePosition {
  positionPda: string;
  marketPda: string;
  marketQuestion: string;
  side: 'Yes' | 'No';
  betAmountSol: number;
  claimType: 'winnings' | 'refund' | 'cancelled';
  estimatedPayoutSol: number;
}

export interface ClaimSummary {
  wallet: string;
  totalClaimableSol: number;
  claimablePositions: ClaimablePosition[];
}

// =============================================================================
// HELPERS
// =============================================================================

function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1_000_000_000;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function deriveMarketPda(marketId: string): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  const [pda] = PublicKey.findProgramAddressSync([SEEDS.MARKET, buf], PROGRAM_ID);
  return pda;
}

// =============================================================================
// DECODERS
// =============================================================================

/**
 * Decode UserPosition account (V4.7.6)
 * disc(8) + user(32) + market_id(u64,8) + yes_amount(u64,8) + no_amount(u64,8)
 * + claimed(1) + bump(1) + referred_by(Option<Pubkey>) + affiliate_fee_paid(u64,8) + reserved(16)
 */
function decodePosition(data: Buffer, pubkey: PublicKey): Position | null {
  try {
    let offset = 8;
    const user = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const marketId = data.readBigUInt64LE(offset); offset += 8;
    const yesAmount = data.readBigUInt64LE(offset); offset += 8;
    const noAmount = data.readBigUInt64LE(offset); offset += 8;
    const claimed = data.readUInt8(offset) === 1;

    const yesAmountSol = round4(lamportsToSol(yesAmount));
    const noAmountSol = round4(lamportsToSol(noAmount));
    let side: 'Yes' | 'No' | 'Both';
    if (yesAmount > 0n && noAmount > 0n) side = 'Both';
    else if (yesAmount > 0n) side = 'Yes';
    else side = 'No';

    return {
      publicKey: pubkey.toBase58(), user: user.toBase58(),
      marketId: marketId.toString(), yesAmountSol, noAmountSol,
      totalAmountSol: round4(yesAmountSol + noAmountSol), side, claimed,
    };
  } catch (err) {
    console.error('Error decoding position:', err);
    return null;
  }
}

/**
 * Decode Market account (V4.7.6)
 * disc(8) + market_id(u64,8) + question(String:4+len) + closing_time(i64,8)
 * + resolution_time(i64,8) + auto_stop_buffer(i64,8) + yes_pool(u64,8) + no_pool(u64,8)
 * + snapshot_yes(u64,8) + snapshot_no(u64,8) + status(1) + winning_outcome(Option<bool>:1+0/1)
 * ... + platform_fee_bps_at_creation(u16,2) ...
 */
function decodeMarket(data: Buffer, pubkey: PublicKey): Market | null {
  try {
    let offset = 8;
    const marketId = data.readBigUInt64LE(offset); offset += 8;
    const qLen = data.readUInt32LE(offset); offset += 4;
    const question = data.slice(offset, offset + qLen).toString('utf8'); offset += qLen;
    const closingTime = data.readBigInt64LE(offset); offset += 8;
    offset += 8; // resolution_time
    offset += 8; // auto_stop_buffer
    const yesPool = data.readBigUInt64LE(offset); offset += 8;
    const noPool = data.readBigUInt64LE(offset); offset += 8;
    offset += 16; // snapshot pools
    const statusCode = data.readUInt8(offset); offset += 1;

    // winning_outcome (Option<bool>)
    const hasOutcome = data.readUInt8(offset) === 1; offset += 1;
    let winningOutcome: string | null = null;
    if (hasOutcome) { winningOutcome = data.readUInt8(offset) === 1 ? 'Yes' : 'No'; offset += 1; }

    // Skip to platform_fee_bps_at_creation
    offset += 1;  // currency_type
    offset += 33; // _reserved_usdc_vault
    offset += 8;  // creator_bond
    offset += 8;  // total_claimed
    offset += 8;  // platform_fee_collected
    offset += 8;  // last_bet_time
    offset += 1;  // bump
    offset += 1;  // layer
    offset += 1;  // resolution_mode
    offset += 1;  // access_gate
    offset += 32; // creator
    const hasOracle = data.readUInt8(offset) === 1; offset += 1;
    if (hasOracle) offset += 32;
    offset += 160; // council
    offset += 4;   // council bytes
    offset += 8;   // total_affiliate_fees
    const hasInvite = data.readUInt8(offset) === 1; offset += 1;
    if (hasInvite) offset += 32;
    offset += 2;   // creator_fee_bps
    offset += 8;   // total_creator_fees
    const hasProfile = data.readUInt8(offset) === 1; offset += 1;
    if (hasProfile) offset += 32;
    const platformFeeBps = data.readUInt16LE(offset);

    const yesPoolSol = round4(lamportsToSol(yesPool));
    const noPoolSol = round4(lamportsToSol(noPool));
    const totalPoolSol = round4(yesPoolSol + noPoolSol);
    const yesPercent = totalPoolSol > 0 ? round4((yesPoolSol / totalPoolSol) * 100) : 50;
    const noPercent = totalPoolSol > 0 ? round4((noPoolSol / totalPoolSol) * 100) : 50;

    return {
      publicKey: pubkey.toBase58(), marketId: marketId.toString(), question,
      closingTime: new Date(Number(closingTime) * 1000),
      status: MARKET_STATUS_NAMES[statusCode] || 'Unknown', statusCode,
      winningOutcome, yesPoolSol, noPoolSol, totalPoolSol, yesPercent, noPercent, platformFeeBps,
    };
  } catch (err) {
    console.error('Error decoding market:', err);
    return null;
  }
}

// =============================================================================
// CLIENT
// =============================================================================

export class BaoziClient {
  private connection: Connection;

  constructor(rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getPositions(walletAddress: string): Promise<Position[]> {
    try {
      const wallet = new PublicKey(walletAddress);
      const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: bs58.encode(DISCRIMINATORS.USER_POSITION) } },
          { memcmp: { offset: 8, bytes: wallet.toBase58() } },
        ],
      });
      const positions: Position[] = [];
      for (const { account, pubkey } of accounts) {
        const p = decodePosition(account.data as Buffer, pubkey);
        if (p) positions.push(p);
      }
      positions.sort((a, b) => Number(BigInt(b.marketId) - BigInt(a.marketId)));
      return positions;
    } catch (err) {
      console.error(`Error fetching positions for ${walletAddress}:`, err);
      return [];
    }
  }

  async getMarket(marketPda: string): Promise<Market | null> {
    try {
      const pubkey = new PublicKey(marketPda);
      const account = await this.connection.getAccountInfo(pubkey);
      if (!account) return null;
      return decodeMarket(account.data as Buffer, pubkey);
    } catch (err) {
      console.error(`Error fetching market ${marketPda}:`, err);
      return null;
    }
  }

  async getMarketById(marketId: string): Promise<Market | null> {
    return this.getMarket(deriveMarketPda(marketId).toBase58());
  }

  async getClaimable(walletAddress: string): Promise<ClaimSummary> {
    const positions = await this.getPositions(walletAddress);
    const claimable: ClaimablePosition[] = [];
    let totalClaimable = 0;

    for (const position of positions) {
      if (position.claimed) continue;
      const marketPda = deriveMarketPda(position.marketId);
      const market = await this.getMarket(marketPda.toBase58());
      if (!market) continue;

      let claimType: 'winnings' | 'refund' | 'cancelled' | null = null;
      let estimatedPayout = 0;
      let winningSide: 'Yes' | 'No' | null = null;

      if (market.status === 'Resolved') {
        if (market.winningOutcome === 'Yes' && position.yesAmountSol > 0) {
          winningSide = 'Yes'; claimType = 'winnings';
          if (market.yesPoolSol > 0) {
            const share = position.yesAmountSol / market.yesPoolSol;
            const gross = share * market.totalPoolSol;
            const profit = gross - position.yesAmountSol;
            estimatedPayout = gross - (profit > 0 ? (profit * market.platformFeeBps) / 10000 : 0);
          }
        } else if (market.winningOutcome === 'No' && position.noAmountSol > 0) {
          winningSide = 'No'; claimType = 'winnings';
          if (market.noPoolSol > 0) {
            const share = position.noAmountSol / market.noPoolSol;
            const gross = share * market.totalPoolSol;
            const profit = gross - position.noAmountSol;
            estimatedPayout = gross - (profit > 0 ? (profit * market.platformFeeBps) / 10000 : 0);
          }
        } else if (market.winningOutcome === null) {
          claimType = 'refund'; estimatedPayout = position.totalAmountSol;
          winningSide = position.yesAmountSol > position.noAmountSol ? 'Yes' : 'No';
        }
      } else if (market.status === 'Cancelled') {
        claimType = 'cancelled'; estimatedPayout = position.totalAmountSol;
        winningSide = position.yesAmountSol > position.noAmountSol ? 'Yes' : 'No';
      }

      if (claimType && winningSide) {
        const payout = round4(estimatedPayout);
        totalClaimable += payout;
        claimable.push({
          positionPda: position.publicKey, marketPda: marketPda.toBase58(),
          marketQuestion: market.question, side: winningSide,
          betAmountSol: winningSide === 'Yes' ? position.yesAmountSol : position.noAmountSol,
          claimType, estimatedPayoutSol: payout,
        });
      }
    }
    return { wallet: walletAddress, totalClaimableSol: round4(totalClaimable), claimablePositions: claimable };
  }

  async getResolutionStatus(marketId: string): Promise<{ marketId: string; isResolved: boolean; winningOutcome: string | null; status: string }> {
    const market = await this.getMarketById(marketId);
    if (!market) return { marketId, isResolved: false, winningOutcome: null, status: 'Unknown' };
    return { marketId, isResolved: market.status === 'Resolved', winningOutcome: market.winningOutcome, status: market.status };
  }

  async getMarketOdds(marketId: string): Promise<{ marketId: string; yesPercent: number; noPercent: number } | null> {
    const market = await this.getMarketById(marketId);
    if (!market) return null;
    return { marketId, yesPercent: market.yesPercent, noPercent: market.noPercent };
  }

  async getMarketClosingTime(marketId: string): Promise<Date | null> {
    const market = await this.getMarketById(marketId);
    if (!market) return null;
    return market.closingTime;
  }
}
