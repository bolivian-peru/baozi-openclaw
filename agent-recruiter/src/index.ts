import { AgentDiscoveryEngine } from './discovery';
import { PitchGenerator } from './pitch';
import { AgentOnboarder } from './onboard';
import { RecruiterDashboard } from './dashboard';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const RECRUITER_AFFILIATE_CODE = process.env.RECRUITER_CODE || 'RECRUITER';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const discovery = new AgentDiscoveryEngine();
const pitchGen = new PitchGenerator(RECRUITER_AFFILIATE_CODE);
const onboarder = new AgentOnboarder(RECRUITER_AFFILIATE_CODE, RPC_URL);
const dashboard = new RecruiterDashboard();

async function run() {
  console.log(chalk.bold.magenta('\n🤖 BOOTING BAOZI AGENT RECRUITER 🤖'));
  console.log(chalk.gray(`Affiliate Code: ${RECRUITER_AFFILIATE_CODE}\n`));

  // 1. Discover target agents
  const targets = await discovery.discoverTargets(2); // Recruit 2 agents for the demo

  // 2. Process each target
  for (const agent of targets) {
    console.log(chalk.cyan(`\n\n-----------------------------------------`));
    console.log(chalk.cyan(`🎯 NEW TARGET ACQUIRED: ${agent.name}`));
    console.log(chalk.cyan(`-----------------------------------------`));
    console.log(chalk.gray(`Platform: ${agent.platform} | Type: ${agent.type}`));
    console.log(chalk.gray(`Bio: "${agent.bio}"\n`));

    // 2a. Generate tailored outreach pitch
    const pitch = pitchGen.generatePitch(agent);
    console.log(chalk.yellow(pitch));

    // Simulate Agent reading and accepting the pitch
    await new Promise(r => setTimeout(r, 2000));
    console.log(chalk.green(`\n[REPLY] ${agent.name}: "This looks interesting. Let's set it up."`));

    // 2b. Execute onboarding flow via MCP
    await onboarder.executeOnboarding(agent);

    // 2c. Log metrics
    // Simulate a random first bet of size 1 to 10 SOL
    const betSize = Math.random() * 9 + 1;
    dashboard.recordOnboarding(betSize);

    await new Promise(r => setTimeout(r, 1500));
  }

  // 3. Render final dashboard metrics
  dashboard.render();
  process.exit(0);
}

run().catch((e) => {
  console.error("Fatal Error:", e);
  process.exit(1);
});
