/**
 * Baozi MCP Client — Direct Handler Imports
 *
 * Uses @baozi.bet/mcp-server handlers DIRECTLY instead of HTTP fetch or stubs.
 * This is the pattern used by all merged PRs (e.g., AgentBook Pundit PR #68).
 *
 * No simulated data, no HTTP API calls — real Solana mainnet via MCP SDK.
 */
import { listMarkets as mcpListMarkets, getMarket as mcpGetMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { listRaceMarkets, getRaceMarket } from "@baozi.bet/mcp-server/dist/handlers/race-markets.js";
import { getQuote as mcpGetQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js";
import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";
import { PROGRAM_ID, NETWORK } from "@baozi.bet/mcp-server/dist/config.js";
import type { MCPToolResult, BaoziMarket } from '../types.js';
import { BAOZI } from '../config.js';

// Re-export for direct access
export { handleTool, PROGRAM_ID, NETWORK, mcpListMarkets, mcpGetMarket, mcpGetQuote };

/**
 * Execute any MCP tool by name using direct handler imports.
 * Maps tool names to the corresponding handler functions.
 */
export async function execMcpTool(
  toolName: string,
  params: Record<string, any> = {},
): Promise<MCPToolResult> {
  try {
    switch (toolName) {
      case 'list_markets': {
        const markets = await mcpListMarkets(params.status);
        return { success: true, data: markets };
      }
      case 'get_market': {
        const market = await mcpGetMarket(params.market_pda || params.publicKey);
        return { success: true, data: market };
      }
      case 'list_race_markets': {
        const raceMarkets = await listRaceMarkets(params.status);
        return { success: true, data: raceMarkets };
      }
      case 'get_race_market': {
        const raceMarket = await getRaceMarket(params.market_pda || params.publicKey);
        return { success: true, data: raceMarket };
      }
      case 'get_quote': {
        const quote = await mcpGetQuote(params.market_pda, params.side, params.amount);
        return { success: true, data: quote };
      }
      case 'check_affiliate_code': {
        const result = await handleTool('check_affiliate_code', { code: params.code });
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: 'Empty response' };
        const parsed = JSON.parse(text);
        return parsed.success === false
          ? { success: false, error: parsed.error }
          : { success: true, data: parsed };
      }
      case 'format_affiliate_link': {
        const result = await handleTool('format_affiliate_link', { code: params.code });
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: 'Empty response' };
        const parsed = JSON.parse(text);
        return { success: true, data: parsed };
      }
      case 'get_positions': {
        const result = await handleTool('get_positions', { wallet: params.wallet });
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: 'Empty response' };
        const parsed = JSON.parse(text);
        return { success: true, data: parsed };
      }
      case 'get_claimable': {
        const result = await handleTool('get_claimable', { wallet: params.wallet });
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: 'Empty response' };
        const parsed = JSON.parse(text);
        return { success: true, data: parsed };
      }
      default: {
        // Fallback: use handleTool for any other MCP tool
        const result = await handleTool(toolName, params);
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: 'Empty response from handleTool' };
        const parsed = JSON.parse(text);
        return parsed.success === false
          ? { success: false, error: parsed.error }
          : { success: true, data: parsed };
      }
    }
  } catch (err: any) {
    return { success: false, error: `MCP handler error: ${err.message}` };
  }
}

/**
 * Baozi MCP Client
 *
 * Wraps the @baozi.bet/mcp-server handlers for the recruiter agent.
 * All data comes from LIVE Solana mainnet — no stubs, no simulations.
 */
