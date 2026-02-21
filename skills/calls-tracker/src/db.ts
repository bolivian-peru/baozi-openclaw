import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";
import type { Call, CallerStats, Outcome } from "./types";
import { getTier } from "./types";

const DB_DIR = path.join(import.meta.dir, "..", "data");
const DB_PATH = path.join(DB_DIR, "calls.db");

let db: Database;

function getDb(): Database {
  if (db) return db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caller_name TEXT NOT NULL,
      caller_wallet TEXT NOT NULL,
      prediction_text TEXT NOT NULL,
      market_question TEXT NOT NULL,
      market_type TEXT NOT NULL CHECK(market_type IN ('A', 'B')),
      close_time TEXT NOT NULL,
      event_time TEXT,
      measurement_start TEXT,
      data_source TEXT NOT NULL,
      resolution_criteria TEXT NOT NULL,
      bet_amount REAL NOT NULL DEFAULT 0.1,
      side TEXT NOT NULL DEFAULT 'Yes' CHECK(side IN ('Yes', 'No')),
      market_pda TEXT,
      share_card_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'resolved')),
      outcome TEXT CHECK(outcome IN ('win', 'loss', 'void')),
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_name);
    CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
    CREATE INDEX IF NOT EXISTS idx_calls_wallet ON calls(caller_wallet);

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id INTEGER NOT NULL REFERENCES calls(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

/** Create a new call */
export function createCall(data: {
  caller_name: string;
  caller_wallet: string;
  prediction_text: string;
  market_question: string;
  market_type: string;
  close_time: string;
  event_time?: string | null;
  measurement_start?: string | null;
  data_source: string;
  resolution_criteria: string;
  bet_amount: number;
  side?: string;
}): Call {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT INTO calls (caller_name, caller_wallet, prediction_text, market_question, market_type,
      close_time, event_time, measurement_start, data_source, resolution_criteria, bet_amount, side)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.caller_name, data.caller_wallet, data.prediction_text,
    data.market_question, data.market_type, data.close_time,
    data.event_time ?? null, data.measurement_start ?? null,
    data.data_source, data.resolution_criteria, data.bet_amount,
    data.side ?? "Yes"
  );
  logActivity(Number(info.lastInsertRowid), "created", "Call registered");
  return getCall(Number(info.lastInsertRowid))!;
}

/** Get a single call */
export function getCall(id: number): Call | null {
  return getDb().prepare("SELECT * FROM calls WHERE id = ?").get(id) as Call | null;
}

/** List calls with optional filters */
export function listCalls(filters?: { caller?: string; status?: string; wallet?: string }): Call[] {
  let sql = "SELECT * FROM calls WHERE 1=1";
  const params: any[] = [];
  if (filters?.caller) { sql += " AND caller_name = ?"; params.push(filters.caller); }
  if (filters?.status) { sql += " AND status = ?"; params.push(filters.status); }
  if (filters?.wallet) { sql += " AND caller_wallet = ?"; params.push(filters.wallet); }
  sql += " ORDER BY created_at DESC";
  return getDb().prepare(sql).all(...params) as Call[];
}

/** Activate a call (market created on-chain) */
export function activateCall(id: number, marketPda: string, shareCardUrl: string | null): Call | null {
  const d = getDb();
  d.prepare("UPDATE calls SET status = 'active', market_pda = ?, share_card_url = ? WHERE id = ? AND status = 'pending'")
    .run(marketPda, shareCardUrl, id);
  logActivity(id, "activated", `Market PDA: ${marketPda}`);
  return getCall(id);
}

/** Resolve a call */
export function resolveCall(id: number, outcome: Outcome): Call | null {
  const d = getDb();
  d.prepare("UPDATE calls SET status = 'resolved', outcome = ?, resolved_at = datetime('now') WHERE id = ? AND status = 'active'")
    .run(outcome, id);
  logActivity(id, "resolved", `Outcome: ${outcome}`);
  return getCall(id);
}

