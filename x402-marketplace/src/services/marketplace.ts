/**
 * Marketplace Service
 *
 * Core marketplace logic: publish analyses, buyer discovery,
 * x402 gated access, and purchase recording.
 */
import { nanoid } from "nanoid";
import type Database from "better-sqlite3";
import type {
  Analysis,
  AnalysisListing,
  PublishAnalysisParams,
  Purchase,
  DiscoveryFilters,
  PaymentRequest,
} from "../types/index.js";
import { getAnalystById } from "./registry.js";
import { processPayment, verifyPayment, buildPaymentRequired } from "./payment.js";
import { getAnalystStats } from "./reputation.js";
import { recordAffiliateCommission } from "./affiliate.js";
import { fetchMarketTitle } from "../utils/mcp.js";

const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE ?? "0.05");
const AFFILIATE_COMMISSION_RATE = parseFloat(process.env.AFFILIATE_COMMISSION_RATE ?? "0.10");
const OPERATOR_WALLET = process.env.OPERATOR_WALLET ?? "OPERATOR";

function rowToAnalysis(row: any): Analysis {
  return {
    id: row.id,
    analystId: row.analyst_id,
    analystWallet: row.analyst_wallet,
    marketPda: row.market_pda,
    marketTitle: row.market_title ?? undefined,
    title: row.title,
    preview: row.preview,
    thesis: row.thesis,
    predictedSide: row.predicted_side,
    confidence: row.confidence,
    priceInSol: row.price_in_sol,
    publishedAt: row.published_at,
    expiresAt: row.expires_at ?? undefined,
    tags: JSON.parse(row.tags ?? "[]"),
    purchaseCount: row.purchase_count,
    isActive: row.is_active === 1,
  };
}

function rowToPurchase(row: any): Purchase {
  return {
    id: row.id,
    analysisId: row.analysis_id,
    buyerWallet: row.buyer_wallet,
    analystWallet: row.analyst_wallet,
    amountSol: row.amount_sol,
    platformFee: row.platform_fee,
    affiliateCode: row.affiliate_code ?? undefined,
    affiliateCommission: row.affiliate_commission,
    txSignature: row.tx_signature,
    simulated: row.simulated === 1,
    purchasedAt: row.purchased_at,
  };
}

/**
 * Publish a new analysis with an x402 paywall.
 * Fetches market title from Baozi MCP to enrich the listing.
 */
export async function publishAnalysis(
  db: Database.Database,
  params: PublishAnalysisParams
): Promise<Analysis> {
  const analyst = getAnalystById(db, params.analystId);
  if (!analyst) throw new Error(`Analyst ${params.analystId} not found`);
  if (!analyst.isActive) throw new Error("Analyst account is deactivated");

  if (params.preview.length > 280) {
    throw new Error("Preview must be 280 characters or fewer (tweet-sized teaser)");
  }
  if (params.confidence < 0 || params.confidence > 100) {
    throw new Error("Confidence must be between 0 and 100");
  }
  if (params.priceInSol <= 0) {
    throw new Error("Price must be greater than 0 SOL");
  }

  // Try to enrich with market title from Baozi MCP
  let marketTitle: string | undefined;
  try {
    marketTitle = await fetchMarketTitle(params.marketPda);
  } catch {
    // Non-fatal: market title enrichment is best-effort
  }

  const analysis: Analysis = {
    id: nanoid(),
    analystId: params.analystId,
    analystWallet: analyst.walletAddress,
    marketPda: params.marketPda,
    marketTitle,
    title: params.title,
    preview: params.preview,
    thesis: params.thesis,
    predictedSide: params.predictedSide,
    confidence: params.confidence,
    priceInSol: params.priceInSol,
    publishedAt: new Date().toISOString(),
    expiresAt: params.expiresAt,
    tags: params.tags ?? [],
    purchaseCount: 0,
    isActive: true,
  };

  db.prepare(`
    INSERT INTO analyses (
      id, analyst_id, analyst_wallet, market_pda, market_title,
      title, preview, thesis, predicted_side, confidence,
      price_in_sol, published_at, expires_at, tags, purchase_count, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
  `).run(
    analysis.id,
    analysis.analystId,
    analysis.analystWallet,
    analysis.marketPda,
    analysis.marketTitle ?? null,
    analysis.title,
    analysis.preview,
    analysis.thesis,
    analysis.predictedSide,
    analysis.confidence,
    analysis.priceInSol,
    analysis.publishedAt,
    analysis.expiresAt ?? null,
    JSON.stringify(analysis.tags)
  );

  return analysis;
}

