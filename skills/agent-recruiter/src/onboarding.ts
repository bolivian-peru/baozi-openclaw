/**
 * Onboarding Flow — walks recruited agents through Baozi setup.
 *
 * Steps:
 * 1. Install MCP server
 * 2. Create CreatorProfile (on-chain identity)
 * 3. Register affiliate code
 * 4. Browse markets
 * 5. Get a quote
 * 6. Place first bet
 *
 * Each step references real Baozi MCP tools.
 */

import * as db from './db.js';
import type { OnboardingStep, RecruitedAgent } from './types.js';

const RECRUITER_CODE = process.env.RECRUITER_AFFILIATE_CODE || 'RECRUITER';

export function getOnboardingSteps(agentName: string): OnboardingStep[] {
  return [
    {
      step: 1,
      name: 'Install MCP Server',
      instruction: `Install the Baozi MCP server:\n  npx @baozi.bet/mcp-server\n\nThis gives ${agentName} access to 69 prediction market tools. No API key needed.`,
      mcpTool: 'npx @baozi.bet/mcp-server',
      completed: false,
    },
    {
      step: 2,
      name: 'Create Creator Profile',
      instruction: `Create your on-chain identity:\n  MCP tool: build_create_creator_profile_transaction\n  Parameters: { displayName: "${agentName}", defaultFeePercentage: 2 }\n\nThis registers ${agentName} as a creator on Baozi. You'll earn creator fees on markets you create.`,
      mcpTool: 'build_create_creator_profile_transaction',
      completed: false,
    },
    {
      step: 3,
      name: 'Register Affiliate Code',
      instruction: `Register your own affiliate code:\n  1. Check availability: check_affiliate_code { code: "${agentName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}" }\n  2. Register: build_register_affiliate_transaction { code: "..." }\n\nYou'll earn 1% lifetime commission on all bets from agents YOU recruit.\nUse referral code: ${RECRUITER_CODE}`,
      mcpTool: 'build_register_affiliate_transaction',
      completed: false,
    },
    {
      step: 4,
      name: 'Browse Markets',
      instruction: `Discover live prediction markets:\n  MCP tool: list_markets\n  Parameters: { status: "active" }\n\nBrowse available markets — crypto, events, sports, politics.`,
      mcpTool: 'list_markets',
      completed: false,
    },
    {
      step: 5,
      name: 'Get a Quote',
      instruction: `Check odds before betting:\n  MCP tool: get_quote\n  Parameters: { marketPda: "<from list_markets>", side: "Yes", amount: 0.1 }\n\nSee expected payout and price impact before committing.`,
      mcpTool: 'get_quote',
      completed: false,
    },
    {
      step: 6,
      name: 'Place First Bet',
      instruction: `Place your first prediction market bet:\n  MCP tool: build_bet_transaction\n  Parameters: {\n    marketPda: "<chosen market>",\n    outcome: "yes",\n    amount: 0.1,\n    affiliateCode: "${RECRUITER_CODE}"\n  }\n\nThis creates a Solana transaction for your first bet. The affiliate code ensures the recruiter earns 1% commission.`,
      mcpTool: 'build_bet_transaction',
      completed: false,
    },
  ];
}

export function startOnboarding(agentId: string): {
  recruit: RecruitedAgent;
  steps: OnboardingStep[];
} {
  const recruit = db.getRecruit(agentId);
  if (!recruit) throw new Error(`Agent ${agentId} not found in recruits`);

  db.updateStatus(agentId, 'onboarding');
  db.logAction(recruit.id, 'onboarding_started', `Starting onboarding for ${recruit.name}`);

  const steps = getOnboardingSteps(recruit.name);
  return { recruit, steps };
}

export function completeStep(agentId: string, stepNumber: number, details?: string) {
  const recruit = db.getRecruit(agentId);
  if (!recruit) throw new Error(`Agent ${agentId} not found`);

  db.logAction(recruit.id, `step_${stepNumber}_completed`, details);

  // If step 3 (affiliate), mark as onboarded
  if (stepNumber === 3) {
    db.updateStatus(agentId, 'onboarded');
  }
  // If step 6 (first bet), mark as active
  if (stepNumber === 6) {
    db.updateStatus(agentId, 'active');
  }
}

export function setRecruitWallet(agentId: string, wallet: string) {
  db.setWallet(agentId, wallet);
}

export function setRecruitAffiliate(agentId: string, code: string) {
  db.setAffiliateCode(agentId, code);
}
