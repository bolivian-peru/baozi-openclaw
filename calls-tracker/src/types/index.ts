/**
 * Core types for the Calls Tracker system
 */

/** A parsed prediction extracted from text input */
export interface ParsedPrediction {
  /** The original raw text of the prediction */
  rawText: string;
  /** Structured market question */
  question: string;
  /** Data source for resolution (e.g., CoinGecko, ESPN) */
  dataSource: string;
  /** Resolution criteria description */
  resolutionCriteria: string;
  /** Target asset or subject (e.g., "BTC", "Lakers") */
  subject: string;
  /** Target value if applicable (e.g., 110000 for "$110k") */
  targetValue?: number;
  /** Direction: "above" | "below" | "yes" | "no" */
  direction?: string;
  /** Deadline as ISO string */
  deadline: string;
  /** Market type: "boolean" or "race" */
  marketType: "boolean" | "race";
  /** Race outcomes if marketType is "race" */
  raceOutcomes?: string[];
  /** Confidence level expressed by caller (1-10) */
  confidence?: number;
}

/** A caller (influencer/agent) who makes predictions */
export interface Caller {
  id: string;
  /** Display name */
  name: string;
  /** Solana wallet address */
  walletAddress: string;
  /** Social handle (e.g., Twitter username) */
  socialHandle?: string;
  /** Platform (e.g., "twitter", "telegram") */
  platform?: string;
  /** When this caller was first registered */
  createdAt: string;
}

/** A tracked call (prediction + market) */
export interface Call {
  id: string;
  /** Caller who made this prediction */
  callerId: string;
  /** The parsed prediction */
  prediction: ParsedPrediction;
  /** Baozi Lab market PDA (once created) */
  marketPda?: string;
  /** Bet transaction signature */
  betTxSignature?: string;
  /** Amount wagered in SOL */
  betAmount: number;
  /** Side the caller bet on */
  betSide: string;
  /** Share card URL */
  shareCardUrl?: string;
  /** Market status */
  status: CallStatus;
  /** Resolution outcome */
  outcome?: "correct" | "incorrect" | "cancelled";
  /** SOL won (positive) or lost (negative) */
  pnl?: number;
  /** Created timestamp */
  createdAt: string;
  /** Resolved timestamp */
  resolvedAt?: string;
}

export type CallStatus =
  | "pending"       // prediction parsed, market not yet created
  | "market_created" // Lab market created on-chain
  | "bet_placed"    // caller's bet placed
  | "active"        // market is live
  | "closed"        // market closed, awaiting resolution
  | "resolved"      // market resolved, outcome known
  | "cancelled";    // market cancelled

/** Reputation score for a caller */
export interface ReputationScore {
  callerId: string;
  callerName: string;
  walletAddress: string;
  totalCalls: number;
  correctCalls: number;
  incorrectCalls: number;
  pendingCalls: number;
  hitRate: number;
  currentStreak: number;
  bestStreak: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netPnl: number;
  /** Confidence-weighted score (0-100) */
  confidenceScore: number;
  /** Rank among all callers */
  rank?: number;
}

/** Market creation parameters for the MCP tool */
export interface MarketCreateParams {
  question: string;
  closingTime: number;    // Unix timestamp
  resolutionBuffer: number; // seconds
  creatorFee: number;     // basis points (e.g., 200 = 2%)
  dataSource: string;
  resolutionCriteria: string;
  /** For race markets */
  outcomes?: string[];
}

/** MCP tool execution result */
export interface McpResult {
  success: boolean;
  data?: any;
  error?: string;
}

/** Share card data */
export interface ShareCardData {
  marketPda: string;
  walletAddress: string;
  callerName: string;
  question: string;
  betSide: string;
  betAmount: number;
  hitRate: number;
  totalCalls: number;
  imageUrl?: string;
}
