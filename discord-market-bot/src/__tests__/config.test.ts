/**
 * Tests for baozi/config.ts — discriminators, program ID, helpers
 */
import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  PROGRAM_ID,
  DISCRIMINATORS,
  MARKET_STATUS_NAMES,
  MARKET_LAYER_NAMES,
  lamportsToSol,
  round2,
  round4,
} from '../baozi/config.js';

// Canonical values from @baozi.bet/mcp-server
import {
  PROGRAM_ID as MCP_PROGRAM_ID,
  DISCRIMINATORS as MCP_DISCRIMINATORS,
} from '@baozi.bet/mcp-server/dist/config.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Program ID verification
// ─────────────────────────────────────────────────────────────────────────────
describe('Program ID', () => {
  it('should match the expected V4.7.6 mainnet program ID', () => {
    expect(PROGRAM_ID.toBase58()).toBe('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
  });

  it('should be a valid Solana PublicKey', () => {
    expect(PROGRAM_ID).toBeInstanceOf(PublicKey);
    expect(PROGRAM_ID.toBytes()).toHaveLength(32);
  });

  it('should match @baozi.bet/mcp-server PROGRAM_ID exactly', () => {
    expect(PROGRAM_ID.toBase58()).toBe(MCP_PROGRAM_ID.toBase58());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Account discriminator verification
// ─────────────────────────────────────────────────────────────────────────────
describe('Account Discriminators', () => {
  it('Market discriminator matches [219,190,213,55,0,227,198,154]', () => {
    const expected = Buffer.from([219, 190, 213, 55, 0, 227, 198, 154]);
    expect(Buffer.compare(DISCRIMINATORS.MARKET, expected)).toBe(0);
  });

  it('UserPosition discriminator matches [251,248,209,245,83,234,17,27]', () => {
    const expected = Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]);
    expect(Buffer.compare(DISCRIMINATORS.USER_POSITION, expected)).toBe(0);
  });

  it('RaceMarket discriminator matches expected bytes', () => {
    const expected = Buffer.from([235, 196, 111, 75, 230, 113, 118, 238]);
    expect(Buffer.compare(DISCRIMINATORS.RACE_MARKET, expected)).toBe(0);
  });

  it('RacePosition discriminator matches expected bytes', () => {
    const expected = Buffer.from([44, 182, 16, 1, 230, 14, 174, 46]);
    expect(Buffer.compare(DISCRIMINATORS.RACE_POSITION, expected)).toBe(0);
  });

  it('all discriminators are 8 bytes', () => {
    expect(DISCRIMINATORS.MARKET).toHaveLength(8);
    expect(DISCRIMINATORS.USER_POSITION).toHaveLength(8);
    expect(DISCRIMINATORS.RACE_MARKET).toHaveLength(8);
    expect(DISCRIMINATORS.RACE_POSITION).toHaveLength(8);
  });

  it('Market discriminator matches @baozi.bet/mcp-server', () => {
    expect(Buffer.compare(DISCRIMINATORS.MARKET, MCP_DISCRIMINATORS.MARKET)).toBe(0);
  });

  it('UserPosition discriminator matches @baozi.bet/mcp-server', () => {
    expect(Buffer.compare(DISCRIMINATORS.USER_POSITION, MCP_DISCRIMINATORS.USER_POSITION)).toBe(0);
  });

  it('RaceMarket discriminator matches @baozi.bet/mcp-server', () => {
    expect(Buffer.compare(DISCRIMINATORS.RACE_MARKET, MCP_DISCRIMINATORS.RACE_MARKET)).toBe(0);
  });

  it('RacePosition discriminator matches @baozi.bet/mcp-server', () => {
    expect(Buffer.compare(DISCRIMINATORS.RACE_POSITION, MCP_DISCRIMINATORS.RACE_POSITION)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Helper functions
// ─────────────────────────────────────────────────────────────────────────────
describe('lamportsToSol', () => {
  it('converts 1 SOL (1e9 lamports)', () => {
    expect(lamportsToSol(1_000_000_000n)).toBe(1);
  });

  it('converts 0 lamports', () => {
    expect(lamportsToSol(0n)).toBe(0);
  });

  it('converts fractional amounts', () => {
    expect(lamportsToSol(500_000_000n)).toBe(0.5);
  });

  it('converts very large amounts', () => {
    expect(lamportsToSol(100_000_000_000n)).toBe(100);
  });
});

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(3.14159)).toBe(3.14);
  });

  it('handles whole numbers', () => {
    expect(round2(5)).toBe(5);
  });

  it('rounds up correctly', () => {
    expect(round2(1.555)).toBe(1.56);
  });
});

describe('round4', () => {
  it('rounds to 4 decimal places', () => {
    expect(round4(3.14159265)).toBe(3.1416);
  });

  it('handles whole numbers', () => {
    expect(round4(7)).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Enum maps
// ─────────────────────────────────────────────────────────────────────────────
describe('Market Status Names', () => {
  it('has all 7 statuses', () => {
    expect(Object.keys(MARKET_STATUS_NAMES)).toHaveLength(7);
  });

  it('maps 0 to Active', () => {
    expect(MARKET_STATUS_NAMES[0]).toBe('Active');
  });

  it('maps 2 to Resolved', () => {
    expect(MARKET_STATUS_NAMES[2]).toBe('Resolved');
  });

  it('maps 6 to Disputed', () => {
    expect(MARKET_STATUS_NAMES[6]).toBe('Disputed');
  });
});

describe('Market Layer Names', () => {
  it('has 3 layers', () => {
    expect(Object.keys(MARKET_LAYER_NAMES)).toHaveLength(3);
  });

  it('maps 0 to Official', () => {
    expect(MARKET_LAYER_NAMES[0]).toBe('Official');
  });

  it('maps 1 to Lab', () => {
    expect(MARKET_LAYER_NAMES[1]).toBe('Lab');
  });

  it('maps 2 to Private', () => {
    expect(MARKET_LAYER_NAMES[2]).toBe('Private');
  });
});
