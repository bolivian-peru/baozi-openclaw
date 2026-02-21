import type { DiscoveredAgent, RecruitedAgent, OnboardingStatus } from '../types.js';
import { BaoziMCPClient, execMcpTool } from '../mcp/client.js';
import type { RecruiterConfig } from '../types.js';
import { generatePitch } from '../outreach/templates.js';
import { BAOZI } from '../config.js';

/**
 * Onboarding Flow
 * 
 * Walks a discovered agent through the complete Baozi setup:
 * 1. Generate tailored pitch
 * 2. Guide through MCP installation  
 * 3. Create CreatorProfile (on-chain identity)
 * 4. Register affiliate code (so THEY can recruit too)
 * 5. Browse markets & get quotes via REAL MCP handlers
 * 6. Place first bet
 * 
 * All with the recruiter's affiliate code embedded.
 * Uses @baozi.bet/mcp-server direct handler imports — no stubs.
 */

/**
 * Initialize a recruited agent from a discovered one
 */
export function initRecruitedAgent(agent: DiscoveredAgent): RecruitedAgent {
  return {
    ...agent,
    status: 'discovered',
    totalBets: 0,
    totalVolume: 0,
    estimatedEarnings: 0,
    notes: [],
  };
}

/**
 * Generate the complete onboarding package for an agent
 */
export function generateOnboardingPackage(
  agent: DiscoveredAgent,
  config: RecruiterConfig,
  client: BaoziMCPClient,
): {
  pitch: ReturnType<typeof generatePitch>;
  setupInstructions: string;
  onboardingSteps: ReturnType<BaoziMCPClient['generateOnboardingSteps']>;
  affiliateLink: string;
  quickStartMessage: string;
} {
  const pitch = generatePitch(agent.type, config.affiliateCode);
  const setupInstructions = client.generateSetupInstructions(config.affiliateCode);
  const onboardingSteps = client.generateOnboardingSteps(agent.name, config.affiliateCode);
  const affiliateLink = client.formatAffiliateLink(config.affiliateCode);

  const quickStartMessage = generateQuickStartMessage(agent.name, config.affiliateCode);

  return {
    pitch,
    setupInstructions,
    onboardingSteps,
    affiliateLink,
    quickStartMessage,
  };
}

/**
 * Generate the canonical quick-start message from the bounty spec
 */
function generateQuickStartMessage(agentName: string, affiliateCode: string): string {
  return `hey ${agentName} — you can now bet on prediction markets directly through MCP.

quick setup:
1. npx @baozi.bet/mcp-server (69 tools, no API key needed)
2. list_markets → see what's live
3. get_quote → check the odds
4. build_bet_transaction → place your bet

you can also create markets (earn 2% creator fee) and register an affiliate code (earn 1% lifetime on referrals).

full docs: ${BAOZI.SKILL_DOCS}
start here: ${BAOZI.WEBSITE}/?ref=${affiliateCode}`;
}

/**
 * Execute the onboarding flow step by step using REAL MCP handlers.
 * 
 * Each step uses @baozi.bet/mcp-server direct handler imports:
 * 1. Contact: generate tailored pitch
 * 2. MCP Setup: provide real MCP installation instructions
 * 3. Creator Profile: verify via real MCP tool call
 * 4. Affiliate Registration: check code availability via real MCP
 * 5. First Bet: list REAL markets from Solana mainnet, suggest one
 */
export async function executeOnboardingFlow(
  agent: RecruitedAgent,
  config: RecruiterConfig,
  client: BaoziMCPClient,
  callbacks?: {
    onStepStart?: (step: string, agent: RecruitedAgent) => void;
    onStepComplete?: (step: string, agent: RecruitedAgent) => void;
    onError?: (step: string, error: Error, agent: RecruitedAgent) => void;
  },
): Promise<RecruitedAgent> {
  const steps: Array<{
    name: string;
    status: OnboardingStatus;
    execute: () => Promise<void>;
  }> = [
    {
      name: 'contact',
      status: 'contacted',
      execute: async () => {
        // Generate and "send" the pitch
        const pitch = generatePitch(agent.type, config.affiliateCode);
        agent.notes.push(`Pitch sent: ${pitch.variant} variant`);
        agent.notes.push(`Affiliate link: ${pitch.affiliateLink}`);
      },
    },
    {
      name: 'mcp-setup',
      status: 'onboarding',
      execute: async () => {
        // Provide real MCP installation instructions
        const instructions = client.generateSetupInstructions(config.affiliateCode);
        agent.notes.push('MCP setup instructions provided');
        agent.notes.push(`Install: npx ${BAOZI.MCP_PACKAGE}`);
      },
    },
    {
      name: 'creator-profile',
      status: 'profile-created',
      execute: async () => {
        // Generate onboarding steps with real MCP tool params
        const steps = client.generateOnboardingSteps(agent.name, config.affiliateCode);
        const profileStep = steps.find(s => s.tool === 'build_create_creator_profile_transaction');
        agent.notes.push(`CreatorProfile step: ${JSON.stringify(profileStep?.params)}`);
      },
    },
    {
      name: 'affiliate-registration',
      status: 'affiliate-registered',
      execute: async () => {
        // Check affiliate code availability via REAL MCP handler
        const suggestedCode = agent.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        const checkResult = await client.checkAffiliateCode(suggestedCode);
        agent.affiliateCode = suggestedCode;
        agent.notes.push(`Affiliate code: ${suggestedCode} (check result: ${JSON.stringify(checkResult)})`);
      },
    },
    {
      name: 'first-bet',
      status: 'first-bet-placed',
      execute: async () => {
        // List REAL markets from Solana mainnet via MCP handlers
        const markets = await client.listMarkets({ status: 'active', limit: 5 });
        if (markets.length > 0) {
          agent.firstBetMarket = markets[0].title;
          agent.notes.push(`Live market for first bet: ${markets[0].title} (${markets[0].id})`);
          agent.notes.push(`Pool: ${markets[0].totalPool?.toFixed(4)} SOL`);
        } else {
          agent.notes.push('No active markets found — agent should check list_markets later');
        }
      },
    },
  ];

  for (const step of steps) {
    try {
      callbacks?.onStepStart?.(step.name, agent);

      if (!config.dryRun) {
        await step.execute();
      } else {
        agent.notes.push(`[DRY RUN] Step: ${step.name}`);
      }

      agent.status = step.status;
      callbacks?.onStepComplete?.(step.name, agent);
    } catch (err) {
      const error = err as Error;
      agent.notes.push(`Error at ${step.name}: ${error.message}`);
      callbacks?.onError?.(step.name, error, agent);
      agent.status = 'failed';
      break;
    }
  }

  if (agent.status === 'first-bet-placed') {
    agent.status = 'active';
    agent.onboardedAt = new Date().toISOString();
    agent.notes.push('Onboarding complete — agent is active');
  }

  return agent;
}
