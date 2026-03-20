/**
 * SQLite schema and database initialization for x402 marketplace
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let _db: Database.Database | null = null;

export function getDb(dbPath?: string): Database.Database {
  if (_db) return _db;

  const resolvedPath = dbPath || process.env.DB_PATH || "./marketplace.db";
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(resolvedPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  initSchema(_db);
  return _db;
}

/** For testing: create an in-memory database */
export function getTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysts (
      id             TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL UNIQUE,
      name           TEXT NOT NULL,
      description    TEXT NOT NULL DEFAULT '',
      registered_at  TEXT NOT NULL,
      affiliate_code TEXT NOT NULL UNIQUE,
      referred_by    TEXT,
      is_active      INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id              TEXT PRIMARY KEY,
      analyst_id      TEXT NOT NULL REFERENCES analysts(id),
      analyst_wallet  TEXT NOT NULL,
      market_pda      TEXT NOT NULL,
      market_title    TEXT,
      title           TEXT NOT NULL,
      preview         TEXT NOT NULL,
      thesis          TEXT NOT NULL,
      predicted_side  TEXT NOT NULL CHECK(predicted_side IN ('YES','NO')),
      confidence      INTEGER NOT NULL CHECK(confidence BETWEEN 0 AND 100),
      price_in_sol    REAL NOT NULL CHECK(price_in_sol > 0),
      published_at    TEXT NOT NULL,
      expires_at      TEXT,
      tags            TEXT NOT NULL DEFAULT '[]',
      purchase_count  INTEGER NOT NULL DEFAULT 0,
      is_active       INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_market ON analyses(market_pda);
    CREATE INDEX IF NOT EXISTS idx_analyses_analyst ON analyses(analyst_id);

    CREATE TABLE IF NOT EXISTS purchases (
      id                  TEXT PRIMARY KEY,
      analysis_id         TEXT NOT NULL REFERENCES analyses(id),
      buyer_wallet        TEXT NOT NULL,
      analyst_wallet      TEXT NOT NULL,
      amount_sol          REAL NOT NULL,
      platform_fee        REAL NOT NULL DEFAULT 0,
      affiliate_code      TEXT,
      affiliate_commission REAL NOT NULL DEFAULT 0,
      tx_signature        TEXT NOT NULL UNIQUE,
      simulated           INTEGER NOT NULL DEFAULT 0,
      purchased_at        TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_wallet);
    CREATE INDEX IF NOT EXISTS idx_purchases_analysis ON purchases(analysis_id);

    CREATE TABLE IF NOT EXISTS reputation_records (
      id              TEXT PRIMARY KEY,
      analyst_id      TEXT NOT NULL REFERENCES analysts(id),
      analysis_id     TEXT NOT NULL REFERENCES analyses(id),
      market_pda      TEXT NOT NULL,
      predicted_side  TEXT NOT NULL,
      confidence      INTEGER NOT NULL,
      actual_outcome  TEXT,
      was_correct     INTEGER,
      resolved_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS affiliate_records (
      id                TEXT PRIMARY KEY,
      affiliate_code    TEXT NOT NULL,
      affiliate_wallet  TEXT NOT NULL,
      referred_analyst_id TEXT,
      purchase_id       TEXT,
      commission        REAL NOT NULL DEFAULT 0,
      earned_at         TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_affiliate_code ON affiliate_records(affiliate_code);
  `);
}

/** Reset the singleton (for testing) */
export function resetDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
