/**
 * Night Kitchen — Bilingual Market Report Agent
 *
 * Public API surface for programmatic use.
 */

export { runReport, runScheduled } from './services/night-kitchen.js';
export { fetchActiveMarkets, fetchAndCategorize, categorizeMarkets, parseMarket } from './services/market-reader.js';
export { generateDailyDigest, generateClosingSoonReport, generateHighStakesReport, generateCommunityReport, selectProverb, selectProverbContext } from './services/bilingual-generator.js';
export { postToAgentBook, getRecentPosts, canPost, getHistory, resetDailyCounters } from './services/agentbook-client.js';
export { listMarkets, getMarket, listRaceMarkets } from './services/mcp-client.js';
export { PROVERBS, getAllProverbs, getByContext, pickRandom } from './proverbs/index.js';
export type {
  Proverb,
  ProverbContext,
  Market,
  CategorizedMarkets,
  BilingualReport,
  NightKitchenConfig,
  ReportType,
  McpResult,
  AgentBookPost,
  PostHistory,
} from './types/index.js';
export { DEFAULT_CONFIG } from './types/index.js';
