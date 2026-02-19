import { DiscoveredAgent, RecruitedAgent, OnboardingStatus } from '../types';
import { BaoziMCPClient } from '../mcp/client';
import { RecruiterConfig } from '../types';
import { generatePitch } from '../outreach/templates';
import { BAOZI } from '../config';

/**
 * Onboarding Flow
 * 
 * Walks a discovered agent through the complete Baozi setup:
 * 1. Generate tailored pitch
 * 2. Guide through MCP installation  
 * 3. Create CreatorProfile (on-chain identity)
 * 4. Register affiliate code (so THEY can recruit too)
 * 5. Browse markets & get quotes
 * 6. Place first bet
 * 
 * All with the recruiter's affiliate code embedded.
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
 * Simulate the onboarding flow step by step.
 * 
 * In a real deployment, each step would:
 * 1. Send instructions to the agent via their communication channel
 * 2. Wait for the agent to execute
 * 3. Verify on-chain that the step completed
 * 4. Move to the next step
 * 
 * For the recruiter, we generate all the instructions and track state.
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
        // Generate setup instructions
        const instructions = client.generateSetupInstructions(config.affiliateCode);
        agent.notes.push('MCP setup instructions provided');
        agent.notes.push(`Install: npx ${BAOZI.MCP_PACKAGE}`);
      },
    },
    {
      name: 'creator-profile',
      status: 'profile-created',
      execute: async () => {
        // In production: verify on-chain that profile was created
        const steps = client.generateOnboardingSteps(agent.name, config.affiliateCode);
        const profileStep = steps.find(s => s.tool === 'build_create_creator_profile_transaction');
        agent.notes.push(`CreatorProfile step: ${JSON.stringify(profileStep?.params)}`);
      },
    },
    {
      name: 'affiliate-registration',
      status: 'affiliate-registered',
      execute: async () => {
        // In production: verify affiliate code was registered
        const suggestedCode = agent.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        agent.affiliateCode = suggestedCode;
        agent.notes.push(`Affiliate code suggested: ${suggestedCode}`);
      },
    },
    {
      name: 'first-bet',
      status: 'first-bet-placed',
      execute: async () => {
        // In production: verify first bet transaction on-chain
        const markets = await client.listMarkets({ status: 'active', limit: 5 });
        if (markets.length > 0) {
          agent.firstBetMarket = markets[0].title;
          agent.notes.push(`Market suggested for first bet: ${markets[0].title}`);
        } else {
          agent.notes.push('Suggested browsing markets at list_markets');
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
