/**
 * 夜厨房 — Market Analyzer Tests
 */
import { describe, it, expect } from 'vitest';
import { PROGRAM_ID, DISCRIMINATORS } from '../market-analyzer.js';

// =============================================================================
// CONFIG VALIDATION
// =============================================================================

describe('Market Analyzer Config', () => {
  it('should export the correct PROGRAM_ID', () => {
    expect(PROGRAM_ID.toBase58()).toBe('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
  });

  it('should export DISCRIMINATORS', () => {
    expect(DISCRIMINATORS).toBeDefined();
    expect(DISCRIMINATORS.MARKET).toBeDefined();
  });
});
