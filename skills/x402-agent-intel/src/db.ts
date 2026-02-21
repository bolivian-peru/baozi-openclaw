import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Analyst, AnalystStats, Analysis, AnalysisListing } from './types.js';
import { getTier } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'marketplace.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      affiliate_code TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analyst_id INTEGER NOT NULL REFERENCES analysts(id),
      market_pda TEXT NOT NULL,
      thesis TEXT NOT NULL,
      recommended_side TEXT NOT NULL,
      confidence INTEGER NOT NULL CHECK(confidence BETWEEN 1 AND 100),
      price_lamports TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      resolved INTEGER DEFAULT 0,
      outcome TEXT
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL REFERENCES analyses(id),
      buyer_wallet TEXT NOT NULL,
      payment_tx TEXT,
      purchased_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_market ON analyses(market_pda);
    CREATE INDEX IF NOT EXISTS idx_analyses_analyst ON analyses(analyst_id);
  `);
}

// --- Analyst CRUD ---

export function registerAnalyst(wallet: string, name: string, affiliateCode: string): Analyst {
  const stmt = getDb().prepare(
    'INSERT INTO analysts (wallet, name, affiliate_code) VALUES (?, ?, ?)'
  );
  const result = stmt.run(wallet, name, affiliateCode);
  return { id: result.lastInsertRowid as number, wallet, name, affiliateCode, createdAt: new Date().toISOString() };
}

export function getAnalyst(wallet: string): Analyst | undefined {
  const row = getDb().prepare('SELECT * FROM analysts WHERE wallet = ?').get(wallet) as any;
  if (!row) return undefined;
  return { id: row.id, wallet: row.wallet, name: row.name, affiliateCode: row.affiliate_code, createdAt: row.created_at };
}

export function getAnalystById(id: number): Analyst | undefined {
  const row = getDb().prepare('SELECT * FROM analysts WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return { id: row.id, wallet: row.wallet, name: row.name, affiliateCode: row.affiliate_code, createdAt: row.created_at };
}

export function getAnalystStats(analystId: number): AnalystStats {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) as c FROM analyses WHERE analyst_id = ?').get(analystId) as any).c;
  const resolved = (db.prepare('SELECT COUNT(*) as c FROM analyses WHERE analyst_id = ? AND resolved = 1').get(analystId) as any).c;
  const correct = (db.prepare('SELECT COUNT(*) as c FROM analyses WHERE analyst_id = ? AND resolved = 1 AND outcome = recommended_side').get(analystId) as any).c;
  const accuracy = resolved > 0 ? Math.round((correct / resolved) * 100) : 0;
  return { totalPredictions: total, resolvedPredictions: resolved, correctPredictions: correct, accuracy, tier: getTier(total, accuracy) };
}

// --- Analysis CRUD ---

export function publishAnalysis(
  analystId: number, marketPda: string, thesis: string,
  recommendedSide: string, confidence: number, priceLamports: string
): Analysis {
  const stmt = getDb().prepare(
    `INSERT INTO analyses (analyst_id, market_pda, thesis, recommended_side, confidence, price_lamports)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(analystId, marketPda, thesis, recommendedSide, confidence, priceLamports);
  return {
    id: result.lastInsertRowid as number, analystId, marketPda, thesis,
    recommendedSide, confidence, priceLamports,
    createdAt: new Date().toISOString(), resolved: false, outcome: null,
  };
}

export function getAnalysis(id: number): Analysis | undefined {
  const row = getDb().prepare('SELECT * FROM analyses WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return {
    id: row.id, analystId: row.analyst_id, marketPda: row.market_pda,
    thesis: row.thesis, recommendedSide: row.recommended_side,
    confidence: row.confidence, priceLamports: row.price_lamports,
    createdAt: row.created_at, resolved: !!row.resolved, outcome: row.outcome,
  };
}

export function listAnalyses(marketPda?: string): AnalysisListing[] {
  const db = getDb();
  let query = `
    SELECT a.id, an.name as analyst, an.wallet as analyst_wallet,
           an.affiliate_code, a.market_pda, a.confidence,
           a.recommended_side, a.price_lamports, a.created_at
    FROM analyses a JOIN analysts an ON a.analyst_id = an.id
    WHERE a.resolved = 0
  `;
  const params: any[] = [];
  if (marketPda) {
    query += ' AND a.market_pda = ?';
    params.push(marketPda);
  }
  query += ' ORDER BY a.created_at DESC';

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(row => {
    const analystRow = db.prepare('SELECT id FROM analysts WHERE wallet = ?').get(row.analyst_wallet) as any;
    const stats = getAnalystStats(analystRow.id);
    return {
      id: row.id, analyst: row.analyst, analystWallet: row.analyst_wallet,
      affiliateCode: row.affiliate_code, marketPda: row.market_pda,
      confidence: row.confidence, recommendedSide: row.recommended_side,
      priceLamports: row.price_lamports, tier: stats.tier, accuracy: stats.accuracy,
    };
  });
}

export function recordPurchase(analysisId: number, buyerWallet: string, paymentTx: string | null) {
  getDb().prepare(
    'INSERT INTO purchases (analysis_id, buyer_wallet, payment_tx) VALUES (?, ?, ?)'
  ).run(analysisId, buyerWallet, paymentTx);
}

export function resolveAnalysis(id: number, outcome: string) {
  getDb().prepare('UPDATE analyses SET resolved = 1, outcome = ? WHERE id = ?').run(outcome, id);
}

export function resetDb() {
  if (db) {
    db.close();
    db = undefined!;
  }
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  for (const ext of ['-wal', '-shm']) {
    const p = DB_PATH + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  // Re-initialize
  getDb();
}
