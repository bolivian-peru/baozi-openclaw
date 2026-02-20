/**
 * Integration Tests — On-Chain Verification via Solana RPC
 *
 * These tests verify market PDAs and transaction signatures against the real
 * Solana mainnet using @baozi.bet/mcp-server handlers and @solana/web3.js.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getMarket, listMarkets } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { PROGRAM_ID, DISCRIMINATORS, RPC_ENDPOINT } from '@baozi.bet/mcp-server/dist/config.js';

const EXPECTED_PROGRAM_ID = 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ';
const PROOFS_API = 'https://baozi.bet/api/agents/proofs';
const RPC = RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
const MARKET_DISC = Array.from(DISCRIMINATORS.MARKET);

let apiData = null;
let connection = null;

beforeAll(async () => {
  connection = new Connection(RPC, 'confirmed');
  const res = await fetch(PROOFS_API);
  apiData = await res.json();
}, 15000);

describe('MCP Server Config', () => {
  test('PROGRAM_ID matches expected value', () => {
    expect(PROGRAM_ID.toString()).toBe(EXPECTED_PROGRAM_ID);
  });

  test('DISCRIMINATORS.MARKET is 8 bytes', () => {
    expect(DISCRIMINATORS.MARKET.length).toBe(8);
  });

  test('DISCRIMINATORS.MARKET matches known bytes', () => {
    expect(MARKET_DISC).toEqual([219, 190, 213, 55, 0, 227, 198, 154]);
  });

  test('RPC_ENDPOINT is mainnet', () => {
    expect(RPC).toContain('mainnet');
  });
});

describe('On-Chain Market PDA Verification', () => {
  // Get first 5 unique PDAs to verify (avoid rate limits)
  let pdas = [];

  beforeAll(() => {
    const allPdas = new Set();
    apiData.proofs.forEach(p => (p.markets || []).forEach(m => {
      if (m.pda) allPdas.add(m.pda);
    }));
    pdas = [...allPdas].slice(0, 5);
  });

  test('at least 3 market PDAs available for testing', () => {
    expect(pdas.length).toBeGreaterThanOrEqual(3);
  });

  test('first PDA account exists on Solana', async () => {
    const info = await connection.getAccountInfo(new PublicKey(pdas[0]));
    expect(info).not.toBeNull();
    expect(info.data.length).toBeGreaterThan(0);
  }, 15000);

  test('first PDA is owned by Baozi program', async () => {
    const info = await connection.getAccountInfo(new PublicKey(pdas[0]));
    expect(info.owner.toString()).toBe(EXPECTED_PROGRAM_ID);
  }, 15000);

  test('first PDA has correct market discriminator', async () => {
    const info = await connection.getAccountInfo(new PublicKey(pdas[0]));
    const disc = Array.from(info.data.slice(0, 8));
    expect(disc).toEqual(MARKET_DISC);
  }, 15000);

  test('getMarket() decodes first PDA successfully', async () => {
    const market = await getMarket(pdas[0]);
    expect(market).not.toBeNull();
    expect(typeof market.publicKey).toBe('string');
    expect(typeof market.question).toBe('string');
    expect(market.question.length).toBeGreaterThan(0);
  }, 15000);

  test('getMarket() question is readable English', async () => {
    const market = await getMarket(pdas[0]);
    // Should contain a question mark or common question words
    expect(market.question).toMatch(/\?|will|which|what|who|how/i);
  }, 15000);

  test('second PDA also exists and is owned by program', async () => {
    if (pdas.length < 2) return;
    const info = await connection.getAccountInfo(new PublicKey(pdas[1]));
    expect(info).not.toBeNull();
    expect(info.owner.toString()).toBe(EXPECTED_PROGRAM_ID);
  }, 15000);

  test('third PDA also exists and is owned by program', async () => {
    if (pdas.length < 3) return;
    const info = await connection.getAccountInfo(new PublicKey(pdas[2]));
    expect(info).not.toBeNull();
    expect(info.owner.toString()).toBe(EXPECTED_PROGRAM_ID);
  }, 15000);
});

describe('On-Chain Transaction Verification', () => {
  let txSignatures = [];

  beforeAll(() => {
    const allTx = new Set();
    apiData.proofs.forEach(p => (p.markets || []).forEach(m => {
      if (m.txSignature) allTx.add(m.txSignature);
    }));
    txSignatures = [...allTx];
  });

  test('at least 1 transaction signature exists in API data', () => {
    expect(txSignatures.length).toBeGreaterThan(0);
  });

  test('first tx signature is confirmed on Solana', async () => {
    if (txSignatures.length === 0) return;
    const status = await connection.getSignatureStatus(txSignatures[0], {
      searchTransactionHistory: true,
    });
    expect(status.value).not.toBeNull();
    expect(['confirmed', 'finalized']).toContain(status.value.confirmationStatus);
  }, 15000);

  test('valid-length tx signatures are confirmed', async () => {
    // Solana tx signatures are 88 chars base58. Filter to valid ones.
    const validTxs = txSignatures.filter(tx => tx.length >= 80 && tx.length <= 90);
    if (validTxs.length === 0) return;
    for (const tx of validTxs.slice(0, 3)) {
      const status = await connection.getSignatureStatus(tx, {
        searchTransactionHistory: true,
      });
      expect(status.value).not.toBeNull();
      expect(['confirmed', 'finalized']).toContain(status.value.confirmationStatus);
    }
  }, 30000);
});

describe('API Data vs On-Chain Cross-Verification', () => {
  test('API market question matches on-chain question (first market)', async () => {
    const firstMarket = apiData.proofs[0]?.markets?.[0];
    if (!firstMarket) return;

    const onChain = await getMarket(firstMarket.pda);
    expect(onChain).not.toBeNull();

    // On-chain question may have source suffix, so check containment
    const apiQ = firstMarket.question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const chainQ = onChain.question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    // The on-chain question should contain the core of the API question or vice versa
    const overlap = apiQ.split(' ').filter(w => w.length > 3 && chainQ.includes(w));
    expect(overlap.length).toBeGreaterThan(2); // At least 3 significant words match
  }, 15000);

  test('on-chain market has valid status code', async () => {
    const firstMarket = apiData.proofs[0]?.markets?.[0];
    if (!firstMarket) return;

    const onChain = await getMarket(firstMarket.pda);
    expect(onChain).not.toBeNull();
    expect(typeof onChain.statusCode).toBe('number');
    expect(onChain.statusCode).toBeGreaterThanOrEqual(0);
    expect(onChain.statusCode).toBeLessThanOrEqual(4);
  }, 15000);

  test('on-chain market publicKey matches PDA', async () => {
    const firstMarket = apiData.proofs[0]?.markets?.[0];
    if (!firstMarket) return;

    const onChain = await getMarket(firstMarket.pda);
    expect(onChain).not.toBeNull();
    expect(onChain.publicKey).toBe(firstMarket.pda);
  }, 15000);
});

describe('listMarkets() Integration', () => {
  let markets = null;

  test('listMarkets returns array of market objects', async () => {
    try {
      markets = await listMarkets();
      expect(Array.isArray(markets)).toBe(true);
      expect(markets.length).toBeGreaterThan(0);
    } catch (err) {
      // Rate limit on public RPC is expected — don't fail
      if (err.message?.includes('429')) {
        console.warn('Skipped due to RPC rate limit (429)');
        return;
      }
      throw err;
    }
  }, 30000);

  test('listed markets have required fields', async () => {
    if (!markets || markets.length === 0) {
      console.warn('Skipped — no markets loaded (likely rate limited)');
      return;
    }
    const sample = markets[0];
    expect(typeof sample.publicKey).toBe('string');
    expect(typeof sample.question).toBe('string');
    expect(typeof sample.status).toBe('string');
  }, 30000);
});
