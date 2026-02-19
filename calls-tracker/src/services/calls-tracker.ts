/**
 * Calls Tracker — Main orchestrator
 * 
 * Coordinates the full lifecycle:
 * 1. Parse prediction text
 * 2. Validate against pari-mutuel rules
 * 3. Register caller if new
 * 4. Create Lab market via MCP
 * 5. Place caller's bet
 * 6. Generate share card
 * 7. Track and update reputation
 */
import { CallsDatabase } from "../db/database.js";
import { MarketService, type MarketServiceConfig } from "./market-service.js";
import { ReputationService } from "./reputation-service.js";
import { parsePrediction, validatePrediction } from "../parsers/prediction-parser.js";
import type { Call, Caller, ReputationScore, ParsedPrediction } from "../types/index.js";

export interface CallsTrackerConfig extends MarketServiceConfig {
  /** Database file path */
  dbPath?: string;
}

export class CallsTracker {
  private db: CallsDatabase;
  private market: MarketService;
  private reputation: ReputationService;

  constructor(config: CallsTrackerConfig = {}) {
    this.db = new CallsDatabase(config.dbPath);
    this.market = new MarketService(config);
    this.reputation = new ReputationService(this.db);
  }

  // ─── Caller Management ──────────────────────────────────────

  /**
   * Register a new caller
   */
  registerCaller(name: string, walletAddress: string, socialHandle?: string, platform?: string): Caller {
    // Check if caller already exists
    const existing = this.db.getCallerByWallet(walletAddress);
    if (existing) {
      console.log(`  ℹ Caller already registered: ${existing.name} (${existing.id})`);
      return existing;
    }

    const caller = this.db.registerCaller(name, walletAddress, socialHandle, platform);
    console.log(`  ✓ Registered caller: ${caller.name} (${caller.id})`);
    return caller;
  }

  /**
   * Get or create caller by wallet address
   */
  getOrCreateCaller(name: string, walletAddress: string): Caller {
    return this.db.getCallerByWallet(walletAddress) || this.registerCaller(name, walletAddress);
  }

  /**
   * List all registered callers
   */
  listCallers(): Caller[] {
    return this.db.listCallers();
  }

  // ─── Call Lifecycle ─────────────────────────────────────────

  /**
   * Parse and validate a prediction text
   */
  parsePrediction(text: string): { prediction: ParsedPrediction; valid: boolean; errors: string[] } {
    const prediction = parsePrediction(text);
    const { valid, errors } = validatePrediction(prediction);
    return { prediction, valid, errors };
  }

  /**
   * Submit a new call — the full flow
   * 
   * 1. Parse prediction
   * 2. Validate
   * 3. Create market
   * 4. Place bet
   * 5. Generate share card
   * 6. Track in DB
   */
  async submitCall(
    callerIdOrWallet: string,
    predictionText: string,
    betAmount?: number,
    betSide?: string,
    confidence?: number
  ): Promise<{ call: Call; shareCardUrl?: string; errors: string[] }> {
    const errors: string[] = [];

    // Resolve caller
    let caller = this.db.getCaller(callerIdOrWallet) || this.db.getCallerByWallet(callerIdOrWallet);
    if (!caller) {
      errors.push(`Caller not found: ${callerIdOrWallet}. Register first with 'register' command.`);
      return { call: {} as Call, errors };
    }

    console.log(`\n🎯 New call from ${caller.name}`);
    console.log(`   "${predictionText}"\n`);

    // Step 1: Parse
    const { prediction, valid, errors: parseErrors } = this.parsePrediction(predictionText);
    if (!valid) {
      errors.push(...parseErrors.map((e) => `Parse error: ${e}`));
      return { call: {} as Call, errors };
    }
    prediction.confidence = confidence;

    console.log(`  ✓ Parsed: "${prediction.question}"`);
    console.log(`    Subject: ${prediction.subject}`);
    console.log(`    Data source: ${prediction.dataSource}`);
    console.log(`    Deadline: ${new Date(prediction.deadline).toLocaleString()}`);

    // Determine bet side
    const side = betSide || (prediction.direction === "below" || prediction.direction === "no" ? "no" : "yes");
    const amount = betAmount || 0.1;

    // Step 2: Create call record
    const call = this.db.createCall(caller.id, prediction, amount, side);

    // Step 3: Create market + bet + share card via MCP
    const result = await this.market.executeCall(prediction, caller.walletAddress, amount, side);
    errors.push(...result.errors);

    // Step 4: Update call record
    if (result.marketPda) {
      this.db.updateCallStatus(call.id, "market_created", { marketPda: result.marketPda });

      if (result.betTx) {
        this.db.updateCallStatus(call.id, "bet_placed", { betTxSignature: result.betTx });
        this.db.updateCallStatus(call.id, "active");
      }

      if (result.shareCardUrl) {
        this.db.updateCallStatus(call.id, "active", { shareCardUrl: result.shareCardUrl });
      }
    }

    // Refresh call from DB
    const updatedCall = this.db.getCall(call.id) || call;

    console.log(`\n  ✓ Call tracked: ${updatedCall.id}`);
    if (result.shareCardUrl) {
      console.log(`  🖼️  Share card: ${result.shareCardUrl}`);
    }

    return { call: updatedCall, shareCardUrl: result.shareCardUrl, errors };
  }

  /**
   * Resolve a call (mark as correct/incorrect)
   */
  resolveCall(callId: string, outcome: "correct" | "incorrect" | "cancelled", pnl?: number): Call | undefined {
    const call = this.db.getCall(callId);
    if (!call) return undefined;

    const effectivePnl = pnl ?? (outcome === "correct" ? call.betAmount : outcome === "incorrect" ? -call.betAmount : 0);

    this.db.updateCallStatus(callId, outcome === "cancelled" ? "cancelled" : "resolved", {
      outcome,
      pnl: effectivePnl,
    });

    return this.db.getCall(callId);
  }

  // ─── Queries ────────────────────────────────────────────────

  /**
   * Get a specific call
   */
  getCall(callId: string): Call | undefined {
    return this.db.getCall(callId);
  }

  /**
   * List calls for a caller
   */
  listCalls(callerId?: string): Call[] {
    return this.db.listCalls(callerId);
  }

  /**
   * Get reputation for a caller
   */
  getReputation(callerId: string): ReputationScore | undefined {
    return this.reputation.getReputation(callerId);
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit?: number): ReputationScore[] {
    return this.reputation.getLeaderboard(limit);
  }

  // ─── Display ────────────────────────────────────────────────

  /**
   * Format reputation display
   */
  formatReputation(callerId: string): string {
    const rep = this.getReputation(callerId);
    if (!rep) return "No reputation data found.";
    return this.reputation.formatReputation(rep);
  }

  /**
   * Format leaderboard display
   */
  formatLeaderboard(limit?: number): string {
    const scores = this.getLeaderboard(limit);
    if (scores.length === 0) return "No callers with calls yet.";
    return this.reputation.formatLeaderboard(scores);
  }

  /**
   * Format a call summary
   */
  formatCall(callId: string): string {
    const call = this.db.getCall(callId);
    if (!call) return "Call not found.";
    const caller = this.db.getCaller(call.callerId);
    return this.reputation.formatCallSummary(call, caller?.name || "Unknown");
  }

  /**
   * Clean up
   */
  close(): void {
    this.db.close();
  }
}
