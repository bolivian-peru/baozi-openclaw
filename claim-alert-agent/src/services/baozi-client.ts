/**
 * Baozi MCP client — fetches positions, claimable winnings, and market data
 *
 * Uses @baozi.bet/mcp-server tools via child process or direct Solana RPC calls.
 * In production, this connects to the actual Baozi on-chain program.
 * The interface is abstracted so it can be mocked in tests.
 */

import { Market, Position, ClaimableWinning, ResolutionStatus } from '../types/index.js';

export interface BaoziDataProvider {
  /** Get all positions for a wallet */
  getPositions(wallet: string): Promise<Position[]>;
  /** Get claimable winnings for a wallet */
  getClaimable(wallet: string): Promise<ClaimableWinning[]>;
  /** Get resolution status for a specific market */
  getResolutionStatus(marketId: string): Promise<ResolutionStatus>;
  /** Get market details by ID */
  getMarket(marketId: string): Promise<Market>;
  /** List all active markets */
  listActiveMarkets(): Promise<Market[]>;
}

/**
 * Production Baozi client that calls MCP tools via CLI scripts
 */
export class BaoziClient implements BaoziDataProvider {
  private scriptsDir: string;
  private rpcUrl: string;

  constructor(scriptsDir: string, rpcUrl?: string) {
    this.scriptsDir = scriptsDir;
    this.rpcUrl = rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  }

  private async runScript(script: string, args: string[]): Promise<string> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileP = promisify(execFile);

    const env = {
      ...process.env,
      SOLANA_RPC_URL: this.rpcUrl,
    };

    try {
      const { stdout } = await execFileP('node', [`${this.scriptsDir}/${script}`, ...args], {
        env,
        timeout: 30000,
      });
      return stdout.trim();
    } catch (err: unknown) {
      const error = err as Error & { stderr?: string };
      throw new Error(`Script ${script} failed: ${error.stderr || error.message}`);
    }
  }

  async getPositions(wallet: string): Promise<Position[]> {
    try {
      const output = await this.runScript('get-portfolio', [wallet]);
      return this.parsePositions(output);
    } catch {
      return [];
    }
  }

  async getClaimable(wallet: string): Promise<ClaimableWinning[]> {
    try {
      const output = await this.runScript('claim-winnings', ['--check', wallet]);
      return this.parseClaimable(output);
    } catch {
      return [];
    }
  }

  async getResolutionStatus(marketId: string): Promise<ResolutionStatus> {
    const market = await this.getMarket(marketId);
    return {
      marketId,
      marketQuestion: market.question,
      resolved: market.status === 'resolved',
      winningOutcomeIndex: market.resolvedOutcome,
      winningOutcomeLabel: market.resolvedOutcome !== undefined
        ? market.outcomes[market.resolvedOutcome]?.label
        : undefined,
    };
  }

  async getMarket(marketId: string): Promise<Market> {
    const output = await this.runScript('get-odds', [marketId]);
    return this.parseMarket(marketId, output);
  }

  async listActiveMarkets(): Promise<Market[]> {
    try {
      const output = await this.runScript('list-markets', ['--status', 'active', '--limit', '100']);
      return this.parseMarketList(output);
    } catch {
      return [];
    }
  }

  private parsePositions(output: string): Position[] {
    // Parse script output into Position objects
    // Format varies — handle JSON or table output
    try {
      const data = JSON.parse(output);
      if (Array.isArray(data)) return data;
      if (data.positions) return data.positions;
      return [];
    } catch {
      return [];
    }
  }

  private parseClaimable(output: string): ClaimableWinning[] {
    try {
      const data = JSON.parse(output);
      if (Array.isArray(data)) return data;
      if (data.claimable) return data.claimable;
      return [];
    } catch {
      return [];
    }
  }

  private parseMarket(marketId: string, output: string): Market {
    try {
      const data = JSON.parse(output);
      return {
        id: marketId,
        question: data.question || 'Unknown',
        status: data.status || 'active',
        closingTime: data.closingTime || new Date().toISOString(),
        outcomes: data.outcomes || [],
        totalPool: data.totalPool || 0,
        resolvedOutcome: data.resolvedOutcome,
        layer: data.layer || 'official',
      };
    } catch {
      throw new Error(`Failed to parse market data for ${marketId}`);
    }
  }

  private parseMarketList(output: string): Market[] {
    try {
      const data = JSON.parse(output);
      if (Array.isArray(data)) return data;
      if (data.markets) return data.markets;
      return [];
    } catch {
      return [];
    }
  }
}
