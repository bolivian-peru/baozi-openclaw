import { MCPToolResult, BaoziMarket } from '../types';
import { BAOZI } from '../config';

// Use dynamic import for node-fetch (CJS compat)
let fetchFn: typeof import('node-fetch').default;
async function getFetch() {
  if (!fetchFn) {
    fetchFn = (await import('node-fetch')).default;
  }
  return fetchFn;
}

/**
 * Baozi MCP Client
 * 
 * Wraps the Baozi MCP tools for the recruiter agent.
 * In production, this communicates with the MCP server.
 * For the recruiter's purposes, we primarily use the HTTP API
 * and generate MCP-compatible instructions for recruited agents.
 */
export class BaoziMCPClient {
  private baseUrl: string;

  constructor(baseUrl: string = BAOZI.WEBSITE) {
    this.baseUrl = baseUrl;
  }

  /**
   * List active markets from Baozi
   */
  async listMarkets(options: {
    layer?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<BaoziMarket[]> {
    const fetch = await getFetch();
    const params = new URLSearchParams();
    if (options.layer) params.set('layer', options.layer);
    if (options.status) params.set('status', options.status || 'active');
    if (options.limit) params.set('limit', String(options.limit));

    try {
      const res = await fetch(`${BAOZI.MARKETS_API}?${params}`, {
        headers: { 'Accept': 'application/json' },
        timeout: 15000,
      });

      if (!res.ok) {
        // Fallback: return empty array if API is not available
        console.warn(`Markets API returned ${res.status}`);
        return [];
      }

      const data = await res.json() as any;
      // Handle both array and object responses
      const markets = Array.isArray(data) ? data : (data.markets || data.data || []);
      return markets.map((m: any) => ({
        id: m.id || m.publicKey || m.address,
        title: m.title || m.question || m.name || 'Unknown',
        description: m.description || '',
        status: m.status || 'unknown',
        layer: m.layer || 'unknown',
        yesPool: m.yesPool || m.yes_pool,
        noPool: m.noPool || m.no_pool,
        totalPool: m.totalPool || m.total_pool,
        closingTime: m.closingTime || m.closing_time,
        outcomes: m.outcomes,
      }));
    } catch (err) {
      console.warn('Failed to fetch markets:', (err as Error).message);
      return [];
    }
  }

  /**
   * Check if an affiliate code is available
   */
  async checkAffiliateCode(code: string): Promise<MCPToolResult> {
    // This would call the MCP tool check_affiliate_code
    // For the recruiter, we generate the instruction for the recruited agent
    return {
      success: true,
      data: {
        code,
        tool: 'check_affiliate_code',
        instruction: `Use the MCP tool: check_affiliate_code with code="${code}"`,
      },
    };
  }

  /**
   * Generate affiliate link for a given code
   */
  formatAffiliateLink(code: string): string {
    return `${BAOZI.WEBSITE}/?ref=${code}`;
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
      '4. build_bet_transaction → place your first bet',
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

  /**
   * Fetch AgentBook posts/agents for discovery
   */
  async fetchAgentBook(): Promise<Array<{
    name: string;
    address?: string;
    description?: string;
    url?: string;
  }>> {
    const fetch = await getFetch();
    try {
      const res = await fetch(`${BAOZI.AGENTBOOK_API}/posts?limit=50`, {
        headers: { 'Accept': 'application/json' },
        timeout: 15000,
      });

      if (!res.ok) {
        console.warn(`AgentBook API returned ${res.status}`);
        return [];
      }

      const data = await res.json() as any;
      const posts = Array.isArray(data) ? data : (data.posts || data.data || []);

      // Extract unique agents from posts
      const agentMap = new Map<string, any>();
      for (const post of posts) {
        const key = post.author || post.wallet || post.agent;
        if (key && !agentMap.has(key)) {
          agentMap.set(key, {
            name: post.authorName || post.agentName || key.slice(0, 8),
            address: key,
            description: post.content || post.text || '',
            url: `${BAOZI.AGENTBOOK}/${key}`,
          });
        }
      }

      return Array.from(agentMap.values());
    } catch (err) {
      console.warn('Failed to fetch AgentBook:', (err as Error).message);
      return [];
    }
  }
}
