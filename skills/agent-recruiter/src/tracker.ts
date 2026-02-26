/**
 * Agent Recruiter — SQLite Persistence Layer
 * Tracks discovered agents, outreach state, and affiliate earnings
 */

import Database from 'better-sqlite3';
import { config, RecruitmentStage } from './config';

export interface AgentRecord {
  id: string;
  source: string;
  handle: string;
  description: string;
  persona: 'crypto' | 'trading' | 'social' | 'general';
  stage: RecruitmentStage;
  affiliateCode?: string;
  walletAddress?: string;
  outreachSentAt?: string;
  profileCreatedAt?: string;
  firstBetAt?: string;
  volumeGenerated: number;
  affiliateEarnings: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        handle TEXT NOT NULL,
        description TEXT DEFAULT '',
        persona TEXT DEFAULT 'general',
        stage TEXT DEFAULT 'discovered',
        affiliate_code TEXT,
        wallet_address TEXT,
        outreach_sent_at TEXT,
        profile_created_at TEXT,
        first_bet_at TEXT,
        volume_generated REAL DEFAULT 0,
        affiliate_earnings REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS outreach_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        message TEXT NOT NULL,
        platform TEXT NOT NULL,
        post_id TEXT,
        sent_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS affiliate_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        affiliate_code TEXT NOT NULL,
        total_referrals INTEGER DEFAULT 0,
        total_volume REAL DEFAULT 0,
        total_earnings REAL DEFAULT 0,
        checked_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }
  return db;
}

export function upsertAgent(agent: Partial<AgentRecord> & { id: string; source: string; handle: string }): void {
  const d = getDb();
  const existing = d.prepare('SELECT id FROM agents WHERE id = ?').get(agent.id);

  if (existing) {
    d.prepare(`
      UPDATE agents SET
        stage = COALESCE(?, stage),
        affiliate_code = COALESCE(?, affiliate_code),
        wallet_address = COALESCE(?, wallet_address),
        outreach_sent_at = COALESCE(?, outreach_sent_at),
        profile_created_at = COALESCE(?, profile_created_at),
        first_bet_at = COALESCE(?, first_bet_at),
        volume_generated = ?,
        affiliate_earnings = ?,
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      agent.stage || null,
      agent.affiliateCode || null,
      agent.walletAddress || null,
      agent.outreachSentAt || null,
      agent.profileCreatedAt || null,
      agent.firstBetAt || null,
      agent.volumeGenerated || 0,
      agent.affiliateEarnings || 0,
      agent.notes || null,
      agent.id
    );
  } else {
    d.prepare(`
      INSERT INTO agents (id, source, handle, description, persona, stage, affiliate_code, wallet_address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      agent.id,
      agent.source,
      agent.handle,
      agent.description || '',
      agent.persona || 'general',
      agent.stage || config.stages.DISCOVERED,
      agent.affiliateCode || null,
      agent.walletAddress || null,
      agent.notes || ''
    );
  }
}

export function logOutreach(agentId: string, message: string, platform: string, postId?: string): void {
  getDb().prepare(`
    INSERT INTO outreach_log (agent_id, message, platform, post_id)
    VALUES (?, ?, ?, ?)
  `).run(agentId, message, platform, postId || null);
}

export function logAffiliateStats(code: string, referrals: number, volume: number, earnings: number): void {
  getDb().prepare(`
    INSERT INTO affiliate_stats (affiliate_code, total_referrals, total_volume, total_earnings)
    VALUES (?, ?, ?, ?)
  `).run(code, referrals, volume, earnings);
}

export function getAllAgents(): AgentRecord[] {
  return getDb().prepare('SELECT * FROM agents ORDER BY updated_at DESC').all() as AgentRecord[];
}

export function getAgentsByStage(stage: RecruitmentStage): AgentRecord[] {
  return getDb().prepare('SELECT * FROM agents WHERE stage = ?').all(stage) as AgentRecord[];
}

export function getSummary(): {
  total: number;
  byStage: Record<string, number>;
  volumeGenerated: number;
  affiliateEarnings: number;
} {
  const d = getDb();
  const total = (d.prepare('SELECT COUNT(*) as n FROM agents').get() as { n: number }).n;
  const stages = d.prepare('SELECT stage, COUNT(*) as n FROM agents GROUP BY stage').all() as Array<{ stage: string; n: number }>;
  const byStage: Record<string, number> = {};
  for (const s of stages) byStage[s.stage] = s.n;

  const vols = d.prepare('SELECT SUM(volume_generated) as v, SUM(affiliate_earnings) as e FROM agents').get() as {
    v: number | null;
    e: number | null;
  };

  return {
    total,
    byStage,
    volumeGenerated: vols.v || 0,
    affiliateEarnings: vols.e || 0,
  };
}

export function getRecentOutreach(limit = 10): Array<{ agent_id: string; platform: string; sent_at: string; post_id: string }> {
  return getDb()
    .prepare('SELECT agent_id, platform, sent_at, post_id FROM outreach_log ORDER BY sent_at DESC LIMIT ?')
    .all(limit) as Array<{ agent_id: string; platform: string; sent_at: string; post_id: string }>;
}
