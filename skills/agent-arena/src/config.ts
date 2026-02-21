/**
 * Agent Arena configuration.
 *
 * All tuneable parameters live here. Override via environment variables
 * or CLI flags (see src/index.ts).
 */

export interface ArenaConfig {
  /** Solana RPC endpoint */
  rpcEndpoint: string;
  /** Agent wallets to track (base58 public keys) */
  agentWallets: string[];
  /** How often to poll positions for each agent (ms) */
  pollIntervalMs: number;
  /** How often to refresh the active market list (ms) */
  marketRefreshMs: number;
  /** Max number of markets to display simultaneously in the dashboard */
  maxMarketsDisplay: number;
  /** Market layers to include */
  layers: Array<'official' | 'lab' | 'private'>;
  /** Market statuses to include */
  statuses: Array<'active' | 'closed' | 'resolved'>;
}

/**
 * Known AgentBook participants from https://baozi.bet/agentbook.
 * These are publicly visible agent wallets that have bet on Baozi markets.
 * Add or replace with real wallet addresses discovered via the agentbook UI.
 */
const KNOWN_AGENT_WALLETS: string[] = [
  // baozi.bet/agentbook entries (add real mainnet wallets here)
  // The pundit agent from the same monorepo
  'FyzVsqsBnUoDVchFU4y5tS7ptvi5onfuFcm9iSC1ChMz',
  // Placeholder slots — replace with actual agent wallets from agentbook
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'So11111111111111111111111111111111111111112',
];

function parseWalletsFromEnv(): string[] {
  const raw = process.env.AGENT_WALLETS;
  if (!raw) return KNOWN_AGENT_WALLETS;
  return raw
    .split(',')
    .map((w) => w.trim())
    .filter((w) => w.length >= 32);
}

export const config: ArenaConfig = {
  rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  agentWallets: parseWalletsFromEnv(),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_SECONDS || '20') * 1000,
  marketRefreshMs: Number(process.env.MARKET_REFRESH_SECONDS || '30') * 1000,
  maxMarketsDisplay: 5,
  layers: ['official', 'lab'],
  statuses: ['active'],
};

/**
 * Override config.agentWallets from CLI args.
 * Expected format: --wallets w1,w2,w3
 */
export function applyCliArgs(argv: string[]): void {
  const walletsIdx = argv.indexOf('--wallets');
  if (walletsIdx !== -1 && argv[walletsIdx + 1]) {
    const wallets = argv[walletsIdx + 1]
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w.length >= 32);
    if (wallets.length > 0) {
      config.agentWallets = wallets;
    }
  }

  const pollIdx = argv.indexOf('--poll');
  if (pollIdx !== -1 && argv[pollIdx + 1]) {
    const secs = Number(argv[pollIdx + 1]);
    if (!isNaN(secs) && secs > 0) config.pollIntervalMs = secs * 1000;
  }

  const refreshIdx = argv.indexOf('--refresh');
  if (refreshIdx !== -1 && argv[refreshIdx + 1]) {
    const secs = Number(argv[refreshIdx + 1]);
    if (!isNaN(secs) && secs > 0) config.marketRefreshMs = secs * 1000;
  }
}
