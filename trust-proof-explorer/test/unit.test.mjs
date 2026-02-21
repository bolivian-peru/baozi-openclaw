/**
 * Unit Tests — Verification logic, schema validation, and rendering.
 *
 * These tests don't hit the network — they use mock data to test the
 * verification module's validation logic.
 */

import { PROGRAM_ID, DISCRIMINATORS } from '@baozi.bet/mcp-server/dist/config.js';

const EXPECTED_PROGRAM_ID = 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ';
const MARKET_DISC = Array.from(DISCRIMINATORS.MARKET);
const RACE_MARKET_DISC = Array.from(DISCRIMINATORS.RACE_MARKET);

// ── Schema validation function (mirrors what's in index.html and verify.mjs) ──
function validateApiSchema(data) {
  const errors = [];

  if (typeof data.success !== 'boolean') errors.push('Missing boolean field: success');
  if (!Array.isArray(data.proofs)) errors.push('Missing array field: proofs');
  if (!data.stats || typeof data.stats !== 'object') errors.push('Missing object field: stats');
  if (!data.oracle || typeof data.oracle !== 'object') errors.push('Missing object field: oracle');

  if (data.oracle) {
    if (typeof data.oracle.name !== 'string') errors.push('oracle.name not a string');
    if (typeof data.oracle.address !== 'string') errors.push('oracle.address not a string');
    if (typeof data.oracle.program !== 'string') errors.push('oracle.program not a string');
    if (data.oracle.program !== EXPECTED_PROGRAM_ID) {
      errors.push(`oracle.program mismatch`);
    }
  }

  if (data.stats) {
    if (typeof data.stats.totalProofs !== 'number') errors.push('stats.totalProofs not a number');
    if (typeof data.stats.totalMarkets !== 'number') errors.push('stats.totalMarkets not a number');
  }

  if (Array.isArray(data.proofs)) {
    data.proofs.forEach((proof, i) => {
      if (typeof proof.id !== 'number') errors.push(`proofs[${i}].id not a number`);
      if (typeof proof.date !== 'string') errors.push(`proofs[${i}].date not a string`);
      if (typeof proof.slug !== 'string') errors.push(`proofs[${i}].slug not a string`);
      if (typeof proof.title !== 'string') errors.push(`proofs[${i}].title not a string`);
      if (!['official', 'labs'].includes(proof.layer)) errors.push(`proofs[${i}].layer invalid`);
      if (![1, 2, 3].includes(proof.tier)) errors.push(`proofs[${i}].tier invalid`);
      if (!Array.isArray(proof.markets)) errors.push(`proofs[${i}].markets not array`);

      (proof.markets || []).forEach((m, j) => {
        if (typeof m.pda !== 'string') errors.push(`proofs[${i}].markets[${j}].pda missing`);
        if (typeof m.question !== 'string') errors.push(`proofs[${i}].markets[${j}].question missing`);
        if (typeof m.outcome !== 'string') errors.push(`proofs[${i}].markets[${j}].outcome missing`);
        if (!['YES', 'NO'].includes(m.outcome)) errors.push(`proofs[${i}].markets[${j}].outcome invalid`);
        if (typeof m.evidence !== 'string') errors.push(`proofs[${i}].markets[${j}].evidence missing`);
      });
    });
  }

  return { valid: errors.length === 0, errors };
}

// ── Mock data ──
function validMockData() {
  return {
    success: true,
    proofs: [{
      id: 1,
      date: '2026-02-08',
      slug: 'test-proof',
      title: 'Test Proof',
      layer: 'official',
      tier: 2,
      category: 'sports',
      markets: [{
        pda: 'FswLya9oMFDPoFAFJziL4YT3v1sHn61g5kHvW3KLc527',
        source: 'ESPN',
        outcome: 'YES',
        evidence: 'Test evidence text.',
        question: 'Will the team win?',
        txSignature: '2cccaZTX8t5rrPkcdX3aozMh79JLA8AedUG4JqwCSPvp',
      }],
      rawMarkdown: null,
      sourceUrls: ['https://example.com'],
      resolvedBy: 'Mei',
      createdAt: '2026-02-08T12:00:00.000Z',
    }],
    stats: { totalProofs: 1, totalMarkets: 1, byLayer: { official: 1 } },
    oracle: {
      name: 'Grandma Mei',
      address: '36DypUbxfXUe2sL2hjQ1hk7SH4h4nMUuwUAogs3cax3Q',
      program: EXPECTED_PROGRAM_ID,
      network: 'Solana Mainnet',
      tiers: [
        { tier: 1, name: 'Trustless', source: 'Pyth', speed: '< 5 min' },
        { tier: 2, name: 'Verified', source: 'ESPN', speed: '1-6 hours' },
        { tier: 3, name: 'AI Research', source: 'Claude', speed: '1-24 hours' },
      ],
    },
  };
}