/** Get caller stats */
export function getCallerStats(callerName: string): CallerStats | null {
  const d = getDb();
  const calls = d.prepare("SELECT * FROM calls WHERE caller_name = ? ORDER BY created_at ASC").all(callerName) as Call[];
  if (calls.length === 0) return null;

  const resolved = calls.filter(c => c.status === "resolved");
  const correct = resolved.filter(c => c.outcome === "win");
  const pending = calls.filter(c => c.status !== "resolved");
  const solWagered = calls.reduce((s, c) => s + c.bet_amount, 0);
  const solWon = correct.reduce((s, c) => s + c.bet_amount * 1.8, 0); // approx payout
  const solLost = resolved.filter(c => c.outcome === "loss").reduce((s, c) => s + c.bet_amount, 0);
  const hitRate = resolved.length > 0 ? correct.length / resolved.length : 0;

  // Current streak (from most recent resolved)
  let currentStreak = 0;
  for (let i = resolved.length - 1; i >= 0; i--) {
    if (resolved[i].outcome === "win") currentStreak++;
    else break;
  }

  // Best streak
  let bestStreak = 0, cur = 0;
  for (const c of resolved) {
    if (c.outcome === "win") { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
  }

  // Confidence score: accuracy * volume factor
  const volumeFactor = resolved.length >= 5 ? 1 + Math.log10(resolved.length) / 5 : 0.5 + resolved.length * 0.1;
  const streakBonus = currentStreak >= 3 ? 5 : 0;
  const confidenceScore = Math.min(100, hitRate * 80 * volumeFactor + streakBonus);

  return {
    caller_name: calls[0].caller_name,
    caller_wallet: calls[0].caller_wallet,
    total_calls: calls.length,
    resolved_calls: resolved.length,
    correct_calls: correct.length,
    pending_calls: pending.length,
    sol_wagered: solWagered,
    sol_won: solWon,
    sol_lost: solLost,
    hit_rate: hitRate,
    current_streak: currentStreak,
    best_streak: bestStreak,
    confidence_score: confidenceScore,
    tier: getTier(confidenceScore),
  };
}

/** Get leaderboard (all callers sorted by confidence) */
export function getLeaderboard(): CallerStats[] {
  const d = getDb();
  const callers = d.prepare("SELECT DISTINCT caller_name FROM calls").all() as { caller_name: string }[];
  return callers
    .map(c => getCallerStats(c.caller_name)!)
    .filter(Boolean)
    .sort((a, b) => b.confidence_score - a.confidence_score);
}

/** Get activity log for a call */
export function getActivityLog(callId: number): { action: string; details: string | null; created_at: string }[] {
  return getDb().prepare("SELECT action, details, created_at FROM activity_log WHERE call_id = ? ORDER BY created_at ASC")
    .all(callId) as any[];
}

/** Log activity */
function logActivity(callId: number, action: string, details: string | null): void {
  getDb().prepare("INSERT INTO activity_log (call_id, action, details) VALUES (?, ?, ?)").run(callId, action, details);
}

/** Dashboard stats */
export function getDashboard(): {
  total_calls: number;
  active_calls: number;
  resolved_calls: number;
  total_callers: number;
  total_sol_wagered: number;
  avg_hit_rate: number;
  top_caller: string | null;
} {
  const d = getDb();
  const total = (d.prepare("SELECT COUNT(*) as c FROM calls").get() as any).c;
  const active = (d.prepare("SELECT COUNT(*) as c FROM calls WHERE status = 'active'").get() as any).c;
  const resolved = (d.prepare("SELECT COUNT(*) as c FROM calls WHERE status = 'resolved'").get() as any).c;
  const callers = (d.prepare("SELECT COUNT(DISTINCT caller_name) as c FROM calls").get() as any).c;
  const wagered = (d.prepare("SELECT COALESCE(SUM(bet_amount), 0) as s FROM calls").get() as any).s;

  const leaderboard = getLeaderboard();
  const avgHitRate = leaderboard.length > 0
    ? leaderboard.reduce((s, c) => s + c.hit_rate, 0) / leaderboard.length
    : 0;
  const topCaller = leaderboard.length > 0 ? leaderboard[0].caller_name : null;

  return {
    total_calls: total,
    active_calls: active,
    resolved_calls: resolved,
    total_callers: callers,
    total_sol_wagered: wagered,
    avg_hit_rate: avgHitRate,
    top_caller: topCaller,
  };
}

/** Reset DB for tests */
export function resetDb(): void {
  if (db) { db.close(); db = undefined as any; }
  try { fs.unlinkSync(DB_PATH); } catch {}
  try { fs.unlinkSync(DB_PATH + "-wal"); } catch {}
  try { fs.unlinkSync(DB_PATH + "-shm"); } catch {}
  getDb(); // re-init
}
