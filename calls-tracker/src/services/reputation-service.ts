/**
 * Reputation Service
 * 
 * Manages caller reputation scores:
 * - Calculates hit rates and confidence scores
 * - Tracks streaks
 * - Generates leaderboard
 * - Formats reputation for display
 */
import type { ReputationScore, Call } from "../types/index.js";
import { CallsDatabase } from "../db/database.js";

export class ReputationService {
  private db: CallsDatabase;

  constructor(db: CallsDatabase) {
    this.db = db;
  }

  /**
   * Get reputation score for a caller
   */
  getReputation(callerId: string): ReputationScore | undefined {
    return this.db.getReputation(callerId);
  }

  /**
   * Get leaderboard of top callers
   */
  getLeaderboard(limit: number = 20): ReputationScore[] {
    return this.db.getLeaderboard(limit);
  }

  /**
   * Format reputation as a display string
   */
  formatReputation(rep: ReputationScore): string {
    const hitEmoji = rep.hitRate >= 70 ? "🔥" : rep.hitRate >= 50 ? "✅" : "⚠️";
    const streakEmoji = rep.currentStreak >= 5 ? "🔥" : rep.currentStreak >= 3 ? "⚡" : "";
    const pnlEmoji = rep.netPnl >= 0 ? "📈" : "📉";

    return [
      `┌─────────────────────────────────────────┐`,
      `│  ${rep.callerName.padEnd(38)}│`,
      `│  ${rep.walletAddress.slice(0, 8)}...${rep.walletAddress.slice(-4)}${"".padEnd(24)}│`,
      `├─────────────────────────────────────────┤`,
      `│  ${hitEmoji} Hit Rate: ${rep.hitRate.toFixed(1)}% (${rep.correctCalls}/${rep.correctCalls + rep.incorrectCalls})${"".padEnd(Math.max(0, 18 - `${rep.hitRate.toFixed(1)}% (${rep.correctCalls}/${rep.correctCalls + rep.incorrectCalls})`.length))}│`,
      `│  📊 Total Calls: ${rep.totalCalls}${"".padEnd(Math.max(0, 22 - String(rep.totalCalls).length))}│`,
      `│  ⏳ Pending: ${rep.pendingCalls}${"".padEnd(Math.max(0, 27 - String(rep.pendingCalls).length))}│`,
      `│  ${streakEmoji || "📏"} Streak: ${rep.currentStreak} (best: ${rep.bestStreak})${"".padEnd(Math.max(0, 20 - `${rep.currentStreak} (best: ${rep.bestStreak})`.length))}│`,
      `│  💰 Wagered: ${rep.totalWagered.toFixed(2)} SOL${"".padEnd(Math.max(0, 21 - `${rep.totalWagered.toFixed(2)} SOL`.length))}│`,
      `│  ${pnlEmoji} P&L: ${rep.netPnl >= 0 ? "+" : ""}${rep.netPnl.toFixed(2)} SOL${"".padEnd(Math.max(0, 23 - `${rep.netPnl >= 0 ? "+" : ""}${rep.netPnl.toFixed(2)} SOL`.length))}│`,
      `│  🏆 Score: ${rep.confidenceScore}/100${"".padEnd(Math.max(0, 25 - `${rep.confidenceScore}/100`.length))}│`,
      `└─────────────────────────────────────────┘`,
    ].join("\n");
  }

  /**
   * Format a compact reputation line for share cards
   */
  formatCompact(rep: ReputationScore): string {
    const hitEmoji = rep.hitRate >= 70 ? "🔥" : rep.hitRate >= 50 ? "✅" : "⚠️";
    return `${hitEmoji} ${rep.hitRate.toFixed(0)}% hit rate | ${rep.totalCalls} calls | Score: ${rep.confidenceScore}/100`;
  }

  /**
   * Format leaderboard table
   */
  formatLeaderboard(scores: ReputationScore[]): string {
    const header = [
      "┌──────┬────────────────────┬──────────┬─────────┬────────┬───────┐",
      "│ Rank │ Caller             │ Hit Rate │ Calls   │ P&L    │ Score │",
      "├──────┼────────────────────┼──────────┼─────────┼────────┼───────┤",
    ];

    const rows = scores.map((s) => {
      const rank = String(s.rank || "-").padStart(4);
      const name = s.callerName.slice(0, 18).padEnd(18);
      const hitRate = `${s.hitRate.toFixed(1)}%`.padStart(7);
      const calls = String(s.totalCalls).padStart(7);
      const pnl = `${s.netPnl >= 0 ? "+" : ""}${s.netPnl.toFixed(1)}`.padStart(6);
      const score = String(s.confidenceScore).padStart(5);
      return `│ ${rank} │ ${name} │ ${hitRate} │ ${calls} │ ${pnl} │ ${score} │`;
    });

    const footer = "└──────┴────────────────────┴──────────┴─────────┴────────┴───────┘";

    return [...header, ...rows, footer].join("\n");
  }

  /**
   * Generate call summary for display
   */
  formatCallSummary(call: Call, callerName: string): string {
    const statusEmoji: Record<string, string> = {
      pending: "⏳",
      market_created: "🏗️",
      bet_placed: "💰",
      active: "🟢",
      closed: "🔒",
      resolved: call.outcome === "correct" ? "✅" : call.outcome === "incorrect" ? "❌" : "🚫",
      cancelled: "🚫",
    };

    const emoji = statusEmoji[call.status] || "❓";
    const lines = [
      `${emoji} Call by ${callerName}`,
      `   "${call.prediction.question}"`,
      `   Side: ${call.betSide.toUpperCase()} | Bet: ${call.betAmount} SOL`,
      `   Status: ${call.status}${call.outcome ? ` (${call.outcome})` : ""}`,
    ];

    if (call.marketPda) {
      lines.push(`   Market: ${call.marketPda.slice(0, 12)}...`);
      lines.push(`   View: https://baozi.bet/labs/${call.marketPda}`);
    }
    if (call.shareCardUrl) {
      lines.push(`   Share: ${call.shareCardUrl}`);
    }
    if (call.pnl !== undefined && call.pnl !== null) {
      lines.push(`   P&L: ${call.pnl >= 0 ? "+" : ""}${call.pnl.toFixed(2)} SOL`);
    }

    return lines.join("\n");
  }
}
