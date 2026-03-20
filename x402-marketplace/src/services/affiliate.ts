/**
 * Affiliate Service
 *
 * Tracks referrals and commissions for the affiliate program.
 * Analysts earn commissions when buyers they referred purchase analyses.
 *
 * Commission Flow:
 *   Buyer uses affiliate link → purchases analysis →
 *   Affiliate earns AFFILIATE_COMMISSION_RATE * priceInSol
 */
import { nanoid } from "nanoid";
import type Database from "better-sqlite3";
import type { AffiliateRecord, AffiliateStats } from "../types/index.js";

function rowToRecord(row: any): AffiliateRecord {
  return {
    id: row.id,
    affiliateCode: row.affiliate_code,
    affiliateWallet: row.affiliate_wallet,
    referredAnalystId: row.referred_analyst_id ?? undefined,
    purchaseId: row.purchase_id ?? undefined,
    commission: row.commission,
    earnedAt: row.earned_at,
  };
}

/**
 * Record a commission earned by an affiliate when a purchase completes.
 */
export function recordAffiliateCommission(
  db: Database.Database,
  params: {
    affiliateCode: string;
    affiliateWallet: string;
    purchaseId: string;
    commission: number;
  }
): AffiliateRecord {
  const record: AffiliateRecord = {
    id: nanoid(),
    affiliateCode: params.affiliateCode,
    affiliateWallet: params.affiliateWallet,
    purchaseId: params.purchaseId,
    commission: params.commission,
    earnedAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO affiliate_records (id, affiliate_code, affiliate_wallet, purchase_id, commission, earned_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.affiliateCode,
    record.affiliateWallet,
    record.purchaseId ?? null,
    record.commission,
    record.earnedAt
  );

  return record;
}

/**
 * Record that an analyst was referred via an affiliate code (on registration).
 */
export function recordAnalystReferral(
  db: Database.Database,
  params: {
    affiliateCode: string;
    affiliateWallet: string;
    referredAnalystId: string;
  }
): AffiliateRecord {
  const record: AffiliateRecord = {
    id: nanoid(),
    affiliateCode: params.affiliateCode,
    affiliateWallet: params.affiliateWallet,
    referredAnalystId: params.referredAnalystId,
    commission: 0, // no direct commission for referrals, just tracking
    earnedAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO affiliate_records (id, affiliate_code, affiliate_wallet, referred_analyst_id, commission, earned_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(
    record.id,
    record.affiliateCode,
    record.affiliateWallet,
    record.referredAnalystId,
    record.earnedAt
  );

  return record;
}

/**
 * Get aggregate stats for an affiliate.
 */
export function getAffiliateStats(
  db: Database.Database,
  affiliateCode: string
): AffiliateStats | null {
  const analyst = db
    .prepare("SELECT wallet_address FROM analysts WHERE affiliate_code = ?")
    .get(affiliateCode) as any;

  if (!analyst) return null;

  const records = db
    .prepare("SELECT * FROM affiliate_records WHERE affiliate_code = ?")
    .all(affiliateCode) as any[];

  const totalReferrals = records.filter((r) => r.referred_analyst_id).length;
  const commissions = records.filter((r) => r.purchase_id);
  const totalCommissions = commissions.reduce((s, r) => s + r.commission, 0);

  return {
    affiliateCode,
    walletAddress: analyst.wallet_address,
    totalReferrals,
    totalCommissions,
    pendingCommissions: 0, // future: track payout status
  };
}

export function getAffiliateRecords(
  db: Database.Database,
  affiliateCode: string
): AffiliateRecord[] {
  const rows = db
    .prepare("SELECT * FROM affiliate_records WHERE affiliate_code = ? ORDER BY earned_at DESC")
    .all(affiliateCode) as any[];
  return rows.map(rowToRecord);
}
