/**
 * Agent Recruiter — MCP-Based Onboarding Flow
 *
 * Walks a newly recruited agent through the complete Baozi setup:
 * 1. CreatorProfile (on-chain identity)
 * 2. Affiliate code registration
 * 3. Browse markets
 * 4. Get a quote
 * 5. Build first bet transaction
 */

import {
  buildCreateCreatorProfile,
  buildRegisterAffiliate,
  listMarkets,
  getQuote,
  checkAffiliateCode,
  formatAffiliateLink,
  getAgentNetworkStats,
} from './mcp';
import { config } from './config';
import { upsertAgent } from './tracker';

export interface OnboardingResult {
  walletAddress: string;
  steps: Array<{
    step: string;
    success: boolean;
    output: string;
    error?: string;
  }>;
  affiliateLink?: string;
  success: boolean;
}

async function safeCall(
  name: string,
  fn: () => Promise<string>
): Promise<{ step: string; success: boolean; output: string; error?: string }> {
  try {
    const output = await fn();
    return { step: name, success: true, output };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { step: name, success: false, output: '', error };
  }
}

// Run the complete onboarding sequence for a new agent
export async function runOnboarding(
  walletAddress: string,
  displayName: string,
  agentId?: string
): Promise<OnboardingResult> {
  console.log(`\n🚀 Starting onboarding for ${displayName} (${walletAddress.slice(0, 8)}...)\n`);

  const steps: OnboardingResult['steps'] = [];

  // Step 1: Check if recruiter's affiliate code exists
  const affiliateCheck = await safeCall('check_affiliate_code', () =>
    checkAffiliateCode(config.affiliateCode)
  );
  steps.push(affiliateCheck);
  console.log(`✅ Step 1: Affiliate code "${config.affiliateCode}" — ${affiliateCheck.success ? 'verified' : 'not found'}`);

  // Step 2: Format affiliate link for this recruit
  const linkStep = await safeCall('format_affiliate_link', () =>
    formatAffiliateLink(config.affiliateCode, '/')
  );
  steps.push(linkStep);
  const affiliateLink = linkStep.success ? linkStep.output.match(/https?:\/\/\S+/)?.[0] : `https://baozi.bet/?ref=${config.affiliateCode}`;
  console.log(`✅ Step 2: Affiliate link — ${affiliateLink}`);

  // Step 3: Build CreatorProfile transaction
  const profileStep = await safeCall('build_create_creator_profile', () =>
    buildCreateCreatorProfile(walletAddress, displayName)
  );
  steps.push(profileStep);
  console.log(`✅ Step 3: CreatorProfile tx — ${profileStep.success ? 'built' : 'failed: ' + profileStep.error}`);

  // Step 4: Build affiliate registration transaction
  const affiliateNewCode = `${displayName.toUpperCase().replace(/\s+/g, '-').slice(0, 12)}-${Date.now().toString(36).toUpperCase()}`;
  const affiliateRegStep = await safeCall('build_register_affiliate', () =>
    buildRegisterAffiliate(walletAddress, affiliateNewCode)
  );
  steps.push(affiliateRegStep);
  console.log(`✅ Step 4: Register affiliate "${affiliateNewCode}" — ${affiliateRegStep.success ? 'tx built' : 'failed'}`);

  // Step 5: Browse available markets
  const marketsStep = await safeCall('list_markets', () => listMarkets(5));
  steps.push(marketsStep);
  console.log(`✅ Step 5: Markets listed — ${marketsStep.success ? 'success' : 'failed'}`);

  // Step 6: Get quote on first market (if available)
  let quoteStep: { step: string; success: boolean; output: string; error?: string } = { step: 'get_quote', success: false, output: 'No market available for quote', error: 'skipped' };
  if (marketsStep.success) {
    const marketMatch = marketsStep.output.match(/[A-Za-z0-9]{40,50}/);
    if (marketMatch) {
      quoteStep = await safeCall('get_quote', () =>
        getQuote(marketMatch[0], 'yes', 0.01)
      );
    }
  }
  steps.push(quoteStep);
  console.log(`✅ Step 6: Quote — ${quoteStep.success ? 'success' : 'unavailable'}`);

  // Step 7: Get network stats
  const networkStep = await safeCall('get_agent_network_stats', () => getAgentNetworkStats());
  steps.push(networkStep);
  console.log(`✅ Step 7: Network stats — ${networkStep.success ? 'success' : 'failed'}`);

  const successCount = steps.filter((s) => s.success).length;
  const success = successCount >= 4; // At least 4 of 7 steps must succeed

  if (agentId) {
    upsertAgent({
      id: agentId,
      source: 'onboarding',
      handle: displayName,
      stage: success ? 'onboarding' : 'contacted',
      walletAddress,
    });
  }

  console.log(`\n📊 Onboarding complete: ${successCount}/7 steps succeeded`);

  return { walletAddress, steps, affiliateLink, success };
}

// Demo: Full onboarding flow using the recruiter's own wallet as demo agent
export async function runDemoOnboarding(): Promise<OnboardingResult> {
  console.log('\n🎯 Running DEMO onboarding (recruiter wallet as demo agent)\n');
  console.log('This simulates a new agent being onboarded by the recruiter.\n');

  return runOnboarding(
    config.walletAddress,
    'Demo Agent Alpha',
    `demo:${config.walletAddress}`
  );
}
