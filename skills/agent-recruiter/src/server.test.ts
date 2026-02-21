import { describe, it, expect, beforeEach } from 'vitest';
import { app } from './server.js';
import { resetDb } from './db.js';

async function req(path: string, init?: RequestInit) {
  const res = await app.request(path, init);
  const body = await res.json();
  return { status: res.status, body };
}

describe('Agent Recruiter', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('GET / — health', () => {
    it('returns recruiter info', async () => {
      const { status, body } = await req('/');
      expect(status).toBe(200);
      expect(body.name).toBe('Baozi Agent Recruiter');
      expect(body.recruiterCode).toBeTruthy();
      expect(body.referralLink).toContain('baozi.bet');
    });
  });

  describe('POST /discover/manual — manual discovery', () => {
    it('adds agent manually', async () => {
      const { status, body } = await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'test-agent-1',
          name: 'TestBot',
          platform: 'twitter',
          endpoint: 'https://twitter.com/testbot',
          pitchType: 'general',
        }),
      });
      expect(status).toBe(201);
      expect(body.recruit.name).toBe('TestBot');
      expect(body.recruit.platform).toBe('twitter');
      expect(body.recruit.status).toBe('discovered');
    });

    it('rejects missing fields', async () => {
      const { status } = await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'x' }),
      });
      expect(status).toBe(400);
    });

    it('handles duplicate agent gracefully', async () => {
      const data = {
        agentId: 'dup-1', name: 'DupBot', platform: 'manual',
      };
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const { status, body } = await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      expect(status).toBe(201);
      expect(body.recruit.name).toBe('DupBot');
    });
  });

  describe('GET /recruits — listing', () => {
    it('lists all recruits', async () => {
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'a1', name: 'Bot1', platform: 'agentnet' }),
      });
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'a2', name: 'Bot2', platform: 'twitter' }),
      });

      const { status, body } = await req('/recruits');
      expect(status).toBe(200);
      expect(body.count).toBe(2);
    });

    it('filters by status', async () => {
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'b1', name: 'Bot1', platform: 'agentnet' }),
      });

      const { body } = await req('/recruits?status=discovered');
      expect(body.count).toBe(1);

      const { body: empty } = await req('/recruits?status=active');
      expect(empty.count).toBe(0);
    });

    it('filters by platform', async () => {
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'c1', name: 'Bot1', platform: 'agentnet' }),
      });
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'c2', name: 'Bot2', platform: 'twitter' }),
      });

      const { body } = await req('/recruits?platform=twitter');
      expect(body.count).toBe(1);
      expect(body.recruits[0].platform).toBe('twitter');
    });
  });

  describe('GET /recruits/:id — single recruit', () => {
    it('returns recruit with log', async () => {
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'd1', name: 'DetailBot', platform: 'manual' }),
      });

      const { status, body } = await req('/recruits/1');
      expect(status).toBe(200);
      expect(body.recruit.name).toBe('DetailBot');
      expect(body.log).toBeInstanceOf(Array);
    });

    it('returns 404 for non-existent', async () => {
      const { status } = await req('/recruits/999');
      expect(status).toBe(404);
    });
  });

  describe('GET /recruits/:id/pitch — personalized pitch', () => {
    it('returns pitch template for agent', async () => {
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'e1', name: 'CryptoBot', platform: 'agentnet', pitchType: 'crypto-analyst' }),
      });

      const { status, body } = await req('/recruits/1/pitch');
      expect(status).toBe(200);
      expect(body.template).toBe('crypto-analyst');
      expect(body.subject).toContain('Monetize');
      expect(body.body).toContain('baozi.bet');
    });
  });

  describe('POST /recruits/:id/contact — mark contacted', () => {
    it('updates status to contacted', async () => {
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'f1', name: 'ContactMe', platform: 'manual' }),
      });

      const { status, body } = await req('/recruits/1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Sent pitch via DM' }),
      });
      expect(status).toBe(200);
      expect(body.status).toBe('contacted');
    });
  });

  describe('POST /recruits/:id/onboard — onboarding flow', () => {
    it('starts onboarding with 6 steps', async () => {
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'g1', name: 'OnboardMe', platform: 'manual' }),
      });

      const { status, body } = await req('/recruits/1/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'TestWallet111' }),
      });
      expect(status).toBe(200);
      expect(body.status).toBe('onboarding');
      expect(body.steps).toHaveLength(6);
      expect(body.steps[0].name).toBe('Install MCP Server');
      expect(body.steps[5].name).toBe('Place First Bet');
      expect(body.recruiterCode).toBeTruthy();
    });
  });

  describe('POST /recruits/:id/step/:num — complete steps', () => {
    it('completes steps and updates status', async () => {
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'h1', name: 'StepBot', platform: 'manual' }),
      });
      await req('/recruits/1/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // Complete steps 1-2
      await req('/recruits/1/step/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: 'MCP installed' }),
      });
      await req('/recruits/1/step/2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: 'Profile created' }),
      });

      // Step 3 → status should become 'onboarded'
      const step3 = await req('/recruits/1/step/3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateCode: 'STEPBOT', details: 'Affiliate registered' }),
      });
      expect(step3.body.status).toBe('onboarded');

      // Steps 4-5
      await req('/recruits/1/step/4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      await req('/recruits/1/step/5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });

      // Step 6 → status should become 'active'
      const step6 = await req('/recruits/1/step/6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: 'First bet placed: 0.1 SOL on BTC market' }),
      });
      expect(step6.body.status).toBe('active');
      expect(step6.body.nextStep).toBeNull();
    });

    it('rejects invalid step number', async () => {
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'i1', name: 'BadStep', platform: 'manual' }),
      });
      const { status } = await req('/recruits/1/step/7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      expect(status).toBe(400);
    });
  });

  describe('GET /dashboard — stats', () => {
    it('shows recruiter dashboard with funnel', async () => {
      // Add some recruits at different stages
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'j1', name: 'Discovered', platform: 'agentnet' }),
      });
      await req('/discover/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'j2', name: 'Contacted', platform: 'twitter' }),
      });
      await req('/recruits/2/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      const { status, body } = await req('/dashboard');
      expect(status).toBe(200);
      expect(body.stats.totalDiscovered).toBe(2);
      expect(body.stats.totalContacted).toBe(1);
      expect(body.funnel).toBeDefined();
      expect(body.recruiter.code).toBeTruthy();
    });
  });

  describe('GET /templates — pitch templates', () => {
    it('lists all templates', async () => {
      const { status, body } = await req('/templates');
      expect(status).toBe(200);
      expect(body.count).toBeGreaterThanOrEqual(4);
      expect(body.templates[0].id).toBeTruthy();
      expect(body.templates[0].targetType).toBeTruthy();
    });

    it('returns full template by id', async () => {
      const { status, body } = await req('/templates/crypto-analyst');
      expect(status).toBe(200);
      expect(body.id).toBe('crypto-analyst');
      expect(body.body).toContain('baozi.bet');
    });

    it('returns 404 for unknown template', async () => {
      const { status } = await req('/templates/nonexistent');
      expect(status).toBe(404);
    });
  });
});
