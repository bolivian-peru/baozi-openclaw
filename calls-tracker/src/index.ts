/**
 * Calls Tracker — Influencer Prediction Reputation System
 *
 * Turn tweets into trackable prediction markets on Baozi.
 * Every call builds or destroys reputation. No hiding from bad takes.
 *
 * Uses direct handler imports from @baozi.bet/mcp-server — no subprocess
 * spawning, no stubs, no simulated clients.
 *
 * @module @baozi/calls-tracker
 */

export { CallsTracker } from "./services/calls-tracker.js";
export type { CallsTrackerConfig } from "./services/calls-tracker.js";
export { MarketService } from "./services/market-service.js";
export type { MarketServiceConfig } from "./services/market-service.js";
export { ReputationService } from "./services/reputation-service.js";
export { CallsDatabase } from "./db/database.js";
export { parsePrediction, validatePrediction } from "./parsers/prediction-parser.js";
export {
  execMcpTool,
  listMarkets,
  getMarket,
  listRaceMarkets,
  getRaceMarket,
  getRaceQuote,
  getQuote,
  handleTool,
  PROGRAM_ID,
  NETWORK,
} from "./services/mcp-client.js";
export type {
  ParsedPrediction,
  Caller,
  Call,
  CallStatus,
  ReputationScore,
  MarketCreateParams,
  McpResult,
  ShareCardData,
} from "./types/index.js";
