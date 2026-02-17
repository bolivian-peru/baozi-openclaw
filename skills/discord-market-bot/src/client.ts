import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { PROGRAM_ID, DISCRIMINATORS, SEEDS, MARKET_STATUS_NAMES, MARKET_LAYER_NAMES, RPC_ENDPOINT, lamportsToSol } from './config';
import { Market, RaceMarket, Position, RaceOutcome } from './types';

// =============================================================================
// HELPERS
// =============================================================================

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// =============================================================================
// DECODERS
// =============================================================================

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

    const hasOutcome = data.readUInt8(offset) === 1; offset += 1;
    let winningOutcome: string | null = null;
    if (hasOutcome) { winningOutcome = data.readUInt8(offset) === 1 ? 'Yes' : 'No'; offset += 1; }

    offset += 1;  // currency_type
    offset += 33; // _reserved_usdc_vault
    offset += 8;  // creator_bond
    offset += 8;  // total_claimed
    offset += 8;  // platform_fee_collected
    offset += 8;  // last_bet_time
    offset += 1;  // bump
    const layerCode = data.readUInt8(offset); offset += 1;
    
    // Skip rest... we have what we need
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
    const yesPercent = totalPoolSol > 0 ? round2((yesPoolSol / totalPoolSol) * 100) : 50;
    const noPercent = totalPoolSol > 0 ? round2((noPoolSol / totalPoolSol) * 100) : 50;

    return {
      publicKey: pubkey.toBase58(),
      marketId: marketId.toString(),
      question,
      closingTime: new Date(Number(closingTime) * 1000),
      status: MARKET_STATUS_NAMES[statusCode] || 'Unknown',
      statusCode,
      winningOutcome,
      yesPoolSol,
      noPoolSol,
      totalPoolSol,
      yesPercent,
      noPercent,
      platformFeeBps,
      layer: MARKET_LAYER_NAMES[layerCode] || 'Unknown',
    };
  } catch (err) {
    console.error('Error decoding market:', err);
    return null;
  }
}

function decodeRaceMarket(data: Buffer, pubkey: PublicKey): RaceMarket | null {
  try {
    if (data.length < 500) return null;
    let offset = 8;
    const marketId = data.readBigUInt64LE(offset); offset += 8;
    const qLen = data.readUInt32LE(offset); offset += 4;
    const question = data.slice(offset, offset + qLen).toString('utf8'); offset += qLen;
    const closingTime = data.readBigInt64LE(offset); offset += 8;
    offset += 8; // resolution_time
    offset += 8; // auto_stop_buffer
    const outcomeCount = data.readUInt8(offset); offset += 1;

    const outcomeLabels: string[] = [];
    for (let i = 0; i < 10; i++) {
      const labelBytes = data.slice(offset, offset + 32);
      let labelEnd = 32;
      for (let j = 0; j < 32; j++) { if (labelBytes[j] === 0) { labelEnd = j; break; } }
      if (i < outcomeCount) outcomeLabels.push(labelBytes.slice(0, labelEnd).toString('utf8'));
      offset += 32;
    }

    const outcomePools: bigint[] = [];
    for (let i = 0; i < 10; i++) {
      if (i < outcomeCount) outcomePools.push(data.readBigUInt64LE(offset));
      offset += 8;
    }

    const totalPoolLamports = data.readBigUInt64LE(offset); offset += 8;
    offset += 80; // snapshot pools
    offset += 8;  // snapshot total
    const statusCode = data.readUInt8(offset); offset += 1;

    const hasOutcome = data.readUInt8(offset) === 1; offset += 1;
    let winningOutcomeIndex: number | null = null;
    if (hasOutcome) { winningOutcomeIndex = data.readUInt8(offset); offset += 1; }

    offset += 1; // currency
    offset += 24; // fees/claimed
    offset += 8; // last_bet
    offset += 1; // bump
    const layerCode = data.readUInt8(offset);

    const totalPoolSol = round4(lamportsToSol(totalPoolLamports));
    const outcomes: RaceOutcome[] = outcomeLabels.map((label, i) => {
      const poolSol = round4(lamportsToSol(outcomePools[i] || 0n));
      const percent = totalPoolSol > 0 ? round2((poolSol / totalPoolSol) * 100) : round2(100 / outcomeLabels.length);
      return { index: i, label, poolSol, percent };
    });

    return {
      publicKey: pubkey.toBase58(),
      marketId: marketId.toString(),
      question,
      outcomes,
      closingTime: new Date(Number(closingTime) * 1000),
      status: MARKET_STATUS_NAMES[statusCode] || 'Unknown',
      statusCode,
      winningOutcomeIndex,
      totalPoolSol,
      layer: MARKET_LAYER_NAMES[layerCode] || 'Unknown',
    };
  } catch (err) {
    console.error('Error decoding race market:', err);
    return null;
  }
}

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
      publicKey: pubkey.toBase58(),
      user: user.toBase58(),
      marketId: marketId.toString(),
      yesAmountSol,
      noAmountSol,
      totalAmountSol: round4(yesAmountSol + noAmountSol),
      side,
      claimed,
    };
  } catch (err) {
    console.error('Error decoding position:', err);
    return null;
  }
}

