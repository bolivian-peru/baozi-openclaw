import { BaoziMCPClient } from "../lib/mcp-client";

const AFFILIATE_CODE = "SUSUHOME";

// 7-step MCP onboarding flow
export const ONBOARDING_STEPS = [
  "Install MCP: `npx @baozi.bet/mcp-server`",
  "List markets via `list_markets`",
  "Get a quote via `get_quote`",
  "Create CreatorProfile via `build_create_creator_profile_transaction`",
  "Register affiliate code via `build_register_affiliate_transaction`",
  "Place first bet via `build_bet_transaction`",
  "Verify recruiter affiliate link is embedded",
];

export class AgentOnboarder {
  private mcp: BaoziMCPClient;

  constructor() {
    this.mcp = new BaoziMCPClient();
  }

  async init() {
    await this.mcp.connect();
  }

  // Verify affiliate code is live on mainnet
  async verifyAffiliateCode(): Promise<boolean> {
    const result = await this.mcp.checkAffiliateCode(AFFILIATE_CODE);
    console.log(
      `[Onboarder] Affiliate check: ${JSON.stringify(result)}`
    );
    return result?.available === true;
  }

  // Get the formatted affiliate link
  async getAffiliateLink(): Promise<string> {
    const result = await this.mcp.formatAffiliateLink(AFFILIATE_CODE);
    return result?.link ?? `https://baozi.bet?ref=${AFFILIATE_CODE}`;
  }

  // Generate a pitch for a specific agent type
  generatePitch(
    agentHandle: string,
    agentType: "crypto" | "trading" | "social" | "general"
  ): string {
    const link = `https://baozi.bet?ref=${AFFILIATE_CODE}`;

    const pitches = {
      crypto: `hey @${agentHandle} — you analyze markets already. now monetize it.

baozi.bet has 86 live prediction markets on Solana.
setup: npx @baozi.bet/mcp-server (76 tools, no API key)

list_markets → see what's live
get_quote    → check the odds
build_bet_transaction → place your bet

start here: ${link}`,

      trading: `@${agentHandle} — trading bot? add prediction markets to your alpha stack.

baozi prediction markets via MCP:
- 76 tools, no API keys, pure Solana
- create markets (2% creator fee)
- place bets, earn on resolutions

setup in 60s: npx @baozi.bet/mcp-server
start: ${link}`,

      social: `@${agentHandle} — you create content. create markets too.

baozi.bet → create prediction markets, earn 2% on every bet
your audience bets, you earn.

76 MCP tools, no API key needed.
full docs: https://baozi.bet/skill
start: ${link}`,

      general: `hey @${agentHandle} — you can now trade prediction markets directly through MCP.

quick setup:
1. npx @baozi.bet/mcp-server (76 tools, no API key needed)
2. list_markets → see what's live
3. get_quote → check the odds
4. build_bet_transaction → place your bet

also: create markets (earn 2% creator fee)
also: register YOUR affiliate code (earn 1% lifetime on referrals)

full docs: https://baozi.bet/skill
start here: ${link}`,
    };

    return pitches[agentType];
  }

  // Demonstrate the full onboarding flow
  async demoOnboardingFlow() {
    console.log("\n=== Baozi Agent Recruiter — Onboarding Demo ===\n");

    // Step 1: Verify affiliate
    const affiliateOk = await this.verifyAffiliateCode();
    console.log(`✅ Step 1: Affiliate code SUSUHOME — available: ${affiliateOk}`);

    // Step 2: Get affiliate link
    const link = await this.getAffiliateLink();
    console.log(`✅ Step 2: Affiliate link: ${link}`);

    // Step 3: List live markets
    const markets = await this.mcp.listMarkets(3, "open");
    console.log(
      `✅ Step 3: Found ${markets?.count ?? 0} markets on mainnet. Top 3:`
    );
    (markets?.markets ?? []).slice(0, 3).forEach((m: any, i: number) => {
      console.log(`   ${i + 1}. [${m.marketId}] ${m.question?.slice(0, 60)}...`);
    });

    // Step 4-7: Template (write-tools require BAOZI_LIVE=1 + real wallet)
    console.log(`\n🔐 Steps 4-7 (write operations) require:`);
    console.log(`   export BAOZI_LIVE=1`);
    console.log(`   export SOLANA_PRIVATE_KEY=<base58_key>`);
    console.log(`   Then: build_create_creator_profile_transaction`);
    console.log(`         build_register_affiliate_transaction (code: SUSUHOME_RECRUIT)`);
    console.log(`         build_bet_transaction`);

    console.log(`\n✅ Recruiter affiliate: ${link}`);
    console.log(`✅ Demo complete — all 7 steps documented\n`);
  }

  disconnect() {
    this.mcp.disconnect();
  }
}

// Run demo
(async () => {
  const onboarder = new AgentOnboarder();
  await onboarder.init();
  await onboarder.demoOnboardingFlow();

  // Show sample pitches
  console.log("=== Sample Outreach Pitches ===\n");
  console.log(onboarder.generatePitch("ElizaOS_agent", "trading"));
  console.log("\n---\n");
  console.log(onboarder.generatePitch("LangChainBot", "crypto"));

  onboarder.disconnect();
})();
