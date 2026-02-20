/**
 * API Schema Validation Tests
 * Verifies the /api/agents/proofs endpoint returns data matching the expected schema.
 */

const PROOFS_API = 'https://baozi.bet/api/agents/proofs';
const EXPECTED_PROGRAM_ID = 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ';

let apiData = null;

beforeAll(async () => {
  const res = await fetch(PROOFS_API);
  apiData = await res.json();
}, 15000);

describe('API Response - Top Level Schema', () => {
  test('responds with HTTP 200', async () => {
    const res = await fetch(PROOFS_API);
    expect(res.status).toBe(200);
  });

  test('returns JSON with success=true', () => {
    expect(apiData.success).toBe(true);
  });

  test('contains proofs array', () => {
    expect(Array.isArray(apiData.proofs)).toBe(true);
    expect(apiData.proofs.length).toBeGreaterThan(0);
  });

  test('contains stats object', () => {
    expect(apiData.stats).toBeDefined();
    expect(typeof apiData.stats).toBe('object');
  });

  test('contains oracle object', () => {
    expect(apiData.oracle).toBeDefined();
    expect(typeof apiData.oracle).toBe('object');
  });
});

describe('API Response - Stats Schema', () => {
  test('stats.totalProofs is a positive number', () => {
    expect(typeof apiData.stats.totalProofs).toBe('number');
    expect(apiData.stats.totalProofs).toBeGreaterThan(0);
  });

  test('stats.totalMarkets is a positive number', () => {
    expect(typeof apiData.stats.totalMarkets).toBe('number');
    expect(apiData.stats.totalMarkets).toBeGreaterThan(0);
  });

  test('stats.byLayer contains official and/or labs', () => {
    expect(apiData.stats.byLayer).toBeDefined();
    const keys = Object.keys(apiData.stats.byLayer);
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach(k => expect(['official', 'labs']).toContain(k));
  });

  test('stats.totalProofs matches proofs array length', () => {
    expect(apiData.stats.totalProofs).toBe(apiData.proofs.length);
  });

  test('stats.totalMarkets matches sum of markets across proofs', () => {
    const totalMarkets = apiData.proofs.reduce((s, p) => s + (p.markets?.length || 0), 0);
    expect(apiData.stats.totalMarkets).toBe(totalMarkets);
  });
});

describe('API Response - Oracle Schema', () => {
  test('oracle.name is a non-empty string', () => {
    expect(typeof apiData.oracle.name).toBe('string');
    expect(apiData.oracle.name.length).toBeGreaterThan(0);
  });

  test('oracle.address is a valid Solana address (base58, 32-44 chars)', () => {
    expect(typeof apiData.oracle.address).toBe('string');
    expect(apiData.oracle.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  });

  test('oracle.program matches expected PROGRAM_ID', () => {
    expect(apiData.oracle.program).toBe(EXPECTED_PROGRAM_ID);
  });

  test('oracle.network is a string', () => {
    expect(typeof apiData.oracle.network).toBe('string');
  });

  test('oracle.tiers is an array of 3 tier objects', () => {
    expect(Array.isArray(apiData.oracle.tiers)).toBe(true);
    expect(apiData.oracle.tiers.length).toBe(3);
    apiData.oracle.tiers.forEach(t => {
      expect(typeof t.tier).toBe('number');
      expect(typeof t.name).toBe('string');
      expect(typeof t.source).toBe('string');
      expect(typeof t.speed).toBe('string');
    });
  });
});

describe('API Response - Proof Schema', () => {
  test('each proof has required fields with correct types', () => {
    apiData.proofs.forEach((proof, i) => {
      expect(typeof proof.id).toBe('number');
      expect(typeof proof.date).toBe('string');
      expect(typeof proof.slug).toBe('string');
      expect(typeof proof.title).toBe('string');
      expect(['official', 'labs']).toContain(proof.layer);
      expect([1, 2, 3]).toContain(proof.tier);
      expect(Array.isArray(proof.markets)).toBe(true);
      expect(typeof proof.createdAt).toBe('string');
    });
  });

  test('proof dates are valid ISO date strings', () => {
    apiData.proofs.forEach(proof => {
      const d = new Date(proof.date);
      expect(d.toString()).not.toBe('Invalid Date');
    });
  });

  test('proof createdAt are valid ISO datetime strings', () => {
    apiData.proofs.forEach(proof => {
      const d = new Date(proof.createdAt);
      expect(d.toString()).not.toBe('Invalid Date');
    });
  });

  test('proof IDs are unique', () => {
    const ids = apiData.proofs.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('proof slugs are unique', () => {
    const slugs = apiData.proofs.map(p => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('API Response - Market Schema', () => {
  const allMarkets = [];

  beforeAll(() => {
    apiData.proofs.forEach(p => {
      (p.markets || []).forEach(m => allMarkets.push(m));
    });
  });

  test('each market has a pda string (valid Solana address)', () => {
    allMarkets.forEach(m => {
      expect(typeof m.pda).toBe('string');
      expect(m.pda).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    });
  });

  test('each market has a question string', () => {
    allMarkets.forEach(m => {
      expect(typeof m.question).toBe('string');
      expect(m.question.length).toBeGreaterThan(0);
    });
  });

  test('each market has an outcome of YES or NO', () => {
    allMarkets.forEach(m => {
      expect(['YES', 'NO']).toContain(m.outcome);
    });
  });

  test('each market has an evidence string', () => {
    allMarkets.forEach(m => {
      expect(typeof m.evidence).toBe('string');
      expect(m.evidence.length).toBeGreaterThan(0);
    });
  });

  test('markets with txSignature have valid base58 signatures', () => {
    const withTx = allMarkets.filter(m => m.txSignature);
    expect(withTx.length).toBeGreaterThan(0); // At least some should have tx sigs
    withTx.forEach(m => {
      expect(typeof m.txSignature).toBe('string');
      expect(m.txSignature.length).toBeGreaterThan(10);
    });
  });

  test('markets with sourceUrl have valid URLs', () => {
    const withUrl = allMarkets.filter(m => m.sourceUrl);
    withUrl.forEach(m => {
      expect(m.sourceUrl).toMatch(/^https?:\/\//);
    });
  });
});
