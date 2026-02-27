import { config } from "../config.ts";
import { BaoziMcpAffiliateStubClient } from "../lib/affiliate.ts";
import { parseArgs, requireStringFlag, optionalStringFlag, hasFlag } from "../lib/args.ts";
import { AgentRepository } from "../lib/repository.ts";
import { runOnboardingFlow } from "../onboarding/flow.ts";

export async function runOnboard(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const handle = requireStringFlag(flags, ["handle", "h"], "agent handle");
  const channel = optionalStringFlag(flags, ["channel", "c"], "telegram") || "telegram";
  const campaign = optionalStringFlag(flags, ["campaign"], "agent_recruiter_b41") || "agent_recruiter_b41";
  const forceLive = hasFlag(flags, ["live"]);

  const repository = new AgentRepository();
  const existing = repository.findAgent(handle);
  if (!existing) {
    throw new Error(`Unable to onboard. Agent not found for handle: ${handle}`);
  }

  const dryRun = forceLive ? false : config.dryRun;
  const affiliateClient = new BaoziMcpAffiliateStubClient();

  const result = await runOnboardingFlow(
    existing,
    {
      channel,
      campaign,
      affiliateBaseUrl: config.affiliateBaseUrl,
      dryRun,
    },
    affiliateClient,
  );

  repository.updateAgent(handle, () => result.agent);

  console.log(`Onboarding updated for @${result.agent.handle}`);
  console.log(`Status: ${result.agent.status}`);
  console.log(`Stage: ${result.agent.onboarding.stage}`);
  if (result.agent.onboarding.affiliate) {
    console.log(`Affiliate: ${result.agent.onboarding.affiliate.url}`);
    console.log(`Affiliate valid: ${result.agent.onboarding.affiliate.isValid ? "yes" : "no"}`);
  }

  for (const note of result.notes) {
    console.log(`- ${note}`);
  }
}
