import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from './config';

let db: Database.Database;

export interface MarketRecord {
  id?: number;
  market_pda: string;
  market_id: number;
  question: string;
  category: string;
  source: string;
  source_url: string;
  closing_time: string;
  created_at: string;
  status: string; // 'active' | 'closed' | 'resolved' | 'cancelled'
  resolution_outcome: string | null; // 'yes' | 'no' | null
  volume_sol: number;
  fees_earned_sol: number;
}

export interface CategoryStats {
  category: string;
  markets_created: number;
  total_volume_sol: number;
  total_fees_sol: number;
  avg_volume_sol: number;
}

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(config.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS markets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        market_pda TEXT UNIQUE NOT NULL,
        market_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        category TEXT NOT NULL,
        source TEXT NOT NULL,
        source_url TEXT DEFAULT '',
        closing_time TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        status TEXT NOT NULL DEFAULT 'active',
        resolution_outcome TEXT,
        volume_sol REAL DEFAULT 0,
        fees_earned_sol REAL DEFAULT 0,
        tx_signature TEXT
      );

      CREATE TABLE IF NOT EXISTS seen_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_hash TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        source TEXT NOT NULL,
        detected_at TEXT NOT NULL DEFAULT (datetime('now')),
        market_created INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        markets_created INTEGER DEFAULT 0,
        markets_resolved INTEGER DEFAULT 0,
        total_volume_sol REAL DEFAULT 0,
        total_fees_sol REAL DEFAULT 0,
        best_category TEXT
      );
    `);
  }
  return db;
}

export function recordMarket(record: Omit<MarketRecord, 'id' | 'created_at' | 'status' | 'volume_sol' | 'fees_earned_sol'> & { tx_signature?: string }): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO markets (market_pda, market_id, question, category, source, source_url, closing_time, tx_signature)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.market_pda,
    record.market_id,
    record.question,
    record.category,
    record.source,
    record.source_url || '',
    record.closing_time,
    record.tx_signature || null
  );
}

export function updateMarketStatus(marketPda: string, status: string, outcome?: string): void {
  const db = getDb();
  if (outcome) {
    db.prepare('UPDATE markets SET status = ?, resolution_outcome = ? WHERE market_pda = ?')
      .run(status, outcome, marketPda);
  } else {
    db.prepare('UPDATE markets SET status = ? WHERE market_pda = ?')
      .run(status, marketPda);
  }
}

export function updateMarketVolume(marketPda: string, volumeSol: number, feesSol: number): void {
  const db = getDb();
  db.prepare('UPDATE markets SET volume_sol = ?, fees_earned_sol = ? WHERE market_pda = ?')
    .run(volumeSol, feesSol, marketPda);
}

export function getActiveMarkets(): MarketRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM markets WHERE status = 'active' ORDER BY closing_time ASC").all() as MarketRecord[];
}

export function getAllMarkets(): MarketRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM markets ORDER BY created_at DESC').all() as MarketRecord[];
}

export function getMarketByPda(pda: string): MarketRecord | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM markets WHERE market_pda = ?').get(pda) as MarketRecord | undefined;
}

export function isDuplicate(question: string): boolean {
  const db = getDb();
  // Check if a similar question already exists (fuzzy match)
  const normalized = question.toLowerCase().replace(/[^a-z0-9]/g, '');
  const existing = db.prepare("SELECT question FROM markets WHERE status IN ('active', 'closed')").all() as { question: string }[];
  for (const m of existing) {
    const existingNorm = m.question.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Simple similarity: if 80%+ chars overlap
    if (existingNorm === normalized) return true;
    // Check if one contains the other
    if (normalized.includes(existingNorm) || existingNorm.includes(normalized)) return true;
  }
  return false;
}

export function recordSeenEvent(eventHash: string, title: string, source: string): boolean {
  const db = getDb();
  try {
    db.prepare('INSERT OR IGNORE INTO seen_events (event_hash, title, source) VALUES (?, ?, ?)')
      .run(eventHash, title, source);
    return true;
  } catch {
    return false;
  }
}

export function isEventSeen(eventHash: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT id FROM seen_events WHERE event_hash = ?').get(eventHash);
  return !!row;
}

export function getCategoryStats(): CategoryStats[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      category,
      COUNT(*) as markets_created,
      COALESCE(SUM(volume_sol), 0) as total_volume_sol,
      COALESCE(SUM(fees_earned_sol), 0) as total_fees_sol,
      COALESCE(AVG(volume_sol), 0) as avg_volume_sol
    FROM markets
    GROUP BY category
    ORDER BY total_volume_sol DESC
  `).all() as CategoryStats[];
}

export function getTotalStats(): { markets: number; volume: number; fees: number; resolved: number } {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COUNT(*) as markets,
      COALESCE(SUM(volume_sol), 0) as volume,
      COALESCE(SUM(fees_earned_sol), 0) as fees,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
    FROM markets
  `).get() as any;
  return row;
}

export function getMarketsNeedingResolution(): MarketRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM markets
    WHERE status = 'active'
    AND closing_time < datetime('now')
    ORDER BY closing_time ASC
  `).all() as MarketRecord[];
}
