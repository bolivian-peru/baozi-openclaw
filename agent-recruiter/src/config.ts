import { RecruiterConfig } from './types.js';
import * as path from 'path';

/**
 * Load recruiter configuration from environment and defaults
 */
export function loadConfig(overrides: Partial<RecruiterConfig> = {}): RecruiterConfig {
  return {
    affiliateCode: overrides.affiliateCode
      || process.env.RECRUITER_AFFILIATE_CODE
      || 'RECRUITER',
    walletAddress: overrides.walletAddress
      || process.env.SOLANA_WALLET_ADDRESS
      || 'FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx',
    rpcUrl: overrides.rpcUrl
      || process.env.SOLANA_RPC_URL
      || 'https://api.mainnet-beta.solana.com',
    dataDir: overrides.dataDir
      || process.env.RECRUITER_DATA_DIR
      || path.join(process.cwd(), 'data'),
    discoveryInterval: overrides.discoveryInterval
      ?? parseInt(process.env.DISCOVERY_INTERVAL_MIN || '60', 10),
    maxConcurrentOnboards: overrides.maxConcurrentOnboards
      ?? parseInt(process.env.MAX_CONCURRENT_ONBOARDS || '5', 10),
    dryRun: overrides.dryRun
      ?? (process.env.DRY_RUN === 'true'),
  };
}

/** Baozi platform constants */
export const BAOZI = {
  WEBSITE: 'https://baozi.bet',
  SKILL_DOCS: 'https://baozi.bet/skill',
  API_SKILL: 'https://baozi.bet/api/skill',
  AGENTBOOK: 'https://baozi.bet/agentbook',
  AGENTBOOK_API: 'https://baozi.bet/api/agentbook',
  LABS: 'https://baozi.bet/labs',
  LEADERBOARD: 'https://baozi.bet/leaderboard',
  AFFILIATE: 'https://baozi.bet/affiliate',
  CREATOR: 'https://baozi.bet/creator',
  MARKETS_API: 'https://baozi.bet/api/markets',
  MCP_PACKAGE: '@baozi.bet/mcp-server',
  MCP_INSTALL: 'npx @baozi.bet/mcp-server',
  PROGRAM_ID: 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ',
  AFFILIATE_COMMISSION: 0.01, // 1% lifetime
  CREATOR_FEE_MAX: 0.02, // up to 2%
  PLATFORM_FEE_LAB: 0.03, // 3%
} as const;
