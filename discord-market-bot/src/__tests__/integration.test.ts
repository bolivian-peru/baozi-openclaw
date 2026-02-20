/**
 * Integration tests — call real Solana mainnet RPC via @baozi.bet/mcp-server
 * These tests hit the live blockchain and verify our decoders against the
 * canonical MCP-server implementation.
 *
 * Uses a single RPC call and caches the result for all assertions to avoid
 * 429 rate limiting on public Solana endpoints.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { listMarkets as mcpListMarkets } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { PROGRAM_ID, DISCRIMINATORS } from '@baozi.bet/mcp-server/dist/config.js';
import type { Market as McpMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';

// Our local implementation
import {
  PROGRAM_ID as LOCAL_PROGRAM_ID,
  DISCRIMINATORS as LOCAL_DISCRIMINATORS,
} from '../baozi/config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Cache a single RPC call for all integration tests
// ─────────────────────────────────────────────────────────────────────────────
let cachedMarkets: McpMarket[] = [];

beforeAll(async () => {
  cachedMarkets = await mcpListMarkets();
}, 60_000);

// ─────────────────────────────────────────────────────────────────────────────
// Integration: listMarkets via MCP server (live RPC)
// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: MCP server listMarkets (live RPC)', () => {
  it('fetches markets from Solana mainnet', () => {
    expect(Array.isArray(cachedMarkets)).toBe(true);
    expect(cachedMarkets.length).toBeGreaterThan(0);
  });

  it('each market has required fields', () => {
    const market = cachedMarkets[0];
    expect(market).toBeDefined();
    expect(market.publicKey).toBeTruthy();
    expect(market.question).toBeTruthy();
    expect(typeof market.yesPoolSol).toBe('number');
    expect(typeof market.noPoolSol).toBe('number');
    expect(typeof market.totalPoolSol).toBe('number');
    expect(market.status).toBeTruthy();
  });

  it('market percentages sum to ~100', () => {
    for (const m of cachedMarkets.slice(0, 5)) {
      if (m.totalPoolSol > 0) {
        expect(m.yesPercent + m.noPercent).toBeCloseTo(100, 0);
      }
    }
  });

  it('market statuses are valid', () => {
    const validStatuses = ['Active', 'Closed', 'Resolved', 'Cancelled', 'Paused', 'ResolvedPending', 'Disputed'];
    for (const m of cachedMarkets) {
      expect(validStatuses).toContain(m.status);
    }
  });

  it('market public keys are base58 strings', () => {
    for (const m of cachedMarkets.slice(0, 5)) {
      expect(m.publicKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
      expect(m.publicKey.length).toBeGreaterThanOrEqual(32);
      expect(m.publicKey.length).toBeLessThanOrEqual(44);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: config alignment between local bot and MCP server
// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: config alignment between local and MCP', () => {
  it('program IDs match', () => {
    expect(LOCAL_PROGRAM_ID.toBase58()).toBe(PROGRAM_ID.toBase58());
  });

  it('Market discriminators match', () => {
    expect(Buffer.compare(LOCAL_DISCRIMINATORS.MARKET, DISCRIMINATORS.MARKET)).toBe(0);
  });

  it('UserPosition discriminators match', () => {
    expect(Buffer.compare(LOCAL_DISCRIMINATORS.USER_POSITION, DISCRIMINATORS.USER_POSITION)).toBe(0);
  });

  it('RaceMarket discriminators match', () => {
    expect(Buffer.compare(LOCAL_DISCRIMINATORS.RACE_MARKET, DISCRIMINATORS.RACE_MARKET)).toBe(0);
  });

  it('RacePosition discriminators match', () => {
    expect(Buffer.compare(LOCAL_DISCRIMINATORS.RACE_POSITION, DISCRIMINATORS.RACE_POSITION)).toBe(0);
  });
});
