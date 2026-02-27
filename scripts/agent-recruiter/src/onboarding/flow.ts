import type { AgentCandidate } from "../types.ts";
import type { AffiliateStubClient } from "../lib/affiliate.ts";

export interface OnboardOptions {
  channel: string;
  campaign: string;
  affiliateBaseUrl: string;
  dryRun: boolean;
}

export interface OnboardResult {
  agent: AgentCandidate;
  notes: string[];
}

export async function runOnboardingFlow(
  agent: AgentCandidate,
  options: OnboardOptions,
  affiliateClient: AffiliateStubClient,
): Promise<OnboardResult> {
  const notes: string[] = [];
  const next = structuredClone(agent);
  next.updatedAt = new Date().toISOString();

  if (next.status === "discovered") {
    next.status = "onboarding";
  }

  next.onboarding.stage = "intake";
  next.onboarding.checklist.intakeComplete = true;
  notes.push(`Intake completed via ${options.channel} channel`);

  next.onboarding.stage = "compliance";
  next.onboarding.checklist.complianceComplete = true;
  notes.push("Compliance check completed with basic KYC stub");

  const { record, patternCheck } = await affiliateClient.generateAffiliateLink({
    handle: next.handle,
    campaign: options.campaign,
    source: options.channel,
    affiliateBaseUrl: options.affiliateBaseUrl,
  });

  next.onboarding.affiliate = record;
  next.onboarding.checklist.affiliateIssued = true;
  notes.push(`Affiliate link generated with code ${record.code}`);

  const validation = await affiliateClient.checkAffiliateLink({ link: record });
  next.onboarding.checklist.affiliateValidated = validation.ok;
  if (!validation.ok) {
    next.onboarding.affiliate = {
      ...record,
      checkedAt: new Date().toISOString(),
      isValid: false,
      lastError: validation.message,
    };
    notes.push(`Affiliate validation failed: ${validation.message}`);
    return { agent: next, notes };
  }

  next.onboarding.stage = "activation";
  next.onboarding.checklist.activated = !options.dryRun;
  notes.push(
    options.dryRun
      ? "Dry run mode enabled: activation step simulated"
      : "Activation passed and agent marked as active",
  );

  if (options.dryRun) {
    next.status = "onboarding";
    next.onboarding.stage = "activation";
  } else {
    next.status = "active";
    next.onboarding.stage = "live";
    next.onboarding.completedAt = new Date().toISOString();
  }

  return { agent: next, notes };
}
