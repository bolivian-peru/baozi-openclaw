import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as db from './db.js';
import { discoverFromAgentNet, discoverManual, getDiscoveryStats } from './discovery.js';
import { getOnboardingSteps, startOnboarding, completeStep, setRecruitWallet, setRecruitAffiliate } from './onboarding.js';
import { PITCH_TEMPLATES, getPitchForAgent } from './templates.js';

const PORT = Number(process.env.PORT || 3041);
const RECRUITER_CODE = process.env.RECRUITER_AFFILIATE_CODE || 'RECRUITER';

const app = new Hono();
app.use('*', cors());

// --- Health ---
app.get('/', (c) => c.json({
  name: 'Baozi Agent Recruiter',
  version: '1.0.0',
  description: 'AI agent that recruits other agents to trade on Baozi prediction markets',
  recruiterCode: RECRUITER_CODE,
  referralLink: `https://baozi.bet/?ref=${RECRUITER_CODE}`,
  endpoints: {
    discover: 'POST /discover — scan AgentNet for recruiterable agents',
    discoverManual: 'POST /discover/manual — add agent manually',
    recruits: 'GET /recruits — list all recruited agents',
    recruit: 'GET /recruits/:id — get recruit details',
    pitch: 'GET /recruits/:id/pitch — get personalized pitch for agent',
    contact: 'POST /recruits/:id/contact — mark agent as contacted',
    onboard: 'POST /recruits/:id/onboard — start onboarding flow',
    step: 'POST /recruits/:id/step/:num — complete onboarding step',
    dashboard: 'GET /dashboard — recruiter stats + performance',
    templates: 'GET /templates — all pitch templates',
  },
}));

// --- Discovery ---

// Scan AgentNet for agents to recruit
app.post('/discover', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const limit = body.limit || 50;

  try {
    const agents = await discoverFromAgentNet(limit);
    return c.json({
      discovered: agents.length,
      agents: agents.map(a => ({
        id: a.id,
        agentId: a.agentId,
        name: a.name,
        platform: a.platform,
        status: a.status,
        pitchType: a.pitchType,
      })),
    });
  } catch (e: any) {
    return c.json({ error: `discovery failed: ${e.message}` }, 502);
  }
});

// Add agent manually
app.post('/discover/manual', async (c) => {
  const body = await c.req.json();
  const { agentId, name, platform, endpoint, pitchType } = body;

  if (!agentId || !name || !platform) {
    return c.json({ error: 'agentId, name, platform required' }, 400);
  }

  const recruit = discoverManual(agentId, name, platform, endpoint || '', pitchType || 'general');
  return c.json({ recruit }, 201);
});

// --- Recruits ---

// List all recruits
app.get('/recruits', (c) => {
  const status = c.req.query('status') as any;
  const platform = c.req.query('platform');
  const recruits = db.listRecruits(status || undefined, platform || undefined);
  return c.json({
    count: recruits.length,
    recruits: recruits.map(r => ({
      id: r.id,
      agentId: r.agentId,
      name: r.name,
      platform: r.platform,
      status: r.status,
      pitchType: r.pitchType,
      wallet: r.wallet,
      affiliateCode: r.affiliateCode,
      discoveredAt: r.discoveredAt,
      onboardedAt: r.onboardedAt,
      firstBetAt: r.firstBetAt,
    })),
  });
});

// Get single recruit
app.get('/recruits/:id', (c) => {
  const id = Number(c.req.param('id'));
  const recruit = db.getRecruitById(id);
  if (!recruit) return c.json({ error: 'recruit not found' }, 404);

  const log = db.getLog(recruit.id);
  return c.json({ recruit, log });
});

// Get personalized pitch for agent
app.get('/recruits/:id/pitch', (c) => {
  const id = Number(c.req.param('id'));
  const recruit = db.getRecruitById(id);
  if (!recruit) return c.json({ error: 'recruit not found' }, 404);

  const template = PITCH_TEMPLATES.find(t => t.id === recruit.pitchType) || PITCH_TEMPLATES[3];
  return c.json({
    recruit: recruit.name,
    template: template.id,
    targetType: template.targetType,
    subject: template.subject,
    body: template.body,
  });
});

