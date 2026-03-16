"use strict";
/**
 * SQLite Database for Intel Marketplace
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getDb = getDb;
exports.registerAnalyst = registerAnalyst;
exports.getAnalyst = getAnalyst;
exports.getAnalystByCode = getAnalystByCode;
exports.getAllAnalysts = getAllAnalysts;
exports.createAnalysis = createAnalysis;
exports.getAnalysis = getAnalysis;
exports.getAnalysesByMarket = getAnalysesByMarket;
exports.getAnalystAnalyses = getAnalystAnalyses;
exports.updateAnalysisResolution = updateAnalysisResolution;
exports.recordPurchase = recordPurchase;
exports.getPurchasesByBuyer = getPurchasesByBuyer;
exports.getAnalystStats = getAnalystStats;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const DB_PATH = './data/intel-marketplace.db';
let db = null;
function initDatabase() {
    if (db)
        return db;
    db = new better_sqlite3_1.default(DB_PATH);
    // Create tables
    db.exec(`
    CREATE TABLE IF NOT EXISTS analysts (
      wallet TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      affiliate_code TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      analyst_wallet TEXT NOT NULL,
      market_address TEXT NOT NULL,
      market_question TEXT NOT NULL,
      thesis TEXT NOT NULL,
      recommended_side TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      price_sol REAL NOT NULL,
      created_at INTEGER NOT NULL,
      resolved INTEGER DEFAULT 0,
      correct INTEGER DEFAULT NULL,
      FOREIGN KEY (analyst_wallet) REFERENCES analysts(wallet)
    );
    
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      buyer_wallet TEXT NOT NULL,
      amount_sol REAL NOT NULL,
      affiliate_wallet TEXT,
      purchased_at INTEGER NOT NULL,
      tx_id TEXT,
      FOREIGN KEY (analysis_id) REFERENCES analyses(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_analyses_market ON analyses(market_address);
    CREATE INDEX IF NOT EXISTS idx_analyses_analyst ON analyses(analyst_wallet);
    CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_wallet);
  `);
    return db;
}
function getDb() {
    if (!db) {
        return initDatabase();
    }
    return db;
}
// Analyst operations
function registerAnalyst(wallet, displayName, affiliateCode) {
    const db = getDb();
    const now = Date.now();
    const stmt = db.prepare(`
    INSERT INTO analysts (wallet, display_name, affiliate_code, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(wallet) DO UPDATE SET
      display_name = excluded.display_name,
      affiliate_code = excluded.affiliate_code
  `);
    stmt.run(wallet, displayName, affiliateCode, now);
    return { wallet, displayName, affiliateCode, createdAt: now };
}
function getAnalyst(wallet) {
    const db = getDb();
    const stmt = db.prepare(`
    SELECT wallet, display_name as displayName, affiliate_code as affiliateCode, created_at as createdAt
    FROM analysts WHERE wallet = ?
  `);
    return stmt.get(wallet);
}
function getAnalystByCode(affiliateCode) {
    const db = getDb();
    const stmt = db.prepare(`
    SELECT wallet, display_name as displayName, affiliate_code as affiliateCode, created_at as createdAt
    FROM analysts WHERE affiliate_code = ?
  `);
    return stmt.get(affiliateCode);
}
function getAllAnalysts() {
    const db = getDb();
    const stmt = db.prepare(`
    SELECT wallet, display_name as displayName, affiliate_code as affiliateCode, created_at as createdAt
    FROM analysts
  `);
    return stmt.all();
}
// Analysis operations
function createAnalysis(analysis) {
    const db = getDb();
    const stmt = db.prepare(`
    INSERT INTO analyses (id, analyst_wallet, market_address, market_question, thesis, recommended_side, confidence, price_sol, created_at, resolved, correct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run(analysis.id, analysis.analystWallet, analysis.marketAddress, analysis.marketQuestion, analysis.thesis, analysis.recommendedSide, analysis.confidence, analysis.priceSol, analysis.createdAt, analysis.resolved ? 1 : 0, analysis.correct === null ? null : (analysis.correct ? 1 : 0));
    return analysis;
}
function getAnalysis(id) {
    const db = getDb();
    const stmt = db.prepare(`
    SELECT id, analyst_wallet as analystWallet, market_address as marketAddress, market_question as marketQuestion,
           thesis, recommended_side as recommendedSide, confidence, price_sol as priceSol, created_at as createdAt,
           resolved, correct
    FROM analyses WHERE id = ?
  `);
    const row = stmt.get(id);
    if (!row)
        return null;
    return {
        ...row,
        resolved: row.resolved === 1,
        correct: row.correct === null ? null : row.correct === 1
    };
}
function getAnalysesByMarket(marketAddress) {
    const db = getDb();
    const stmt = db.prepare(`
    SELECT id, analyst_wallet as analystWallet, market_address as marketAddress, market_question as marketQuestion,
           thesis, recommended_side as recommendedSide, confidence, price_sol as priceSol, created_at as createdAt,
           resolved, correct
    FROM analyses WHERE market_address = ? ORDER BY created_at DESC
  `);
    return stmt.all(marketAddress).map(row => ({
        ...row,
        resolved: row.resolved === 1,
        correct: row.correct === null ? null : row.correct === 1
    }));
}
function getAnalystAnalyses(wallet) {
    const db = getDb();
    const stmt = db.prepare(`
    SELECT id, analyst_wallet as analystWallet, market_address as marketAddress, market_question as marketQuestion,
           thesis, recommended_side as recommendedSide, confidence, price_sol as priceSol, created_at as createdAt,
           resolved, correct
    FROM analyses WHERE analyst_wallet = ? ORDER BY created_at DESC
  `);
    return stmt.all(wallet).map(row => ({
        ...row,
        resolved: row.resolved === 1,
        correct: row.correct === null ? null : row.correct === 1
    }));
}
function updateAnalysisResolution(id, correct) {
    const db = getDb();
    const stmt = db.prepare(`
    UPDATE analyses SET resolved = 1, correct = ? WHERE id = ?
  `);
    stmt.run(correct ? 1 : 0, id);
}
// Purchase operations
function recordPurchase(id, analysisId, buyerWallet, amountSol, affiliateWallet, txId) {
    const db = getDb();
    const stmt = db.prepare(`
    INSERT INTO purchases (id, analysis_id, buyer_wallet, amount_sol, affiliate_wallet, purchased_at, tx_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run(id, analysisId, buyerWallet, amountSol, affiliateWallet, Date.now(), txId);
}
function getPurchasesByBuyer(wallet) {
    const db = getDb();
    const stmt = db.prepare(`
    SELECT p.*, a.thesis, a.recommended_side as recommendedSide, a.market_address as marketAddress,
           a.analyst_wallet as analystWallet, an.affiliate_code as affiliateCode
    FROM purchases p
    JOIN analyses a ON p.analysis_id = a.id
    JOIN analysts an ON a.analyst_wallet = an.wallet
    WHERE p.buyer_wallet = ?
    ORDER BY p.purchased_at DESC
  `);
    return stmt.all(wallet);
}
// Stats calculation
function getAnalystStats(wallet) {
    const db = getDb();
    // Get analysis stats
    const analysisStats = db.prepare(`
    SELECT 
      COUNT(*) as totalAnalyses,
      SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) as correct,
      AVG(confidence) as avgConfidence
    FROM analyses 
    WHERE analyst_wallet = ? AND resolved = 1
  `).get(wallet);
    // Get purchase stats
    const purchaseStats = db.prepare(`
    SELECT 
      COUNT(*) as totalSold,
      SUM(amount_sol) as revenueX402
    FROM purchases p
    JOIN analyses a ON p.analysis_id = a.id
    WHERE a.analyst_wallet = ?
  `).get(wallet);
    // Get affiliate revenue
    const affiliateStats = db.prepare(`
    SELECT COALESCE(SUM(amount_sol * 0.01), 0) as revenueAffiliate
    FROM purchases
    WHERE affiliate_wallet = ?
  `).get(wallet);
    const totalAnalyses = analysisStats?.totalAnalyses || 0;
    const correct = analysisStats?.correct || 0;
    return {
        totalAnalyses,
        correct,
        accuracy: totalAnalyses > 0 ? correct / totalAnalyses : 0,
        avgConfidence: analysisStats?.avgConfidence || 0,
        totalSold: purchaseStats?.totalSold || 0,
        revenueX402: purchaseStats?.revenueX402 || 0,
        revenueAffiliate: affiliateStats?.revenueAffiliate || 0
    };
}
//# sourceMappingURL=database.js.map