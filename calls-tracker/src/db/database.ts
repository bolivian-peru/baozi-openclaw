/**
 * SQLite database for tracking callers, calls, and reputation
 */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { Caller, Call, CallStatus, ReputationScore } from "../types/index.js";

const DEFAULT_DB_PATH = "calls-tracker.db";

export class CallsDatabase {
  private db: Database.Database;

  constructor(dbPath: string = DEFAULT_DB_PATH) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS callers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        social_handle TEXT,
        platform TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY,
        caller_id TEXT NOT NULL REFERENCES callers(id),
        raw_text TEXT NOT NULL,
        question TEXT NOT NULL,
        data_source TEXT NOT NULL,
        resolution_criteria TEXT NOT NULL,
        subject TEXT NOT NULL,
        target_value REAL,
        direction TEXT,
        deadline TEXT NOT NULL,
        market_type TEXT NOT NULL DEFAULT 'boolean',
        race_outcomes TEXT,
        confidence INTEGER,
        market_pda TEXT,
        bet_tx_signature TEXT,
        bet_amount REAL NOT NULL DEFAULT 0,
        bet_side TEXT NOT NULL DEFAULT 'yes',
        share_card_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        outcome TEXT,
        pnl REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
      CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
      CREATE INDEX IF NOT EXISTS idx_calls_market ON calls(market_pda);
    `);
  }

  // ─── Callers ────────────────────────────────────────────────

  registerCaller(name: string, walletAddress: string, socialHandle?: string, platform?: string): Caller {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO callers (id, name, wallet_address, social_handle, platform, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, walletAddress, socialHandle || null, platform || null, now);
    return { id, name, walletAddress, socialHandle, platform, createdAt: now };
  }

  getCaller(id: string): Caller | undefined {
    const row = this.db.prepare("SELECT * FROM callers WHERE id = ?").get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      walletAddress: row.wallet_address,
      socialHandle: row.social_handle,
      platform: row.platform,
      createdAt: row.created_at,
    };
  }

  getCallerByWallet(walletAddress: string): Caller | undefined {
    const row = this.db.prepare("SELECT * FROM callers WHERE wallet_address = ?").get(walletAddress) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      walletAddress: row.wallet_address,
      socialHandle: row.social_handle,
      platform: row.platform,
      createdAt: row.created_at,
    };
  }

  getCallerByName(name: string): Caller | undefined {
    const row = this.db.prepare("SELECT * FROM callers WHERE name = ?").get(name) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      walletAddress: row.wallet_address,
      socialHandle: row.social_handle,
      platform: row.platform,
      createdAt: row.created_at,
    };
  }

  listCallers(): Caller[] {
    const rows = this.db.prepare("SELECT * FROM callers ORDER BY created_at").all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      walletAddress: r.wallet_address,
      socialHandle: r.social_handle,
      platform: r.platform,
      createdAt: r.created_at,
    }));
  }

  // ─── Calls ──────────────────────────────────────────────────

  createCall(callerId: string, prediction: {
    rawText: string;
    question: string;
    dataSource: string;
    resolutionCriteria: string;
    subject: string;
    targetValue?: number;
    direction?: string;
    deadline: string;
    marketType: "boolean" | "race";
    raceOutcomes?: string[];
    confidence?: number;
  }, betAmount: number, betSide: string): Call {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO calls (
        id, caller_id, raw_text, question, data_source, resolution_criteria,
        subject, target_value, direction, deadline, market_type, race_outcomes,
        confidence, bet_amount, bet_side, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      id, callerId, prediction.rawText, prediction.question,
      prediction.dataSource, prediction.resolutionCriteria,
      prediction.subject, prediction.targetValue || null,
      prediction.direction || null, prediction.deadline,
      prediction.marketType, prediction.raceOutcomes ? JSON.stringify(prediction.raceOutcomes) : null,
      prediction.confidence || null, betAmount, betSide, now
    );
    return {
      id,
      callerId,
      prediction: {
        rawText: prediction.rawText,
        question: prediction.question,
        dataSource: prediction.dataSource,
        resolutionCriteria: prediction.resolutionCriteria,
        subject: prediction.subject,
        targetValue: prediction.targetValue,
        direction: prediction.direction,
        deadline: prediction.deadline,
        marketType: prediction.marketType,
        raceOutcomes: prediction.raceOutcomes,
        confidence: prediction.confidence,
      },
      betAmount,
      betSide,
      status: "pending",
      createdAt: now,
    };
  }

  updateCallStatus(callId: string, status: CallStatus, extra?: {
    marketPda?: string;
    betTxSignature?: string;
    shareCardUrl?: string;
    outcome?: "correct" | "incorrect" | "cancelled";
    pnl?: number;
  }): void {
    const sets: string[] = ["status = ?"];
    const vals: any[] = [status];

    if (extra?.marketPda) { sets.push("market_pda = ?"); vals.push(extra.marketPda); }
    if (extra?.betTxSignature) { sets.push("bet_tx_signature = ?"); vals.push(extra.betTxSignature); }
    if (extra?.shareCardUrl) { sets.push("share_card_url = ?"); vals.push(extra.shareCardUrl); }
    if (extra?.outcome) { sets.push("outcome = ?"); vals.push(extra.outcome); }
    if (extra?.pnl !== undefined) { sets.push("pnl = ?"); vals.push(extra.pnl); }
    if (status === "resolved" || status === "cancelled") {
      sets.push("resolved_at = ?");
      vals.push(new Date().toISOString());
    }

    vals.push(callId);
    this.db.prepare(`UPDATE calls SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }

  getCall(id: string): Call | undefined {
    const row = this.db.prepare("SELECT * FROM calls WHERE id = ?").get(id) as any;
    return row ? this.rowToCall(row) : undefined;
  }

  getCallByMarket(marketPda: string): Call | undefined {
    const row = this.db.prepare("SELECT * FROM calls WHERE market_pda = ?").get(marketPda) as any;
    return row ? this.rowToCall(row) : undefined;
  }

  listCalls(callerId?: string, status?: CallStatus): Call[] {
    let sql = "SELECT * FROM calls WHERE 1=1";
    const params: any[] = [];
    if (callerId) { sql += " AND caller_id = ?"; params.push(callerId); }
    if (status) { sql += " AND status = ?"; params.push(status); }
    sql += " ORDER BY created_at DESC";
    return (this.db.prepare(sql).all(...params) as any[]).map(this.rowToCall);
  }

  private rowToCall(row: any): Call {
    return {
      id: row.id,
      callerId: row.caller_id,
      prediction: {
        rawText: row.raw_text,
        question: row.question,
        dataSource: row.data_source,
        resolutionCriteria: row.resolution_criteria,
        subject: row.subject,
        targetValue: row.target_value,
        direction: row.direction,
        deadline: row.deadline,
        marketType: row.market_type,
        raceOutcomes: row.race_outcomes ? JSON.parse(row.race_outcomes) : undefined,
        confidence: row.confidence,
      },
      marketPda: row.market_pda || undefined,
      betTxSignature: row.bet_tx_signature || undefined,
      betAmount: row.bet_amount,
      betSide: row.bet_side,
      shareCardUrl: row.share_card_url || undefined,
      status: row.status as CallStatus,
      outcome: row.outcome || undefined,
      pnl: row.pnl,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at || undefined,
    };
  }

  // ─── Reputation ─────────────────────────────────────────────

  getReputation(callerId: string): ReputationScore | undefined {
    const caller = this.getCaller(callerId);
    if (!caller) return undefined;

    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN outcome = 'correct' THEN 1 ELSE 0 END) as correct,
        SUM(CASE WHEN outcome = 'incorrect' THEN 1 ELSE 0 END) as incorrect,
        SUM(CASE WHEN status NOT IN ('resolved', 'cancelled') THEN 1 ELSE 0 END) as pending,
        SUM(bet_amount) as total_wagered,
        SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END) as total_won,
        SUM(CASE WHEN pnl < 0 THEN ABS(pnl) ELSE 0 END) as total_lost,
        SUM(COALESCE(pnl, 0)) as net_pnl
      FROM calls WHERE caller_id = ?
    `).get(callerId) as any;

    const resolved = (stats.correct || 0) + (stats.incorrect || 0);
    const hitRate = resolved > 0 ? (stats.correct || 0) / resolved : 0;

    // Calculate streaks
    const resolvedCalls = this.db.prepare(`
      SELECT outcome FROM calls
      WHERE caller_id = ? AND outcome IS NOT NULL
      ORDER BY resolved_at ASC
    `).all(callerId) as any[];

    let currentStreak = 0;
    let bestStreak = 0;
    let streak = 0;
    for (const c of resolvedCalls) {
      if (c.outcome === "correct") {
        streak++;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        streak = 0;
      }
    }
    currentStreak = streak;

    // Confidence-weighted score: hitRate * 50 + log(totalCalls) * 15 + streakBonus * 10 + pnlFactor * 25
    const callsLog = Math.min(Math.log10(Math.max(stats.total, 1) + 1) / Math.log10(50), 1);
    const streakBonus = Math.min(currentStreak / 10, 1);
    const pnlFactor = stats.net_pnl > 0 ? Math.min(stats.net_pnl / 10, 1) : 0;
    const confidenceScore = Math.round(
      hitRate * 50 + callsLog * 15 + streakBonus * 10 + pnlFactor * 25
    );

    return {
      callerId,
      callerName: caller.name,
      walletAddress: caller.walletAddress,
      totalCalls: stats.total || 0,
      correctCalls: stats.correct || 0,
      incorrectCalls: stats.incorrect || 0,
      pendingCalls: stats.pending || 0,
      hitRate: Math.round(hitRate * 10000) / 100,
      currentStreak,
      bestStreak,
      totalWagered: stats.total_wagered || 0,
      totalWon: stats.total_won || 0,
      totalLost: stats.total_lost || 0,
      netPnl: stats.net_pnl || 0,
      confidenceScore,
    };
  }

  getLeaderboard(limit: number = 20): ReputationScore[] {
    const callers = this.listCallers();
    const scores = callers
      .map((c) => this.getReputation(c.id))
      .filter((s): s is ReputationScore => s !== undefined && s.totalCalls > 0);

    // Sort by confidence score descending
    scores.sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Assign ranks
    scores.forEach((s, i) => { s.rank = i + 1; });

    return scores.slice(0, limit);
  }

  close(): void {
    this.db.close();
  }
}
