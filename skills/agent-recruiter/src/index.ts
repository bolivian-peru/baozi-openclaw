/**
 * Agent Recruiter - Main Entry Point
 * 
 * AI Agent that recruits other agents to Baozi prediction markets
 * and earns 1% lifetime affiliate commission
 * 
 * Usage:
 *   bun run src/index.ts discover     - Discover new agents
 *   bun run src/index.ts onboard     - Run onboarding flow
 *   bun run src/index.ts track       - Show tracking dashboard
 *   bun run src/index.ts start       - Full recruitment loop
 */

import { DEFAULT_CONFIG, RecruiterConfig, RecruitedAgent } from './config.ts';
import { discoverAgents, filterNewAgents, DiscoveredAgent } from './discover.ts';
import { 
  generateOnboardingFlow, 
  generateOutreachMessage,
  sendOutreach,
  toRecruitedAgent,
  isOnboardingComplete,
  completeStep
} from './onboard.ts';
import { 
  loadTrackingData, 
  saveTrackingData, 
  addRecruitedAgent,
  updateAgentStatus,
  recordFirstBet,
  displayDashboard,
  calculateProjectedEarnings
} from './track.ts';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

console.log(`
🌟 AGENT RECRUITER - AI That Onboards Other Agents 🌟

The viral loop that never stops — agents recruiting agents.

Version: 1.0.0
Affiliate Code: ${DEFAULT_CONFIG.affiliateCode}
`);

async function runDiscover() {
  console.log('\n🔍 AGENT DISCOVERY MODE\n');
  console.log('Scanning for AI agents that could benefit from Baozi prediction markets...\n');
  
  // Load existing tracking data
  const trackingData = loadTrackingData();
  
  // Discover agents from all sources
  const discovered = await discoverAgents(DEFAULT_CONFIG.discoverySources);
  
  // Filter out already recruited
  const newAgents = filterNewAgents(discovered, trackingData.recruitedAgents);
  
  console.log(`\n📋 Summary:`);
  console.log(`   Total discovered: ${discovered.length}`);
  console.log(`   New (not recruited): ${newAgents.length}`);
  console.log(`   Already recruited: ${trackingData.totalRecruited}`);
  
  if (newAgents.length > 0) {
    console.log(`\n🎯 New agents to recruit:`);
    for (const agent of newAgents) {
      console.log(`   - ${agent.name} (${agent.framework}) - ${agent.description}`);
    }
  }
  
  return newAgents;
}

async function runOnboard(agentId?: string) {
  console.log('\n🤝 ONBOARDING MODE\n');
  
  // Load tracking data
  const trackingData = loadTrackingData();
  
  // Get agents to onboard
  let agentsToOnboard: DiscoveredAgent[];
  
  if (agentId) {
    // Specific agent
    const discovered = await discoverAgents(DEFAULT_CONFIG.discoverySources);
    agentsToOnboard = discovered.filter(a => a.id === agentId);
    
    if (agentsToOnboard.length === 0) {
      console.log(`❌ Agent not found: ${agentId}`);
      return;
    }
  } else {
    // New agents
    const discovered = await discoverAgents(DEFAULT_CONFIG.discoverySources);
    agentsToOnboard = filterNewAgents(discovered, trackingData.recruitedAgents);
  }
  
  console.log(`Onboarding ${agentsToOnboard.length} agent(s)...\n`);
  
  for (const agent of agentsToOnboard) {
    console.log(`\n📤 Processing: ${agent.name}`);
    
    // Generate outreach message
    const outreach = generateOutreachMessage(agent, trackingData.recruiterCode);
    console.log(`   Subject: ${outreach.subject}`);
    
    // Send outreach (simulated)
    await sendOutreach(agent, trackingData.recruiterCode);
    
    // Add to tracking as discovered
    const recruitedAgent = toRecruitedAgent(agent, trackingData.recruiterCode);
    recruitedAgent.status = 'contacted';
    addRecruitedAgent(trackingData, recruitedAgent);
    
    // Generate onboarding flow
    const flow = generateOnboardingFlow(agent, trackingData.recruiterCode);
    console.log(`\n   Onboarding Flow (${flow.length} steps):`);
    for (const step of flow) {
      console.log(`   ${step.step}. ${step.action}: ${step.description}`);
    }
    
    // Simulate completing onboarding
    console.log(`\n   ⚡ Simulating onboarding completion...`);
    
    // Mark as onboarding
    updateAgentStatus(trackingData, agent.id, 'onboarding');
    
    // Simulate first bet
    const betAmount = 0.1 + Math.random() * 0.9; // 0.1-1.0 SOL
    recordFirstBet(trackingData, agent.id, betAmount);
    console.log(`   ✅ First bet placed: ${betAmount.toFixed(2)} SOL`);
    
    saveTrackingData(trackingData);
    
    console.log(`\n   🎉 ${agent.name} successfully onboarded!`);
    console.log(`   You will earn 1% lifetime commission on their trading.`);
  }
}

function runTrack() {
  console.log('\n📊 TRACKING DASHBOARD\n');
  
  const trackingData = loadTrackingData();
  displayDashboard(trackingData);
  
  // Show projected earnings
  const projections = calculateProjectedEarnings(trackingData);
  console.log(`💰 Projected Earnings (assuming ${trackingData.activeAgents} active agents):`);
  console.log(`   Weekly:  ${projections.weekly.toFixed(2)} SOL`);
  console.log(`   Monthly: ${projections.monthly.toFixed(2)} SOL`);
  console.log(`   Yearly:  ${projections.yearly.toFixed(2)} SOL`);
}

async function runStart() {
  console.log('\n🚀 FULL RECRUITMENT LOOP\n');
  console.log('Starting agent discovery and onboarding...\n');
  
  // Discover
  const newAgents = await runDiscover();
  
  if (newAgents.length === 0) {
    console.log('\n✅ No new agents to onboard. Check back later!');
    return;
  }
  
  // Onboard
  console.log('\n' + '='.repeat(50));
  await runOnboard();
  
  // Show tracking
  console.log('\n' + '='.repeat(50));
  runTrack();
}

function showHelp() {
  console.log(`
📖 Commands:

   discover    - Scan for AI agents from various sources
   onboard     - Onboard discovered agents
   track       - Show tracking dashboard
   start       - Run full recruitment loop (discover + onboard + track)
   help        - Show this help message

🔧 Environment Variables:

   SOLANA_RPC_URL          - Solana RPC endpoint
   SOLANA_PRIVATE_KEY      - Your private key (for transactions)
   RECRUITER_AFFILIATE_CODE - Your affiliate code (default: RECRUITER)
   DRY_RUN                 - Set to 'true' to simulate

📝 Example:

   # Discover agents
   bun run src/index.ts discover
   
   # Onboard agents
   bun run src/index.ts onboard
   
   # Track progress
   bun run src/index.ts track
   
   # Full loop
   bun run src/index.ts start

🌐 Resources:

   MCP Server: npx @baozi.bet/mcp-server
   Docs: https://baozi.bet/skill
   Program: FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ

💡 The viral loop:

   1 agent recruits 10 agents/week
   × 5 SOL average volume per agent
   = 50 SOL new volume per week
   × 1% commission = 0.5 SOL/week passive income
   
   10 recruiter agents = 500 SOL/week! 🚀

`);
}

// Main execution
switch (command) {
  case 'discover':
    runDiscover();
    break;
  case 'onboard':
    runOnboard(args[1]);
    break;
  case 'track':
    runTrack();
    break;
  case 'start':
    runStart();
    break;
  case 'help':
  default:
    showHelp();
}
