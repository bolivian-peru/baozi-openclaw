import Database from "better-sqlite3";
import path from "path";

export type AgentStage =
  | "discovered"
  | "contacted"
  | "onboarding"
  | "profile_created"
  | "affiliate_registered"
  | "first_bet"
  | "active";

export interface Agent {
  id?: number;
  handle: string;
  source: string;
  stage: AgentStage;
  wallet?: string;
  notes?: string;
  discovered_at: string;
  updated_at: string;
}

const DB_PATH = path.join(__dirname, "..", "agents.db");

export function initDB() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handle TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'discovered',
      wallet TEXT,
      notes TEXT,
      discovered_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS affiliate_earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_handle TEXT NOT NULL,
      amount_sol REAL NOT NULL,
      recorded_at TEXT NOT NULL
    );
  `);
  return db;
}

export function upsertAgent(db: Database.Database, agent: Omit<Agent, "id">) {
  const stmt = db.prepare(`
    INSERT INTO agents (handle, source, stage, wallet, notes, discovered_at, updated_at)
    VALUES (@handle, @source, @stage, @wallet, @notes, @discovered_at, @updated_at)
    ON CONFLICT(handle) DO UPDATE SET
      stage = excluded.stage,
      wallet = COALESCE(excluded.wallet, agents.wallet),
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);
  stmt.run(agent);
}

export function advanceStage(
  db: Database.Database,
  handle: string,
  stage: AgentStage
) {
  db.prepare(
    `UPDATE agents SET stage = ?, updated_at = ? WHERE handle = ?`
  ).run(stage, new Date().toISOString(), handle);
}

export function getStats(db: Database.Database) {
  const counts = db
    .prepare(
      `SELECT stage, COUNT(*) as count FROM agents GROUP BY stage`
    )
    .all() as { stage: string; count: number }[];

  const earnings = db
    .prepare(`SELECT COALESCE(SUM(amount_sol), 0) as total FROM affiliate_earnings`)
    .get() as { total: number };

  return { counts, totalEarnings: earnings.total };
}