// Mark as contacted
app.post('/recruits/:id/contact', async (c) => {
  const id = Number(c.req.param('id'));
  const recruit = db.getRecruitById(id);
  if (!recruit) return c.json({ error: 'recruit not found' }, 404);

  const body = await c.req.json().catch(() => ({}));
  db.updateStatus(recruit.agentId, 'contacted');
  db.logAction(recruit.id, 'contacted', body.notes || `Pitch sent: ${recruit.pitchType}`);

  return c.json({ status: 'contacted', recruit: recruit.name });
});

// --- Onboarding ---

// Start onboarding flow
app.post('/recruits/:id/onboard', async (c) => {
  const id = Number(c.req.param('id'));
  const recruit = db.getRecruitById(id);
  if (!recruit) return c.json({ error: 'recruit not found' }, 404);

  const body = await c.req.json().catch(() => ({}));
  if (body.wallet) setRecruitWallet(recruit.agentId, body.wallet);

  const result = startOnboarding(recruit.agentId);
  return c.json({
    status: 'onboarding',
    recruit: result.recruit.name,
    steps: result.steps,
    recruiterCode: RECRUITER_CODE,
    referralLink: `https://baozi.bet/?ref=${RECRUITER_CODE}`,
  });
});

// Complete onboarding step
app.post('/recruits/:id/step/:num', async (c) => {
  const id = Number(c.req.param('id'));
  const stepNum = Number(c.req.param('num'));
  const recruit = db.getRecruitById(id);
  if (!recruit) return c.json({ error: 'recruit not found' }, 404);

  if (stepNum < 1 || stepNum > 6) return c.json({ error: 'step must be 1-6' }, 400);

  const body = await c.req.json().catch(() => ({}));
  if (body.wallet) setRecruitWallet(recruit.agentId, body.wallet);
  if (body.affiliateCode) setRecruitAffiliate(recruit.agentId, body.affiliateCode);

  completeStep(recruit.agentId, stepNum, body.details);

  const updated = db.getRecruitById(id)!;
  const steps = getOnboardingSteps(updated.name);
  steps.forEach((s, i) => { if (i < stepNum) s.completed = true; });

  return c.json({
    step: stepNum,
    completed: true,
    status: updated.status,
    nextStep: stepNum < 6 ? steps[stepNum] : null,
  });
});

// --- Dashboard ---
app.get('/dashboard', (c) => {
  const stats = db.getStats();
  const discovery = getDiscoveryStats();
  const recent = db.listRecruits().slice(0, 10);

  return c.json({
    recruiter: {
      code: RECRUITER_CODE,
      referralLink: `https://baozi.bet/?ref=${RECRUITER_CODE}`,
    },
    stats,
    discovery,
    recentRecruits: recent.map(r => ({
      name: r.name,
      platform: r.platform,
      status: r.status,
      discoveredAt: r.discoveredAt,
    })),
    funnel: {
      discovered: stats.totalDiscovered,
      contacted: stats.totalContacted,
      onboarded: stats.totalOnboarded,
      active: stats.totalActive,
      conversionRate: `${stats.conversionRate}%`,
    },
  });
});

// --- Templates ---
app.get('/templates', (c) => {
  return c.json({
    count: PITCH_TEMPLATES.length,
    templates: PITCH_TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      targetType: t.targetType,
      subject: t.subject,
      bodyPreview: t.body.slice(0, 100) + '...',
    })),
  });
});

// Get full template
app.get('/templates/:id', (c) => {
  const id = c.req.param('id');
  const template = PITCH_TEMPLATES.find(t => t.id === id);
  if (!template) return c.json({ error: 'template not found' }, 404);
  return c.json(template);
});

// --- Start ---
console.log(`baozi agent recruiter starting on port ${PORT}`);
console.log(`recruiter code: ${RECRUITER_CODE}`);
console.log(`referral link: https://baozi.bet/?ref=${RECRUITER_CODE}`);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`listening on http://localhost:${info.port}`);
});

export { app };
