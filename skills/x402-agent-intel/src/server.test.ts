import { describe, it, expect, beforeEach } from 'vitest';
import { app } from './server.js';
import { resetDb } from './db.js';

// Helper: make request to Hono app
async function req(path: string, init?: RequestInit) {
  const res = await app.request(path, init);
  const body = await res.json();
  return { status: res.status, body };
}

describe('x402 Agent Intel Marketplace', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('GET / — health', () => {
    it('returns marketplace info', async () => {
      const { status, body } = await req('/');
      expect(status).toBe(200);
      expect(body.name).toBe('x402 Agent Intel Marketplace');
      expect(body.version).toBe('1.0.0');
      expect(body.treasury).toBeTruthy();
      expect(body.network).toMatch(/^solana/);
    });
  });

  describe('POST /analysts — registration', () => {
    it('registers new analyst', async () => {
      const { status, body } = await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'TestWallet1111111111111111111111111111111111',
          name: 'TestAnalyst',
          affiliateCode: 'TEST',
        }),
      });
      expect(status).toBe(201);
      expect(body.analyst.name).toBe('TestAnalyst');
      expect(body.analyst.affiliateCode).toBe('TEST');
    });

    it('rejects missing fields', async () => {
      const { status, body } = await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'x', name: 'y' }),
      });
      expect(status).toBe(400);
      expect(body.error).toContain('required');
    });

    it('rejects short affiliateCode', async () => {
      const { status } = await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'x', name: 'y', affiliateCode: 'A' }),
      });
      expect(status).toBe(400);
    });

    it('rejects duplicate wallet', async () => {
      const data = { wallet: 'Dup111111111111111', name: 'Dup', affiliateCode: 'DUP1' };
      await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const { status } = await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, affiliateCode: 'DUP2' }),
      });
      expect(status).toBe(409);
    });
  });

  describe('POST /analyses — publish', () => {
    const thesis = 'A'.repeat(250); // valid thesis (200-2000 chars)

    it('publishes analysis for registered analyst', async () => {
      // Register first
      await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'W1', name: 'Analyst1', affiliateCode: 'A1' }),
      });

      const { status, body } = await req('/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'W1',
          marketPda: 'MKT1',
          thesis,
          recommendedSide: 'YES',
          confidence: 75,
          priceLamports: '10000000',
        }),
      });
      expect(status).toBe(201);
      expect(body.analysis.marketPda).toBe('MKT1');
      expect(body.analysis.confidence).toBe(75);
      expect(body.affiliateCode).toBe('A1');
    });

    it('rejects unregistered analyst', async () => {
      const { status } = await req('/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'UNKNOWN',
          marketPda: 'MKT1',
          thesis,
          recommendedSide: 'YES',
          confidence: 75,
          priceLamports: '10000000',
        }),
      });
      expect(status).toBe(403);
    });

    it('rejects short thesis', async () => {
      await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'W2', name: 'A2', affiliateCode: 'A2' }),
      });
      const { status } = await req('/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'W2',
          marketPda: 'MKT1',
          thesis: 'too short',
          recommendedSide: 'YES',
          confidence: 75,
          priceLamports: '10000000',
        }),
      });
      expect(status).toBe(400);
    });

    it('rejects invalid confidence', async () => {
      await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'W3', name: 'A3', affiliateCode: 'A3' }),
      });
      const { status } = await req('/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'W3',
          marketPda: 'MKT1',
          thesis,
          recommendedSide: 'YES',
          confidence: 150,
          priceLamports: '10000000',
        }),
      });
      expect(status).toBe(400);
    });
  });

  describe('GET /analyses — listing', () => {
    const thesis = 'B'.repeat(250);

    it('lists analyses with thesis hidden', async () => {
      await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'W4', name: 'A4', affiliateCode: 'A4' }),
      });
      await req('/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'W4', marketPda: 'MKT1', thesis,
          recommendedSide: 'YES', confidence: 80, priceLamports: '5000000',
        }),
      });

      const { status, body } = await req('/analyses');
      expect(status).toBe(200);
      expect(body.count).toBe(1);
      expect(body.analyses[0].analyst).toBe('A4');
      expect(body.analyses[0].confidence).toBe(80);
      // Thesis must NOT be in listing
      expect(body.analyses[0].thesis).toBeUndefined();
    });

    it('filters by market', async () => {
      await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'W5', name: 'A5', affiliateCode: 'A5' }),
      });
      await req('/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'W5', marketPda: 'MKT_BTC', thesis,
          recommendedSide: 'YES', confidence: 70, priceLamports: '1000000',
        }),
      });
      await req('/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'W5', marketPda: 'MKT_ETH', thesis,
          recommendedSide: 'NO', confidence: 60, priceLamports: '1000000',
        }),
      });

      const btc = await req('/analyses?market=MKT_BTC');
      expect(btc.body.count).toBe(1);
      expect(btc.body.analyses[0].marketPda).toBe('MKT_BTC');
    });
  });

  describe('GET /analyses/:id — x402 paywall', () => {
    const thesis = 'C'.repeat(300);

    it('returns 402 with x402 payment requirements when no payment', async () => {
      await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'W6', name: 'A6', affiliateCode: 'A6' }),
      });
      await req('/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'W6', marketPda: 'MKT1', thesis,
          recommendedSide: 'YES', confidence: 85, priceLamports: '10000000',
        }),
      });

      const { status, body } = await req('/analyses/1');
      expect(status).toBe(402);
      // x402 protocol response
      expect(body.x402Version).toBe(2);
      expect(body.accepts).toBeInstanceOf(Array);
      expect(body.accepts.length).toBeGreaterThan(0);
      expect(body.accepts[0].network).toMatch(/solana/);
    });

    it('returns 404 for non-existent analysis', async () => {
      const { status } = await req('/analyses/999');
      expect(status).toBe(404);
    });
  });

  describe('POST /analyses/:id/resolve — prediction resolution', () => {
    const thesis = 'D'.repeat(250);

    it('resolves prediction and tracks correct/incorrect', async () => {
      await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'W7', name: 'A7', affiliateCode: 'A7' }),
      });
      await req('/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'W7', marketPda: 'MKT1', thesis,
          recommendedSide: 'YES', confidence: 90, priceLamports: '10000000',
        }),
      });

      const { status, body } = await req('/analyses/1/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'YES' }),
      });
      expect(status).toBe(200);
      expect(body.correct).toBe(true);
      expect(body.outcome).toBe('YES');
    });

    it('prevents double resolution', async () => {
      await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'W8', name: 'A8', affiliateCode: 'A8' }),
      });
      await req('/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: 'W8', marketPda: 'MKT1', thesis,
          recommendedSide: 'YES', confidence: 90, priceLamports: '10000000',
        }),
      });
      await req('/analyses/1/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'YES' }),
      });

      const { status } = await req('/analyses/1/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'NO' }),
      });
      expect(status).toBe(409);
    });
  });

  describe('GET /analysts/:wallet/stats — reputation', () => {
    const thesis = 'E'.repeat(250);

    it('tracks analyst reputation across predictions', async () => {
      await req('/analysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'W9', name: 'Oracle', affiliateCode: 'ORC' }),
      });

      // Publish 3 analyses
      for (let i = 0; i < 3; i++) {
        await req('/analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: 'W9', marketPda: `MKT${i}`, thesis,
            recommendedSide: 'YES', confidence: 80, priceLamports: '10000000',
          }),
        });
      }

      // Resolve 2 correct, 1 wrong
      await req('/analyses/1/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'YES' }),
      });
      await req('/analyses/2/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'YES' }),
      });
      await req('/analyses/3/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'NO' }),
      });

      const { status, body } = await req('/analysts/W9/stats');
      expect(status).toBe(200);
      expect(body.analyst).toBe('Oracle');
      expect(body.totalPredictions).toBe(3);
      expect(body.resolvedPredictions).toBe(3);
      expect(body.correctPredictions).toBe(2);
      expect(body.accuracy).toBe(67); // 2/3 = 66.7% → rounds to 67
    });

    it('returns 404 for unknown analyst', async () => {
      const { status } = await req('/analysts/UNKNOWN/stats');
      expect(status).toBe(404);
    });
  });
});