/**
 * Discover available analyses with optional filters.
 * Returns public listing info only (no thesis — that's behind the paywall).
 */
export function discoverAnalyses(
  db: Database.Database,
  filters: DiscoveryFilters = {}
): AnalysisListing[] {
  const now = new Date().toISOString();
  let query = `
    SELECT a.*, an.name as analyst_name, an.affiliate_code
    FROM analyses a
    JOIN analysts an ON a.analyst_id = an.id
    WHERE a.is_active = 1
      AND (a.expires_at IS NULL OR a.expires_at > ?)
  `;
  const params: any[] = [now];

  if (filters.marketPda) {
    query += " AND a.market_pda = ?";
    params.push(filters.marketPda);
  }
  if (filters.analystId) {
    query += " AND a.analyst_id = ?";
    params.push(filters.analystId);
  }
  if (filters.predictedSide) {
    query += " AND a.predicted_side = ?";
    params.push(filters.predictedSide);
  }
  if (filters.minConfidence !== undefined) {
    query += " AND a.confidence >= ?";
    params.push(filters.minConfidence);
  }
  if (filters.maxPrice !== undefined) {
    query += " AND a.price_in_sol <= ?";
    params.push(filters.maxPrice);
  }

  query += " ORDER BY a.published_at DESC";

  const rows = db.prepare(query).all(...params) as any[];

  return rows
    .map((row) => {
      const stats = getAnalystStats(db, row.analyst_id);
      if (filters.minReputation !== undefined && stats.reputationScore < filters.minReputation) {
        return null;
      }
      const tags: string[] = JSON.parse(row.tags ?? "[]");
      if (filters.tags && filters.tags.length > 0) {
        if (!filters.tags.some((t) => tags.includes(t))) return null;
      }
      return {
        id: row.id,
        analystId: row.analyst_id,
        analystName: row.analyst_name,
        analystReputation: stats.reputationScore,
        marketPda: row.market_pda,
        marketTitle: row.market_title ?? undefined,
        title: row.title,
        preview: row.preview,
        predictedSide: row.predicted_side,
        confidence: row.confidence,
        priceInSol: row.price_in_sol,
        publishedAt: row.published_at,
        expiresAt: row.expires_at ?? undefined,
        tags,
        purchaseCount: row.purchase_count,
      } as AnalysisListing;
    })
    .filter((x): x is AnalysisListing => x !== null);
}

/**
 * Request access to an analysis.
 * If buyer already purchased it, returns the full thesis.
 * Otherwise returns a 402 Payment Required response.
 */
export function requestAccess(
  db: Database.Database,
  analysisId: string,
  buyerWallet: string,
  affiliateCode?: string
): { status: 200 | 402; analysis?: Analysis; payment?: ReturnType<typeof buildPaymentRequired> } {
  const row = db
    .prepare("SELECT * FROM analyses WHERE id = ? AND is_active = 1")
    .get(analysisId) as any;

  if (!row) throw new Error(`Analysis ${analysisId} not found or inactive`);

  const now = new Date().toISOString();
  if (row.expires_at && row.expires_at < now) {
    throw new Error("This analysis has expired");
  }

  // Check if buyer already paid
  const existing = db
    .prepare("SELECT id FROM purchases WHERE analysis_id = ? AND buyer_wallet = ?")
    .get(analysisId, buyerWallet) as any;

  if (existing) {
    return { status: 200, analysis: rowToAnalysis(row) };
  }

  // Resolve affiliate wallet if code provided
  let affiliateWallet: string | undefined;
  if (affiliateCode) {
    const affiliateAnalyst = db
      .prepare("SELECT wallet_address FROM analysts WHERE affiliate_code = ?")
      .get(affiliateCode) as any;
    if (affiliateAnalyst) {
      affiliateWallet = affiliateAnalyst.wallet_address;
    }
  }

  return {
    status: 402,
    payment: buildPaymentRequired({
      analysisId,
      analystWallet: row.analyst_wallet,
      priceInSol: row.price_in_sol,
      platformFeeRate: PLATFORM_FEE_RATE,
      affiliateCommissionRate: AFFILIATE_COMMISSION_RATE,
      affiliateWallet,
    }),
  };
}

/**
 * Complete a purchase after x402 payment is submitted.
 * Verifies the payment tx, records the purchase, and returns full thesis.
 */