// =====================================================================
// Tests
// =====================================================================

describe('Config Constants', () => {
  test('PROGRAM_ID toString matches expected', () => {
    expect(PROGRAM_ID.toString()).toBe(EXPECTED_PROGRAM_ID);
  });

  test('MARKET discriminator is 8 bytes', () => {
    expect(DISCRIMINATORS.MARKET).toHaveLength(8);
  });

  test('known MARKET discriminator bytes', () => {
    expect(MARKET_DISC).toEqual([219, 190, 213, 55, 0, 227, 198, 154]);
  });

  test('RACE_MARKET discriminator is 8 bytes', () => {
    expect(DISCRIMINATORS.RACE_MARKET).toHaveLength(8);
  });

  test('known RACE_MARKET discriminator bytes', () => {
    expect(RACE_MARKET_DISC).toEqual([235, 196, 111, 75, 230, 113, 118, 238]);
  });
});

describe('Schema Validation — Valid Data', () => {
  test('valid mock data passes validation', () => {
    const result = validateApiSchema(validMockData());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('Schema Validation — Missing Top-Level Fields', () => {
  test('missing success field', () => {
    const d = validMockData();
    delete d.success;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringContaining('success'));
  });

  test('missing proofs array', () => {
    const d = validMockData();
    delete d.proofs;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringContaining('proofs'));
  });

  test('missing stats object', () => {
    const d = validMockData();
    delete d.stats;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringContaining('stats'));
  });

  test('missing oracle object', () => {
    const d = validMockData();
    delete d.oracle;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringContaining('oracle'));
  });
});

describe('Schema Validation — Oracle Fields', () => {
  test('wrong program ID is caught', () => {
    const d = validMockData();
    d.oracle.program = 'WrongProgramId1111111111111111111111111111111';
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringContaining('mismatch'));
  });

  test('missing oracle.name', () => {
    const d = validMockData();
    delete d.oracle.name;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringContaining('oracle.name'));
  });

  test('missing oracle.address', () => {
    const d = validMockData();
    delete d.oracle.address;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringContaining('oracle.address'));
  });
});

describe('Schema Validation — Proof Fields', () => {
  test('invalid layer value', () => {
    const d = validMockData();
    d.proofs[0].layer = 'invalid';
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringContaining('layer invalid'));
  });

  test('invalid tier value', () => {
    const d = validMockData();
    d.proofs[0].tier = 5;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringContaining('tier invalid'));
  });

  test('missing proof id', () => {
    const d = validMockData();
    delete d.proofs[0].id;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
  });

  test('missing proof date', () => {
    const d = validMockData();
    delete d.proofs[0].date;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
  });
});

describe('Schema Validation — Market Fields', () => {
  test('invalid outcome', () => {
    const d = validMockData();
    d.proofs[0].markets[0].outcome = 'MAYBE';
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringContaining('outcome invalid'));
  });

  test('missing pda', () => {
    const d = validMockData();
    delete d.proofs[0].markets[0].pda;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
  });

  test('missing question', () => {
    const d = validMockData();
    delete d.proofs[0].markets[0].question;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
  });

  test('missing evidence', () => {
    const d = validMockData();
    delete d.proofs[0].markets[0].evidence;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
  });
});

describe('Schema Validation — Edge Cases', () => {
  test('empty proofs array passes', () => {
    const d = validMockData();
    d.proofs = [];
    d.stats.totalProofs = 0;
    d.stats.totalMarkets = 0;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(true);
  });

  test('multiple proofs with multiple markets', () => {
    const d = validMockData();
    d.proofs.push({
      id: 2, date: '2026-02-09', slug: 'test-2', title: 'Test 2',
      layer: 'labs', tier: 3, category: 'politics',
      markets: [
        { pda: 'Abc123456789012345678901234567890123456789ab', question: 'Q?', outcome: 'NO', evidence: 'E' },
        { pda: 'Def123456789012345678901234567890123456789ab', question: 'Q2?', outcome: 'YES', evidence: 'E2' },
      ],
      createdAt: '2026-02-09T12:00:00.000Z',
    });
    const r = validateApiSchema(d);
    expect(r.valid).toBe(true);
  });

  test('proofs string is not an array', () => {
    const d = validMockData();
    d.proofs = 'not an array';
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
  });

  test('stats as null', () => {
    const d = validMockData();
    d.stats = null;
    const r = validateApiSchema(d);
    expect(r.valid).toBe(false);
  });
});
