import Database from "better-sqlite3";
import path from "path";
import { Analyst, MarketAnalysis, AnalysisPurchase, AnalystTier } from "./types";

const DB_PATH = path.join(__dirname, "..", "data", "marketplace.db");

let db: Database.Database;

export function initDb(): void {
  const { mkdirSync } = require("fs");
  mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS analysts (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      affiliate_code TEXT NOT NULL UNIQUE,
      registered_at INTEGER NOT NULL,
      total_analyses INTEGER DEFAULT 0,
      resolved_analyses INTEGER DEFAULT 0,
      correct_predictions INTEGER DEFAULT 0,
      accuracy REAL DEFAULT 0,
      avg_confidence REAL DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      affiliate_revenue REAL DEFAULT 0,
      tier TEXT DEFAULT 'unranked'
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      analyst_id TEXT NOT NULL REFERENCES analysts(id),
      analyst_wallet TEXT NOT NULL,
      affiliate_code TEXT NOT NULL,
      market_pda TEXT NOT NULL,
      market_question TEXT NOT NULL,
      thesis TEXT NOT NULL,
      recommended_side TEXT NOT NULL CHECK (recommended_side IN ('YES', 'NO')),
      confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 1 AND 100),
      price_sol REAL NOT NULL,
      price_lamports INTEGER NOT NULL,
      published_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      resolved INTEGER DEFAULT 0,
      outcome TEXT,
      prediction_correct INTEGER,
      purchase_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL REFERENCES analyses(id),
      buyer_wallet TEXT NOT NULL,
      paid_lamports INTEGER NOT NULL,
      tx_signature TEXT NOT NULL,
      purchased_at INTEGER NOT NULL,
      affiliate_link TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_market ON analyses(market_pda);
    CREATE INDEX IF NOT EXISTS idx_analyses_analyst ON analyses(analyst_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_analysis ON purchases(analysis_id);
  `);
}

// ── Analyst CRUD ──────────────────────────────────────────────────────────────

export function registerAnalyst(analyst: Omit<Analyst, "tier" | "totalAnalyses" | "resolvedAnalyses" | "correctPredictions" | "accuracy" | "avgConfidence" | "totalRevenue" | "affiliateRevenue">): Analyst {
  const stmt = db.prepare(`
    INSERT INTO analysts (id, wallet, name, affiliate_code, registered_at)
    VALUES (@id, @wallet, @name, @affiliateCode, @registeredAt)
  `);
  stmt.run(analyst);
  return getAnalystById(analyst.id)!;
}

export function getAnalystByWallet(wallet: string): Analyst | null {
  const row = db.prepare("SELECT * FROM analysts WHERE wallet = ?").get(wallet) as any;
  return row ? rowToAnalyst(row) : null;
}

export function getAnalystById(id: string): Analyst | null {
  const row = db.prepare("SELECT * FROM analysts WHERE id = ?").get(id) as any;
  return row ? rowToAnalyst(row) : null;
}

export function getTopAnalysts(limit = 10): Analyst[] {
  const rows = db.prepare(`
    SELECT * FROM analysts
    WHERE resolved_analyses >= 5
    ORDER BY accuracy DESC, resolved_analyses DESC
    LIMIT ?
  `).all(limit) as any[];
  return rows.map(rowToAnalyst);
}

export function updateAnalystStats(analystId: string): void {
  const analyses = db.prepare(`
    SELECT confidence_score, prediction_correct
    FROM analyses
    WHERE analyst_id = ? AND resolved = 1
  `).all(analystId) as any[];

  if (analyses.length === 0) return;

  const correct = analyses.filter((a) => a.prediction_correct === 1).length;
  const accuracy = correct / analyses.length;
  const avgConfidence = analyses.reduce((s, a) => s + a.confidence_score, 0) / analyses.length;
  const tier = computeTier(accuracy, analyses.length);

  db.prepare(`
    UPDATE analysts SET
      resolved_analyses = ?,
      correct_predictions = ?,
      accuracy = ?,
      avg_confidence = ?,
      tier = ?
    WHERE id = ?
  `).run(analyses.length, correct, accuracy, avgConfidence, tier, analystId);
}

function computeTier(accuracy: number, resolved: number): AnalystTier {
  if (resolved < 5) return "unranked";
  if (accuracy >= 0.85 && resolved >= 20) return "grandmaster";
  if (accuracy >= 0.75) return "master";
  if (accuracy >= 0.65) return "expert";
  if (accuracy >= 0.50) return "analyst";
  return "apprentice";
}

function rowToAnalyst(row: any): Analyst {
  return {
    id: row.id,
    wallet: row.wallet,
    name: row.name,
    affiliateCode: row.affiliate_code,
    registeredAt: row.registered_at,
    totalAnalyses: row.total_analyses,
    resolvedAnalyses: row.resolved_analyses,
    correctPredictions: row.correct_predictions,
    accuracy: row.accuracy,
    avgConfidence: row.avg_confidence,
    totalRevenue: row.total_revenue,
    affiliateRevenue: row.affiliate_revenue,
    tier: row.tier as AnalystTier,
  };
}

// ── Analysis CRUD ─────────────────────────────────────────────────────────────

export function publishAnalysis(analysis: Omit<MarketAnalysis, "purchaseCount" | "resolved" | "outcome" | "predictionCorrect">): MarketAnalysis {
  db.prepare(`
    INSERT INTO analyses (
      id, analyst_id, analyst_wallet, affiliate_code,
      market_pda, market_question, thesis,
      recommended_side, confidence_score,
      price_sol, price_lamports, published_at, expires_at
    ) VALUES (
      @id, @analystId, @analystWallet, @affiliateCode,
      @marketPda, @marketQuestion, @thesis,
      @recommendedSide, @confidenceScore,
      @priceSOL, @priceLamports, @publishedAt, @expiresAt
    )
  `).run({
    id: analysis.id,
    analystId: analysis.analystId,
    analystWallet: analysis.analystWallet,
    affiliateCode: analysis.affiliateCode,
    marketPda: analysis.marketPda,
    marketQuestion: analysis.marketQuestion,
    thesis: analysis.thesis,
    recommendedSide: analysis.recommendedSide,
    confidenceScore: analysis.confidenceScore,
    priceSOL: analysis.priceSOL,
    priceLamports: analysis.priceLamports,
    publishedAt: analysis.publishedAt,
    expiresAt: analysis.expiresAt,
  });

  db.prepare("UPDATE analysts SET total_analyses = total_analyses + 1 WHERE id = ?").run(analysis.analystId);
  return getAnalysisById(analysis.id)!;
}

export function getAnalysisById(id: string): MarketAnalysis | null {
  const row = db.prepare("SELECT * FROM analyses WHERE id = ?").get(id) as any;
  return row ? rowToAnalysis(row) : null;
}

export function listAnalysesForMarket(marketPda: string): MarketAnalysis[] {
  const rows = db.prepare(`
    SELECT a.*, an.name as analyst_name, an.tier as analyst_tier
    FROM analyses a
    JOIN analysts an ON a.analyst_id = an.id
    WHERE a.market_pda = ? AND a.expires_at > ?
    ORDER BY an.accuracy DESC, a.confidence_score DESC
  `).all(marketPda, Date.now()) as any[];
  return rows.map(rowToAnalysis);
}

export function listRecentAnalyses(limit = 20): MarketAnalysis[] {
  const rows = db.prepare(`
    SELECT * FROM analyses
    WHERE expires_at > ?
    ORDER BY published_at DESC
    LIMIT ?
  `).all(Date.now(), limit) as any[];
  return rows.map(rowToAnalysis);
}

export function resolveAnalysis(analysisId: string, outcome: "YES" | "NO"): void {
  const analysis = getAnalysisById(analysisId);
  if (!analysis) return;

  const correct = analysis.recommendedSide === outcome ? 1 : 0;
  db.prepare(`
    UPDATE analyses SET resolved = 1, outcome = ?, prediction_correct = ?
    WHERE id = ?
  `).run(outcome, correct, analysisId);

  updateAnalystStats(analysis.analystId);
}

function rowToAnalysis(row: any): MarketAnalysis {
  return {
    id: row.id,
    analystId: row.analyst_id,
    analystWallet: row.analyst_wallet,
    affiliateCode: row.affiliate_code,
    marketPda: row.market_pda,
    marketQuestion: row.market_question,
    thesis: row.thesis,
    recommendedSide: row.recommended_side as "YES" | "NO",
    confidenceScore: row.confidence_score,
    priceSOL: row.price_sol,
    priceLamports: row.price_lamports,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    resolved: row.resolved === 1,
    outcome: row.outcome as "YES" | "NO" | null,
    predictionCorrect: row.prediction_correct === null ? null : row.prediction_correct === 1,
    purchaseCount: row.purchase_count,
  };
}

// ── Purchase CRUD ─────────────────────────────────────────────────────────────

export function recordPurchase(purchase: AnalysisPurchase): void {
  db.prepare(`
    INSERT INTO purchases (id, analysis_id, buyer_wallet, paid_lamports, tx_signature, purchased_at, affiliate_link)
    VALUES (@id, @analysisId, @buyerWallet, @paidLamports, @txSignature, @purchasedAt, @affiliateLink)
  `).run(purchase);

  db.prepare("UPDATE analyses SET purchase_count = purchase_count + 1 WHERE id = ?").run(purchase.analysisId);

  const analysis = getAnalysisById(purchase.analysisId)!;
  const revenueSOL = purchase.paidLamports / 1e9;
  db.prepare("UPDATE analysts SET total_revenue = total_revenue + ? WHERE id = ?").run(revenueSOL, analysis.analystId);
}

export function hasBuyerPurchased(analysisId: string, buyerWallet: string): boolean {
  const row = db.prepare("SELECT 1 FROM purchases WHERE analysis_id = ? AND buyer_wallet = ?").get(analysisId, buyerWallet);
  return !!row;
}

export function getMarketplaceStats(): { totalAnalysts: number; totalAnalyses: number; totalPurchases: number; totalVolumeSOL: number } {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM analysts) as total_analysts,
      (SELECT COUNT(*) FROM analyses) as total_analyses,
      (SELECT COUNT(*) FROM purchases) as total_purchases,
      (SELECT COALESCE(SUM(paid_lamports), 0) / 1e9 FROM purchases) as total_volume_sol
  `).get() as any;

  return {
    totalAnalysts: stats.total_analysts,
    totalAnalyses: stats.total_analyses,
    totalPurchases: stats.total_purchases,
    totalVolumeSOL: stats.total_volume_sol,
  };
}
