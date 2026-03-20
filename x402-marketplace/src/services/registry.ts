/**
 * Analyst Registry Service
 *
 * Handles analyst registration, lookup, and profile management.
 * Each analyst gets a unique affiliate code upon registration.
 */
import { nanoid } from "nanoid";
import type Database from "better-sqlite3";
import type { Analyst, RegisterAnalystParams } from "../types/index.js";

function generateAffiliateCode(name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(4, "X");
  return `${slug}-${nanoid(6).toUpperCase()}`;
}

function rowToAnalyst(row: any): Analyst {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    name: row.name,
    description: row.description,
    registeredAt: row.registered_at,
    affiliateCode: row.affiliate_code,
    referredBy: row.referred_by ?? undefined,
    isActive: row.is_active === 1,
  };
}

export function registerAnalyst(db: Database.Database, params: RegisterAnalystParams): Analyst {
  const existing = db
    .prepare("SELECT * FROM analysts WHERE wallet_address = ?")
    .get(params.walletAddress) as any;

  if (existing) {
    throw new Error(`Analyst with wallet ${params.walletAddress} is already registered`);
  }

  if (params.referredBy) {
    const referrer = db
      .prepare("SELECT id FROM analysts WHERE affiliate_code = ?")
      .get(params.referredBy) as any;
    if (!referrer) {
      throw new Error(`Invalid referral code: ${params.referredBy}`);
    }
  }

  const analyst: Analyst = {
    id: nanoid(),
    walletAddress: params.walletAddress,
    name: params.name,
    description: params.description,
    registeredAt: new Date().toISOString(),
    affiliateCode: generateAffiliateCode(params.name),
    referredBy: params.referredBy,
    isActive: true,
  };

  db.prepare(`
    INSERT INTO analysts (id, wallet_address, name, description, registered_at, affiliate_code, referred_by, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    analyst.id,
    analyst.walletAddress,
    analyst.name,
    analyst.description,
    analyst.registeredAt,
    analyst.affiliateCode,
    analyst.referredBy ?? null
  );

  return analyst;
}

export function getAnalystById(db: Database.Database, id: string): Analyst | null {
  const row = db.prepare("SELECT * FROM analysts WHERE id = ?").get(id) as any;
  return row ? rowToAnalyst(row) : null;
}

export function getAnalystByWallet(db: Database.Database, walletAddress: string): Analyst | null {
  const row = db
    .prepare("SELECT * FROM analysts WHERE wallet_address = ?")
    .get(walletAddress) as any;
  return row ? rowToAnalyst(row) : null;
}

export function getAnalystByAffiliateCode(
  db: Database.Database,
  affiliateCode: string
): Analyst | null {
  const row = db
    .prepare("SELECT * FROM analysts WHERE affiliate_code = ?")
    .get(affiliateCode) as any;
  return row ? rowToAnalyst(row) : null;
}

export function listAnalysts(
  db: Database.Database,
  opts: { activeOnly?: boolean } = {}
): Analyst[] {
  const query = opts.activeOnly
    ? "SELECT * FROM analysts WHERE is_active = 1 ORDER BY registered_at DESC"
    : "SELECT * FROM analysts ORDER BY registered_at DESC";
  const rows = db.prepare(query).all() as any[];
  return rows.map(rowToAnalyst);
}

export function deactivateAnalyst(db: Database.Database, id: string): boolean {
  const result = db
    .prepare("UPDATE analysts SET is_active = 0 WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
