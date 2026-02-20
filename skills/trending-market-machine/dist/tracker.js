"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordMarket = recordMarket;
exports.updateMarketStatus = updateMarketStatus;
exports.updateMarketVolume = updateMarketVolume;
exports.getActiveMarkets = getActiveMarkets;
exports.getAllMarkets = getAllMarkets;
exports.getMarketByPda = getMarketByPda;
exports.isDuplicate = isDuplicate;
exports.recordSeenEvent = recordSeenEvent;
exports.isEventSeen = isEventSeen;
exports.getCategoryStats = getCategoryStats;
exports.getTotalStats = getTotalStats;
exports.getMarketsNeedingResolution = getMarketsNeedingResolution;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
let db;
function getDb() {
    if (!db) {
        const dir = path_1.default.dirname(config_1.config.dbPath);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        db = new better_sqlite3_1.default(config_1.config.dbPath);
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
function recordMarket(record) {
    const db = getDb();
    db.prepare(`
    INSERT OR IGNORE INTO markets (market_pda, market_id, question, category, source, source_url, closing_time, tx_signature)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(record.market_pda, record.market_id, record.question, record.category, record.source, record.source_url || '', record.closing_time, record.tx_signature || null);
}
function updateMarketStatus(marketPda, status, outcome) {
    const db = getDb();
    if (outcome) {
        db.prepare('UPDATE markets SET status = ?, resolution_outcome = ? WHERE market_pda = ?')
            .run(status, outcome, marketPda);
    }
    else {
        db.prepare('UPDATE markets SET status = ? WHERE market_pda = ?')
            .run(status, marketPda);
    }
}
function updateMarketVolume(marketPda, volumeSol, feesSol) {
    const db = getDb();
    db.prepare('UPDATE markets SET volume_sol = ?, fees_earned_sol = ? WHERE market_pda = ?')
        .run(volumeSol, feesSol, marketPda);
}
function getActiveMarkets() {
    const db = getDb();
    return db.prepare("SELECT * FROM markets WHERE status = 'active' ORDER BY closing_time ASC").all();
}
function getAllMarkets() {
    const db = getDb();
    return db.prepare('SELECT * FROM markets ORDER BY created_at DESC').all();
}
function getMarketByPda(pda) {
    const db = getDb();
    return db.prepare('SELECT * FROM markets WHERE market_pda = ?').get(pda);
}
function isDuplicate(question) {
    const db = getDb();
    // Check if a similar question already exists (fuzzy match)
    const normalized = question.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = db.prepare("SELECT question FROM markets WHERE status IN ('active', 'closed')").all();
    for (const m of existing) {
        const existingNorm = m.question.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Simple similarity: if 80%+ chars overlap
        if (existingNorm === normalized)
            return true;
        // Check if one contains the other
        if (normalized.includes(existingNorm) || existingNorm.includes(normalized))
            return true;
    }
    return false;
}
function recordSeenEvent(eventHash, title, source) {
    const db = getDb();
    try {
        db.prepare('INSERT OR IGNORE INTO seen_events (event_hash, title, source) VALUES (?, ?, ?)')
            .run(eventHash, title, source);
        return true;
    }
    catch {
        return false;
    }
}
function isEventSeen(eventHash) {
    const db = getDb();
    const row = db.prepare('SELECT id FROM seen_events WHERE event_hash = ?').get(eventHash);
    return !!row;
}
function getCategoryStats() {
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
  `).all();
}
function getTotalStats() {
    const db = getDb();
    const row = db.prepare(`
    SELECT
      COUNT(*) as markets,
      COALESCE(SUM(volume_sol), 0) as volume,
      COALESCE(SUM(fees_earned_sol), 0) as fees,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
    FROM markets
  `).get();
    return row;
}
function getMarketsNeedingResolution() {
    const db = getDb();
    return db.prepare(`
    SELECT * FROM markets
    WHERE status = 'active'
    AND closing_time < datetime('now')
    ORDER BY closing_time ASC
  `).all();
}
//# sourceMappingURL=tracker.js.map