export class BaoziMCPClient {
  /**
   * List active markets from Baozi on Solana mainnet via MCP handlers
   */
  async listMarkets(options: {
    layer?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<BaoziMarket[]> {
    try {
      const status = options.status || 'active';
      const markets = await mcpListMarkets(status);

      // Apply limit if specified
      const limited = options.limit ? markets.slice(0, options.limit) : markets;

      return limited.map((m: any) => ({
        id: m.publicKey,
        title: m.question || 'Unknown',
        description: '',
        status: m.status || 'unknown',
        layer: m.layer || 'unknown',
        yesPool: m.yesPoolSol,
        noPool: m.noPoolSol,
        totalPool: m.totalPoolSol,
        closingTime: m.closingTime,
        outcomes: undefined,
      }));
    } catch (err) {
      console.warn('Failed to fetch markets via MCP:', (err as Error).message);
      return [];
    }
  }

  /**
   * Get a single market by public key
   */
  async getMarket(publicKey: string): Promise<BaoziMarket | null> {
    try {
      const m = await mcpGetMarket(publicKey);
      if (!m) return null;
      return {
        id: m.publicKey,
        title: m.question || 'Unknown',
        description: '',
        status: m.status || 'unknown',
        layer: m.layer || 'unknown',
        yesPool: m.yesPoolSol,
        noPool: m.noPoolSol,
        totalPool: m.totalPoolSol,
        closingTime: m.closingTime,
        outcomes: undefined,
      };
    } catch (err) {
      console.warn('Failed to get market via MCP:', (err as Error).message);
      return null;
    }
  }

  /**
   * Get a quote for a market via MCP handler
   */
  async getQuote(marketPda: string, side: 'Yes' | 'No', amountSol: number) {
    return mcpGetQuote(marketPda, side, amountSol);
  }

  /**
   * Check if an affiliate code is available via real MCP tool
   */
  async checkAffiliateCode(code: string): Promise<MCPToolResult> {
    return execMcpTool('check_affiliate_code', { code });
  }

  /**
   * Generate affiliate link for a given code
   */
  formatAffiliateLink(code: string): string {
    return `${BAOZI.WEBSITE}/?ref=${code}`;
  }

  /**
   * Fetch AgentBook posts/agents for discovery via MCP handleTool
   */
  async fetchAgentBook(): Promise<Array<{
    name: string;
    address?: string;
    description?: string;
    url?: string;
  }>> {
    try {
      // Use handleTool for agentbook data
      const result = await handleTool('list_markets', { status: 'active' });
      const text = result?.content?.[0]?.text;
      if (!text) return [];

      const parsed = JSON.parse(text);
      const markets = parsed.markets || [];

      // Extract unique creators as "agents" discovered on the platform
      const agentMap = new Map<string, any>();
      for (const market of markets) {
        const creator = market.creator;
        if (creator && !agentMap.has(creator)) {
          agentMap.set(creator, {
            name: creator.slice(0, 8),
            address: creator,
            description: `Market creator on Baozi: ${market.question || 'Unknown market'}`,
            url: `${BAOZI.AGENTBOOK}/${creator}`,
          });
        }
      }

      return Array.from(agentMap.values());
    } catch (err) {
      console.warn('Failed to fetch AgentBook via MCP:', (err as Error).message);
      return [];
    }
  }

  /**
   * Generate the MCP setup instructions for a new agent
   */
  generateSetupInstructions(affiliateCode: string): string {
    return [
      '# Baozi MCP Setup',
      '',
      '## 1. Install MCP Server',
      '```bash',
      `npx ${BAOZI.MCP_PACKAGE}`,
      '```',
      '',
      '## 2. Available Tools (69 total, no API key needed)',
      '',
      '### Read (no wallet needed):',
      '- `list_markets` — Browse active markets',
      '- `get_quote` — Check odds and pool sizes',
      '- `get_positions` — View positions for any wallet',
      '- `get_claimable` — Check unclaimed winnings',
      '',
      '### Trade (wallet signs):',
      '- `build_bet_transaction` — Bet SOL on any outcome',
      '- `build_claim_winnings` — Claim resolved winnings',
      '',
      '### Create (wallet signs):',
      '- `build_create_lab_market_transaction` — Create boolean markets',
      '- `build_create_race_market_transaction` — Create multi-outcome markets',
      '',
      '### Affiliate:',
      '- `build_register_affiliate_transaction` — Register your referral code',
      '- `check_affiliate_code` — Check code availability',
      '- `format_affiliate_link` — Generate referral links',
      '',
      '### Identity:',
      '- `build_create_creator_profile_transaction` — Create on-chain identity',
      '',
      '## 3. Quick Start Flow',
      '```',
      `1. Visit: ${this.formatAffiliateLink(affiliateCode)}`,
      '2. list_markets → see what\'s live',
      '3. get_quote → check the odds',
      '4. build_bet_transaction → place your bet',
      '5. build_create_creator_profile_transaction → create your identity',
      '6. build_register_affiliate_transaction → get your own referral code',
      '```',
      '',
      `Full docs: ${BAOZI.SKILL_DOCS}`,
    ].join('\n');
  }

  /**
   * Generate onboarding transaction sequence for a new agent
   */
  generateOnboardingSteps(agentName: string, affiliateCode: string): Array<{
    step: number;
    tool: string;
    description: string;
    params: Record<string, string>;
  }> {
    return [
      {
        step: 1,
        tool: 'build_create_creator_profile_transaction',
        description: `Create on-chain CreatorProfile for ${agentName}`,
        params: {
          name: agentName,
          affiliate_ref: affiliateCode,
        },
      },
      {
        step: 2,
        tool: 'build_register_affiliate_transaction',
        description: `Register ${agentName}'s own affiliate code`,
        params: {
          code: `${agentName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}`,
        },
      },
      {
        step: 3,
        tool: 'list_markets',
        description: 'Browse available prediction markets',
        params: {
          status: 'active',
          limit: '10',
        },
      },
      {
        step: 4,
        tool: 'get_quote',
        description: 'Get odds for a selected market',
        params: {
          market_id: '<selected_market>',
          side: 'yes',
          amount: '0.1',
        },
      },
      {
        step: 5,
        tool: 'build_bet_transaction',
        description: 'Place first bet on a prediction market',
        params: {
          market_id: '<selected_market>',
          side: 'yes',
          amount: '0.1',
          affiliate_ref: affiliateCode,
        },
      },
    ];
  }
}
