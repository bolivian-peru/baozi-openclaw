import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RecruitedAgent, RecruitStatus, RecruiterStats } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'recruiter.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recruits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      endpoint TEXT NOT NULL DEFAULT '',
      wallet TEXT,
      affiliate_code TEXT,
      status TEXT NOT NULL DEFAULT 'discovered',
      pitch_type TEXT NOT NULL DEFAULT 'general',
      discovered_at TEXT DEFAULT (datetime('now')),
      onboarded_at TEXT,
      first_bet_at TEXT
    );

    CREATE TABLE IF NOT EXISTS outreach_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recruit_id INTEGER NOT NULL REFERENCES recruits(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_recruits_status ON recruits(status);
    CREATE INDEX IF NOT EXISTS idx_recruits_platform ON recruits(platform);
  `);
}

function rowToRecruit(row: any): RecruitedAgent {
  return {
    id: row.id,
    agentId: row.agent_id,
    name: row.name,
    platform: row.platform,
    endpoint: row.endpoint,
    wallet: row.wallet,
    affiliateCode: row.affiliate_code,
    status: row.status,
    pitchType: row.pitch_type,
    discoveredAt: row.discovered_at,
    onboardedAt: row.onboarded_at,
    firstBetAt: row.first_bet_at,
  };
}

// --- Discovery ---

export function addRecruit(
  agentId: string, name: string, platform: string,
  endpoint: string, pitchType: string
): RecruitedAgent {
  const stmt = getDb().prepare(
    `INSERT OR IGNORE INTO recruits (agent_id, name, platform, endpoint, pitch_type)
     VALUES (?, ?, ?, ?, ?)`
  );
  const result = stmt.run(agentId, name, platform, endpoint, pitchType);
  if (result.changes === 0) {
    // Already exists
    return getRecruit(agentId)!;
  }
  return getRecruit(agentId)!;
}

export function getRecruit(agentId: string): RecruitedAgent | undefined {
  const row = getDb().prepare('SELECT * FROM recruits WHERE agent_id = ?').get(agentId) as any;
  return row ? rowToRecruit(row) : undefined;
}

export function getRecruitById(id: number): RecruitedAgent | undefined {
  const row = getDb().prepare('SELECT * FROM recruits WHERE id = ?').get(id) as any;
  return row ? rowToRecruit(row) : undefined;
}

export function updateStatus(agentId: string, status: RecruitStatus) {
  const updates: Record<string, string> = {};
  if (status === 'onboarded') updates.onboarded_at = new Date().toISOString();
  if (status === 'active') updates.first_bet_at = new Date().toISOString();

  let sql = 'UPDATE recruits SET status = ?';
  const params: any[] = [status];
  for (const [col, val] of Object.entries(updates)) {
    sql += `, ${col} = ?`;
    params.push(val);
  }
  sql += ' WHERE agent_id = ?';
  params.push(agentId);

  getDb().prepare(sql).run(...params);
}

export function setWallet(agentId: string, wallet: string) {
  getDb().prepare('UPDATE recruits SET wallet = ? WHERE agent_id = ?').run(wallet, agentId);
}

export function setAffiliateCode(agentId: string, code: string) {
  getDb().prepare('UPDATE recruits SET affiliate_code = ? WHERE agent_id = ?').run(code, agentId);
}

// --- Tracking ---

export function listRecruits(status?: RecruitStatus, platform?: string): RecruitedAgent[] {
  let query = 'SELECT * FROM recruits WHERE 1=1';
  const params: any[] = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (platform) { query += ' AND platform = ?'; params.push(platform); }
  query += ' ORDER BY discovered_at DESC';
  return (getDb().prepare(query).all(...params) as any[]).map(rowToRecruit);
}

export function getStats(): RecruiterStats {
  const d = getDb();
  const total = (d.prepare('SELECT COUNT(*) as c FROM recruits').get() as any).c;
  const contacted = (d.prepare("SELECT COUNT(*) as c FROM recruits WHERE status != 'discovered'").get() as any).c;
  const onboarded = (d.prepare("SELECT COUNT(*) as c FROM recruits WHERE status IN ('onboarded', 'active')").get() as any).c;
  const active = (d.prepare("SELECT COUNT(*) as c FROM recruits WHERE status = 'active'").get() as any).c;
  return {
    totalDiscovered: total,
    totalContacted: contacted,
    totalOnboarded: onboarded,
    totalActive: active,
    conversionRate: total > 0 ? Math.round((active / total) * 100) : 0,
  };
}

// --- Outreach Log ---

export function logAction(recruitId: number, action: string, details?: string) {
  getDb().prepare(
    'INSERT INTO outreach_log (recruit_id, action, details) VALUES (?, ?, ?)'
  ).run(recruitId, action, details || null);
}

export function getLog(recruitId: number) {
  return getDb().prepare(
    'SELECT * FROM outreach_log WHERE recruit_id = ? ORDER BY created_at DESC'
  ).all(recruitId) as any[];
}

export function resetDb() {
  if (db) { db.close(); db = undefined!; }
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  for (const ext of ['-wal', '-shm']) {
    const p = DB_PATH + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  getDb();
}
