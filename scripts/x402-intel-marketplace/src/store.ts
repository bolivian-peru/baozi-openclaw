/**
 * JSON file store for analysts, analyses, and reputation tracking.
 * Production would use a database; here we use local JSON for simplicity.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const ANALYSTS_FILE = join(DATA_DIR, "analysts.json");
const ANALYSES_FILE = join(DATA_DIR, "analyses.json");
const PURCHASES_FILE = join(DATA_DIR, "purchases.json");

export interface Analyst {
  wallet: string;
  displayName: string;
  affiliateCode: string;
  createdAt: number;
}

export interface Analysis {
  id: string;
  analystWallet: string;
  marketPda: string;
  marketQuestion: string;
  thesis: string;
  recommendedSide: "YES" | "NO";
  confidenceScore: number; // 1-100
  priceSol: number;
  createdAt: number;
  preview: string; // First 100 chars — visible without payment
}

export interface Purchase {
  analysisId: string;
  buyerWallet: string;
  paymentHash: string;
  paidAt: number;
}

export interface ReputationEntry {
  analystWallet: string;
  analysisId: string;
  marketPda: string;
  recommendedSide: "YES" | "NO";
  confidenceScore: number;
  outcome?: "correct" | "incorrect" | "pending";
  settledAt?: number;
}

function ensureDataDir(): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

function loadJson<T>(path: string, fallback: T): T {
  ensureDataDir();
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function saveJson(path: string, data: unknown): void {
  ensureDataDir();
  writeFileSync(path, JSON.stringify(data, null, 2));
}

// ─── Analysts ────────────────────────────────────────────────────────────────

export function getAnalysts(): Analyst[] {
  return loadJson<Analyst[]>(ANALYSTS_FILE, []);
}

export function getAnalyst(wallet: string): Analyst | undefined {
  return getAnalysts().find((a) => a.wallet === wallet);
}

export function registerAnalyst(wallet: string, displayName: string): Analyst {
  const analysts = getAnalysts();
  const existing = analysts.find((a) => a.wallet === wallet);
  if (existing) return existing;

  const affiliateCode = displayName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const analyst: Analyst = { wallet, displayName, affiliateCode, createdAt: Date.now() };
  analysts.push(analyst);
  saveJson(ANALYSTS_FILE, analysts);
  return analyst;
}

// ─── Analyses ────────────────────────────────────────────────────────────────

export function getAnalyses(): Analysis[] {
  return loadJson<Analysis[]>(ANALYSES_FILE, []);
}

export function getAnalysis(id: string): Analysis | undefined {
  return getAnalyses().find((a) => a.id === id);
}

export function publishAnalysis(
  analystWallet: string,
  marketPda: string,
  marketQuestion: string,
  thesis: string,
  recommendedSide: "YES" | "NO",
  confidenceScore: number,
  priceSol: number
): Analysis {
  const analyses = getAnalyses();
  const id = createHash("sha256")
    .update(`${analystWallet}:${marketPda}:${Date.now()}`)
    .digest("hex")
    .slice(0, 16);

  const analysis: Analysis = {
    id,
    analystWallet,
    marketPda,
    marketQuestion,
    thesis,
    recommendedSide,
    confidenceScore,
    priceSol,
    createdAt: Date.now(),
    preview: thesis.slice(0, 100) + (thesis.length > 100 ? "..." : ""),
  };

  analyses.push(analysis);
  saveJson(ANALYSES_FILE, analyses);
  return analysis;
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export function getPurchases(): Purchase[] {
  return loadJson<Purchase[]>(PURCHASES_FILE, []);
}

export function hasPurchased(analysisId: string, buyerWallet: string): boolean {
  return getPurchases().some(
    (p) => p.analysisId === analysisId && p.buyerWallet === buyerWallet
  );
}

export function recordPurchase(
  analysisId: string,
  buyerWallet: string,
  paymentHash: string
): Purchase {
  const purchases = getPurchases();
  const purchase: Purchase = {
    analysisId,
    buyerWallet,
    paymentHash,
    paidAt: Date.now(),
  };
  purchases.push(purchase);
  saveJson(PURCHASES_FILE, purchases);
  return purchase;
}

// ─── Reputation ──────────────────────────────────────────────────────────────

const REPUTATION_FILE = join(DATA_DIR, "reputation.json");

export function getReputationEntries(): ReputationEntry[] {
  return loadJson<ReputationEntry[]>(REPUTATION_FILE, []);
}

export function recordPrediction(
  analystWallet: string,
  analysisId: string,
  marketPda: string,
  recommendedSide: "YES" | "NO",
  confidenceScore: number
): void {
  const entries = getReputationEntries();
  entries.push({ analystWallet, analysisId, marketPda, recommendedSide, confidenceScore, outcome: "pending" });
  saveJson(REPUTATION_FILE, entries);
}

export interface AnalystStats {
  displayName: string;
  wallet: string;
  affiliateCode: string;
  totalAnalyses: number;
  correct: number;
  incorrect: number;
  pending: number;
  accuracy: number;
  avgConfidence: number;
  totalSold: number;
  revenueSol: number;
}

export function computeReputation(wallet: string): AnalystStats | null {
  const analyst = getAnalyst(wallet);
  if (!analyst) return null;

  const entries = getReputationEntries().filter((e) => e.analystWallet === wallet);
  const analyses = getAnalyses().filter((a) => a.analystWallet === wallet);
  const purchases = getPurchases().filter((p) =>
    analyses.some((a) => a.id === p.analysisId)
  );

  const correct = entries.filter((e) => e.outcome === "correct").length;
  const incorrect = entries.filter((e) => e.outcome === "incorrect").length;
  const pending = entries.filter((e) => e.outcome === "pending").length;
  const settled = correct + incorrect;
  const accuracy = settled > 0 ? correct / settled : 0;
  const avgConfidence = entries.length > 0
    ? entries.reduce((s, e) => s + e.confidenceScore, 0) / entries.length
    : 0;

  const revenueSol = analyses.reduce((sum, a) => {
    const sold = purchases.filter((p) => p.analysisId === a.id).length;
    return sum + sold * a.priceSol;
  }, 0);

  return {
    displayName: analyst.displayName,
    wallet,
    affiliateCode: analyst.affiliateCode,
    totalAnalyses: analyses.length,
    correct,
    incorrect,
    pending,
    accuracy,
    avgConfidence,
    totalSold: purchases.length,
    revenueSol,
  };
}