// =============================================================================
// CLIENT
// =============================================================================

export class BaoziClient {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
  }

  async getMarkets(status?: string): Promise<(Market | RaceMarket)[]> {
    try {
      // Fetch both boolean and race markets
      const [boolAccounts, raceAccounts] = await Promise.all([
        this.connection.getProgramAccounts(PROGRAM_ID, {
          filters: [{ memcmp: { offset: 0, bytes: bs58.encode(DISCRIMINATORS.MARKET) } }],
        }),
        this.connection.getProgramAccounts(PROGRAM_ID, {
          filters: [{ memcmp: { offset: 0, bytes: bs58.encode(DISCRIMINATORS.RACE_MARKET) } }],
        }),
      ]);

      const markets: (Market | RaceMarket)[] = [];

      for (const { account, pubkey } of boolAccounts) {
        const m = decodeMarket(account.data as Buffer, pubkey);
        if (m && (!status || m.status.toLowerCase() === status.toLowerCase())) markets.push(m);
      }

      for (const { account, pubkey } of raceAccounts) {
        const m = decodeRaceMarket(account.data as Buffer, pubkey);
        if (m && (!status || m.status.toLowerCase() === status.toLowerCase())) markets.push(m);
      }

      // Sort by active status then closing time
      return markets.sort((a, b) => {
        if (a.status === 'Active' && b.status !== 'Active') return -1;
        if (a.status !== 'Active' && b.status === 'Active') return 1;
        return a.closingTime.getTime() - b.closingTime.getTime();
      });
    } catch (err) {
      console.error('Error fetching markets:', err);
      return [];
    }
  }

  async getMarket(publicKey: string): Promise<Market | RaceMarket | null> {
    try {
      const pubkey = new PublicKey(publicKey);
      const account = await this.connection.getAccountInfo(pubkey);
      if (!account) return null;

      // Try decoding as boolean market first
      const disc = account.data.slice(0, 8);
      if (disc.equals(DISCRIMINATORS.MARKET)) {
        return decodeMarket(account.data as Buffer, pubkey);
      } else if (disc.equals(DISCRIMINATORS.RACE_MARKET)) {
        return decodeRaceMarket(account.data as Buffer, pubkey);
      }
      return null;
    } catch (err) {
      console.error(`Error fetching market ${publicKey}:`, err);
      return null;
    }
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
      return positions.sort((a, b) => Number(BigInt(b.marketId) - BigInt(a.marketId)));
    } catch (err) {
      console.error(`Error fetching positions for ${walletAddress}:`, err);
      return [];
    }
  }

  async getHotMarkets(limit = 5): Promise<(Market | RaceMarket)[]> {
    const markets = await this.getMarkets('Active');
    // Sort by total pool volume
    return markets
      .sort((a, b) => b.totalPoolSol - a.totalPoolSol)
      .slice(0, limit);
  }

  async getClosingMarkets(limit = 5): Promise<(Market | RaceMarket)[]> {
    const markets = await this.getMarkets('Active');
    // Sort by closing time soonest
    return markets
      .sort((a, b) => a.closingTime.getTime() - b.closingTime.getTime())
      .slice(0, limit);
  }
}