export async function completePurchase(
  db: Database.Database,
  params: {
    analysisId: string;
    buyerWallet: string;
    paymentTx?: string;    // if provided, skip new payment
    affiliateCode?: string;
  }
): Promise<{ purchase: Purchase; analysis: Analysis }> {
  const row = db
    .prepare("SELECT * FROM analyses WHERE id = ? AND is_active = 1")
    .get(params.analysisId) as any;

  if (!row) throw new Error(`Analysis ${params.analysisId} not found`);

  // Check for duplicate purchase
  const existing = db
    .prepare("SELECT * FROM purchases WHERE analysis_id = ? AND buyer_wallet = ?")
    .get(params.analysisId, params.buyerWallet) as any;

  if (existing) {
    return {
      purchase: rowToPurchase(existing),
      analysis: rowToAnalysis(row),
    };
  }

  // Resolve affiliate
  let affiliateWallet: string | undefined;
  if (params.affiliateCode) {
    const aff = db
      .prepare("SELECT wallet_address FROM analysts WHERE affiliate_code = ?")
      .get(params.affiliateCode) as any;
    if (aff) affiliateWallet = aff.wallet_address;
  }

  const platformFee = row.price_in_sol * PLATFORM_FEE_RATE;
  const affiliateCommission = affiliateWallet ? row.price_in_sol * AFFILIATE_COMMISSION_RATE : 0;

  let txSignature: string;
  let simulated: boolean;

  if (params.paymentTx) {
    // Verify pre-existing payment tx
    if (!verifyPayment(params.paymentTx, params.analysisId)) {
      throw new Error("Invalid or mismatched payment transaction");
    }
    txSignature = params.paymentTx;
    simulated = params.paymentTx.startsWith("SIM:");
  } else {
    // Process new x402 payment
    const req: PaymentRequest = {
      analysisId: params.analysisId,
      analystWallet: row.analyst_wallet,
      buyerWallet: params.buyerWallet,
      amountSol: row.price_in_sol,
      platformFee,
      affiliateCommission,
      affiliateWallet,
      memo: `x402 analysis purchase: ${params.analysisId}`,
    };

    const result = await processPayment(req);
    if (!result.success || !result.txSignature) {
      throw new Error(result.error ?? "Payment failed");
    }
    txSignature = result.txSignature;
    simulated = result.simulated;
  }

  const purchase: Purchase = {
    id: nanoid(),
    analysisId: params.analysisId,
    buyerWallet: params.buyerWallet,
    analystWallet: row.analyst_wallet,
    amountSol: row.price_in_sol,
    platformFee,
    affiliateCode: params.affiliateCode,
    affiliateCommission,
    txSignature,
    simulated,
    purchasedAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO purchases (
      id, analysis_id, buyer_wallet, analyst_wallet, amount_sol,
      platform_fee, affiliate_code, affiliate_commission,
      tx_signature, simulated, purchased_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    purchase.id,
    purchase.analysisId,
    purchase.buyerWallet,
    purchase.analystWallet,
    purchase.amountSol,
    purchase.platformFee,
    purchase.affiliateCode ?? null,
    purchase.affiliateCommission,
    purchase.txSignature,
    purchase.simulated ? 1 : 0,
    purchase.purchasedAt
  );

  // Increment purchase count on analysis
  db.prepare("UPDATE analyses SET purchase_count = purchase_count + 1 WHERE id = ?").run(
    params.analysisId
  );

  // Record affiliate commission if applicable
  if (params.affiliateCode && affiliateWallet && affiliateCommission > 0) {
    recordAffiliateCommission(db, {
      affiliateCode: params.affiliateCode,
      affiliateWallet,
      purchaseId: purchase.id,
      commission: affiliateCommission,
    });
  }

  return { purchase, analysis: rowToAnalysis(row) };
}

export function getAnalysisById(db: Database.Database, id: string): Analysis | null {
  const row = db.prepare("SELECT * FROM analyses WHERE id = ?").get(id) as any;
  return row ? rowToAnalysis(row) : null;
}

export function getPurchasesByBuyer(db: Database.Database, buyerWallet: string): Purchase[] {
  const rows = db
    .prepare("SELECT * FROM purchases WHERE buyer_wallet = ? ORDER BY purchased_at DESC")
    .all(buyerWallet) as any[];
  return rows.map(rowToPurchase);
}

export function getPurchasesByAnalysis(db: Database.Database, analysisId: string): Purchase[] {
  const rows = db
    .prepare("SELECT * FROM purchases WHERE analysis_id = ? ORDER BY purchased_at DESC")
    .all(analysisId) as any[];
  return rows.map(rowToPurchase);
}
