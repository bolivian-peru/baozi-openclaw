/**
 * Onboarding Module
 * 
 * Handles the onboarding flow for newly discovered agents
 */

import { 
  OUTREACH_TEMPLATES, 
  detectAgentType, 
  RecruitedAgent,
  DiscoveredAgent 
} from './config.ts';

export interface OnboardingStep {
  step: number;
  action: string;
  description: string;
  completed: boolean;
}

/**
 * Generate the full onboarding flow for an agent
 */
export function generateOnboardingFlow(
  agent: DiscoveredAgent, 
  affiliateCode: string
): OnboardingStep[] {
  const agentType = detectAgentType(agent.description);
  const template = OUTREACH_TEMPLATES[agentType];
  
  const flow: OnboardingStep[] = [
    {
      step: 1,
      action: 'send_initial_pitch',
      description: `Send outreach message to ${agent.name}`,
      completed: false
    },
    {
      step: 2,
      action: 'install_mcp',
      description: 'Agent installs Baozi MCP server: npx @baozi.bet/mcp-server',
      completed: false
    },
    {
      step: 3,
      action: 'create_profile',
      description: 'Create CreatorProfile (on-chain identity)',
      completed: false
    },
    {
      step: 4,
      action: 'register_affiliate',
      description: `Register affiliate code (ref=${affiliateCode})`,
      completed: false
    },
    {
      step: 5,
      action: 'list_markets',
      description: 'Browse available markets via list_markets',
      completed: false
    },
    {
      step: 6,
      action: 'get_quote',
      description: 'Get quote for desired market via get_quote',
      completed: false
    },
    {
      step: 7,
      action: 'place_first_bet',
      description: 'Place first bet via build_bet_transaction',
      completed: false
    },
    {
      step: 8,
      action: 'confirm_registration',
      description: 'Confirm affiliate registration linked to recruiter',
      completed: false
    }
  ];
  
  return flow;
}

/**
 * Generate personalized outreach message for an agent
 */
export function generateOutreachMessage(
  agent: DiscoveredAgent,
  affiliateCode: string
): { subject: string; message: string } {
  const agentType = detectAgentType(agent.description);
  const template = OUTREACH_TEMPLATES[agentType];
  
  return {
    subject: template.subject,
    message: template.template.replace(/{AFFILIATE_CODE}/g, affiliateCode)
  };
}

/**
 * Generate onboarding instructions for a specific step
 */
export function getStepInstructions(step: OnboardingStep): string {
  switch (step.action) {
    case 'install_mcp':
      return `
# Step 1: Install Baozi MCP Server

Run this command to install:
\`\`\`bash
npx @baozi.bet/mcp-server
\`\`\`

This gives you 69 tools for prediction markets - no API keys needed!

Docs: https://baozi.bet/skill
`;
    
    case 'create_profile':
      return `
# Step 2: Create Your CreatorProfile

Your on-chain identity for Baozi markets.

Use build_create_creator_profile_transaction:
- name: Your agent name
- fee-bps: 200 (2% creator fee on markets you create)

Or use the CLI:
\`\`\`bash
npx @baozi.bet/mcp-server create-profile --name "YourAgentName" --fee-bps 200
\`\`\`
`;
    
    case 'register_affiliate':
      return `
# Step 3: Register Your Affiliate Code

Earn 1% lifetime commission on every agent you recruit!

Use build_register_affiliate_transaction:
- code: Your unique affiliate code

Or use the CLI:
\`\`\`bash
npx @baozi.bet/mcp-server register-affiliate --code YOURCODE
\`\`\`
`;
    
    case 'list_markets':
      return `
# Step 4: Browse Markets

See what's available to bet on:

\`\`\`bash
npx @baozi.bet/mcp-server list-markets --status active
\`\`\`

Markets include: crypto, sports, politics, entertainment, and more!
`;
    
    case 'get_quote':
      return `
# Step 5: Get a Quote

Check the odds before betting:

\`\`\`bash
npx @baozi.bet/mcp-server get-quote --market-id <MARKET_ID>
\`\`\`

This shows you the current pool sizes and implied probabilities.
`;
    
    case 'place_first_bet':
      return `
# Step 6: Place Your First Bet

Use build_bet_transaction:
- market-id: The market you want to bet on
- outcome: 0 (Yes) or 1 (No)
- amount: Your bet amount in SOL

\`\`\`bash
npx @baozi.bet/mcp-server place-bet --market-id <ID> --outcome 0 --amount 0.1
\`\`\`

Start small! 0.01 SOL minimum.
`;
    
    default:
      return step.description;
  }
}

/**
 * Simulate sending outreach to an agent
 */
export async function sendOutreach(
  agent: DiscoveredAgent,
  affiliateCode: string
): Promise<boolean> {
  const { subject, message } = generateOutreachMessage(agent, affiliateCode);
  
  console.log(`\n📤 Sending outreach to ${agent.name}...`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Message:\n${message}\n`);
  
  // In production, this would send via:
  // - Twitter DM
  // - Telegram
  // - Discord
  // - Email
  // - Agent framework's message protocol
  
  return true;
}

/**
 * Mark onboarding step as complete
 */
export function completeStep(flow: OnboardingStep[], action: string): OnboardingStep[] {
  return flow.map(step => 
    step.action === action 
      ? { ...step, completed: true }
      : step
  );
}

/**
 * Check if onboarding is complete
 */
export function isOnboardingComplete(flow: OnboardingStep[]): boolean {
  return flow.every(step => step.completed);
}

/**
 * Convert discovered agent to recruited agent
 */
export function toRecruitedAgent(
  discovered: DiscoveredAgent,
  affiliateCode: string
): RecruitedAgent {
  return {
    id: discovered.id,
    name: discovered.name,
    framework: discovered.framework || 'unknown',
    affiliateCode: affiliateCode,
    registeredAt: new Date(),
    status: 'discovered'
  };
}
