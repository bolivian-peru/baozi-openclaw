/**
 * Reputation Tracking Service
 *
 * Tracks analyst prediction accuracy against real market outcomes.
 * Reputation score (0-100) is a composite of:
 *   - Win rate (60% weight)
 *   - Volume of resolved predictions (25% weight)
 *   - Average confidence calibration (15% weight)
 *
 * Market outcomes are fetched from Baozi MCP's get_market tool.
 */
import { nanoid } from "nanoid";
import type Database from "better-sqlite3";
import type { ReputationRecord, AnalystStats } from "../types/index.js";
import { fetchMarketOutcome } from "../utils/mcp.js";

function rowToRecord(row: any): ReputationRecord {
  return {
    id: row.id,
    analystId: row.analyst_id,
    analysisId: row.analysis_id,
    marketPda: row.market_pda,
    predictedSide: row.predicted_side,
    confidence: row.confidence,
    actualOutcome: row.actual_outcome ?? undefined,
    wasCorrect: row.was_correct === null ? undefined : row.was_correct === 1,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

/**
 * Create a reputation tracking record when an analysis is published.
 * Outcome is filled in later when the market resolves.
 */
export function createReputationRecord(
  db: Database.Database,
  params: {
    analystId: string;
    analysisId: string;
    marketPda: string;
    predictedSide: string;
    confidence: number;
  }
): ReputationRecord {
  const record: ReputationRecord = {
    id: nanoid(),
    analystId: params.analystId,
    analysisId: params.analysisId,
    marketPda: params.marketPda,
    predictedSide: params.predictedSide as any,
    confidence: params.confidence,
  };

  db.prepare(`
    INSERT INTO reputation_records (id, analyst_id, analysis_id, market_pda, predicted_side, confidence)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(record.id, record.analystId, record.analysisId, record.marketPda, record.predictedSide, record.confidence);

  return record;
}

/**
 * Resolve a reputation record with the actual market outcome.
 * Called when a Baozi market resolves.
 */
export function resolveReputationRecord(
  db: Database.Database,
  analysisId: string,
  actualOutcome: string
): ReputationRecord | null {
  const row = db
    .prepare("SELECT * FROM reputation_records WHERE analysis_id = ?")
    .get(analysisId) as any;

  if (!row) return null;

  const wasCorrect = row.predicted_side === actualOutcome ? 1 : 0;
  const resolvedAt = new Date().toISOString();

  db.prepare(`
    UPDATE reputation_records
    SET actual_outcome = ?, was_correct = ?, resolved_at = ?
    WHERE analysis_id = ?
  `).run(actualOutcome, wasCorrect, resolvedAt, analysisId);

  return rowToRecord({
    ...row,
    actual_outcome: actualOutcome,
    was_correct: wasCorrect,
    resolved_at: resolvedAt,
  });
}

/**
 * Compute analyst reputation stats from their prediction history.
 */
export function getAnalystStats(db: Database.Database, analystId: string): AnalystStats {
  const analyst = db
    .prepare("SELECT * FROM analysts WHERE id = ?")
    .get(analystId) as any;

  if (!analyst) {
    return {
      analystId,
      analystName: "Unknown",
      walletAddress: "",
      totalAnalyses: 0,
      resolvedAnalyses: 0,
      correctPredictions: 0,
      winRate: 0,
      totalEarnings: 0,
      totalPurchases: 0,
      avgConfidence: 0,
      reputationScore: 0,
      affiliateCode: "",
    };
  }

  const totalAnalyses = (db
    .prepare("SELECT COUNT(*) as c FROM analyses WHERE analyst_id = ?")
    .get(analystId) as any).c;

  const resolved = db
    .prepare("SELECT COUNT(*) as c, SUM(was_correct) as wins, AVG(confidence) as avg_conf FROM reputation_records WHERE analyst_id = ? AND was_correct IS NOT NULL")
    .get(analystId) as any;

  const resolvedAnalyses = resolved.c ?? 0;
  const correctPredictions = resolved.wins ?? 0;
  const avgConfidence = resolved.avg_conf ?? 0;
  const winRate = resolvedAnalyses > 0 ? correctPredictions / resolvedAnalyses : 0;

  const earnings = (db
    .prepare("SELECT SUM(amount_sol - platform_fee - affiliate_commission) as total FROM purchases WHERE analyst_wallet = ?")
    .get(analyst.wallet_address) as any)?.total ?? 0;

  const totalPurchases = (db
    .prepare("SELECT COUNT(*) as c FROM purchases WHERE analyst_wallet = ?")
    .get(analyst.wallet_address) as any).c ?? 0;

  // Composite reputation score (0-100); zero for analysts with no resolved predictions
  if (resolvedAnalyses === 0) {
    return {
      analystId,
      analystName: analyst.name,
      walletAddress: analyst.wallet_address,
      totalAnalyses,
      resolvedAnalyses: 0,
      correctPredictions: 0,
      winRate: 0,
      totalEarnings: earnings,
      totalPurchases,
      avgConfidence: 0,
      reputationScore: 0,
      affiliateCode: analyst.affiliate_code,
    };
  }

  const winRateScore = winRate * 100 * 0.60;
  const volumeScore = Math.min(resolvedAnalyses / 20, 1) * 100 * 0.25; // max at 20 resolved
  const calibrationScore = confidenceCalibrationScore(winRate, avgConfidence) * 0.15;
  const reputationScore = Math.round(winRateScore + volumeScore + calibrationScore);

  return {
    analystId,
    analystName: analyst.name,
    walletAddress: analyst.wallet_address,
    totalAnalyses,
    resolvedAnalyses,
    correctPredictions,
    winRate,
    totalEarnings: earnings,
    totalPurchases,
    avgConfidence,
    reputationScore: Math.min(100, Math.max(0, reputationScore)),
    affiliateCode: analyst.affiliate_code,
  };
}

/**
 * Returns 0-100: how well calibrated the analyst's confidence is.
 * Perfect calibration = 70% confidence → 70% win rate.
 */
function confidenceCalibrationScore(winRate: number, avgConfidence: number): number {
  if (avgConfidence === 0) return 50; // neutral for new analysts
  const confidencePct = avgConfidence; // already 0-100
  const winRatePct = winRate * 100;
  const diff = Math.abs(confidencePct - winRatePct);
  return Math.max(0, 100 - diff * 2);
}

/**
 * Scan pending reputation records and attempt to resolve them via Baozi MCP.
 * Call this periodically to auto-resolve outcomes.
 */
export async function resolvePendingOutcomes(db: Database.Database): Promise<{
  checked: number;
  resolved: number;
}> {
  const pending = db
    .prepare("SELECT * FROM reputation_records WHERE was_correct IS NULL")
    .all() as any[];

  let resolved = 0;
  for (const record of pending) {
    try {
      const outcome = await fetchMarketOutcome(record.market_pda);
      if (outcome) {
        resolveReputationRecord(db, record.analysis_id, outcome);
        resolved++;
      }
    } catch {
      // Non-fatal: skip this record for now
    }
  }

  return { checked: pending.length, resolved };
}

export function getReputationRecords(
  db: Database.Database,
  analystId: string
): ReputationRecord[] {
  const rows = db
    .prepare("SELECT * FROM reputation_records WHERE analyst_id = ? ORDER BY rowid DESC")
    .all(analystId) as any[];
  return rows.map(rowToRecord);
}

export function getLeaderboard(db: Database.Database, limit = 10): AnalystStats[] {
  const analysts = db
    .prepare("SELECT id FROM analysts WHERE is_active = 1")
    .all() as any[];

  return analysts
    .map((a) => getAnalystStats(db, a.id))
    .sort((a, b) => b.reputationScore - a.reputationScore)
    .slice(0, limit);
}
