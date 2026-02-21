#!/usr/bin/env node

import { Command } from 'commander';
import { AgentRecruiter } from './recruiter.js';
import { PROGRAM_ID, NETWORK } from './mcp/index.js';
import type { AgentType } from './types.js';

const program = new Command();

program
  .name('baozi-recruiter')
  .description('🥟 Baozi Agent Recruiter — AI that onboards other agents to trade (powered by @baozi.bet/mcp-server)')
  .version('2.0.0');

// ─── DISCOVER ──────────────────────────────────────────────────

program
  .command('discover')
  .description('Discover new AI agents across all sources')
  .option('-s, --sources <sources>', 'Comma-separated discovery sources', 'agentbook,github')
  .option('-q, --query <query>', 'Custom search query for GitHub discovery')
  .option('-l, --limit <limit>', 'Max agents per source', '20')
  .action(async (opts) => {
    const recruiter = new AgentRecruiter();
    console.log('\n🔍 Discovering agents...');
    console.log(`   Network: ${String(NETWORK)} | Program: ${String(PROGRAM_ID)}\n`);

    const sources = opts.sources.split(',').map((s: string) => s.trim());
    const agents = await recruiter.discover({
      sources,
      customQuery: opts.query,
      limit: parseInt(opts.limit, 10),
    });

    if (agents.length === 0) {
      console.log('No new agents discovered. Try different sources or queries.\n');
      return;
    }

    console.log(`Found ${agents.length} new agents:\n`);
    for (const agent of agents) {
      console.log(`  [${agent.source}] ${agent.name}`);
      console.log(`    Type: ${agent.type}`);
      console.log(`    ${agent.description?.slice(0, 80) || 'No description'}`);
      if (agent.sourceUrl) {
        console.log(`    URL: ${agent.sourceUrl}`);
      }
      console.log('');
    }
  });

// ─── PITCH ─────────────────────────────────────────────────────

program
  .command('pitch')
  .description('Generate outreach pitches for different agent types')
  .option('-t, --type <type>', 'Agent type (crypto-analyst, trading-bot, social-agent, general-purpose, defi-agent, research-agent)')
  .option('-v, --variant <variant>', 'Specific pitch variant')
  .option('-a, --all', 'Show all pitch variants for all types')
  .option('-c, --code <code>', 'Affiliate code to use', process.env.RECRUITER_AFFILIATE_CODE || 'RECRUITER')
  .action((opts) => {
    const recruiter = new AgentRecruiter({ affiliateCode: opts.code });

    if (opts.all) {
      const pitches = recruiter.generateAllPitches();
      for (const pitch of pitches) {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`Target: ${pitch.targetType} | Variant: ${pitch.variant}`);
        console.log('═'.repeat(60));
        console.log(`Subject: ${pitch.subject}\n`);
        console.log(pitch.body);
        console.log(`\nAffiliate Link: ${pitch.affiliateLink}`);
      }
      console.log(`\nTotal: ${pitches.length} pitch variants across ${recruiter.listPitchTypes().length} agent types`);
      return;
    }

    const agentType = (opts.type || 'general-purpose') as AgentType;
    const pitch = recruiter.generatePitch(agentType, opts.variant);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`Target: ${pitch.targetType} | Variant: ${pitch.variant}`);
    console.log('═'.repeat(60));
    console.log(`Subject: ${pitch.subject}\n`);
    console.log(pitch.body);
    console.log(`\nAffiliate Link: ${pitch.affiliateLink}`);
  });

// ─── ONBOARD ───────────────────────────────────────────────────

program
  .command('onboard')
  .description('Onboard a new agent to Baozi (uses real MCP handlers)')
  .requiredOption('-n, --name <name>', 'Agent name')
  .option('-d, --description <desc>', 'Agent description', '')
  .option('-w, --wallet <wallet>', 'Agent wallet address')
  .option('-m, --contact <method>', 'Contact method (e.g., twitter:@handle, github:owner/repo)', 'direct')
  .option('--dry-run', 'Simulate onboarding without executing')
  .action(async (opts) => {
    const recruiter = new AgentRecruiter({ dryRun: opts.dryRun });

    console.log(`\n🥟 Onboarding agent: ${opts.name}`);
    console.log(`   Network: ${String(NETWORK)} | Program: ${String(PROGRAM_ID)}\n`);

    // Add the agent
    const recruited = recruiter.addAgent(
      opts.name,
      opts.description,
      opts.contact,
      opts.wallet,
    );

    // Run onboarding flow
    const result = await recruiter.onboard(recruited, {
      onStepStart: (step) => {
        process.stdout.write(`  ⏳ ${step}...`);
      },
      onStepComplete: (step) => {
        console.log(' ✅');
      },
      onError: (step, error) => {
        console.log(` ❌ ${error.message}`);
      },
    });

    console.log(`\nStatus: ${result.status}`);

    // Show the onboarding package
    const pkg = recruiter.getOnboardingPackage(recruited);
    console.log('\n--- Quick Start Message ---');
    console.log(pkg.quickStartMessage);
    console.log('\n--- Onboarding Steps ---');
    for (const step of pkg.onboardingSteps) {
      console.log(`  ${step.step}. [${step.tool}] ${step.description}`);
    }
    console.log('');
  });

// ─── DASHBOARD ─────────────────────────────────────────────────

program
  .command('dashboard')
  .description('Show the recruiter tracking dashboard')
  .option('-j, --json', 'Output as JSON')
  .action((opts) => {
    const recruiter = new AgentRecruiter();

    if (opts.json) {
      console.log(recruiter.exportData());
      return;
    }

    console.log(recruiter.getDashboard());
  });

// ─── LIST ──────────────────────────────────────────────────────

program
  .command('list')
  .description('List all recruited agents')
  .option('-s, --status <status>', 'Filter by status')
  .action((opts) => {
    const recruiter = new AgentRecruiter();
    let agents = recruiter.getRecruitedAgents();

    if (opts.status) {
      agents = agents.filter(a => a.status === opts.status);
    }

    if (agents.length === 0) {
      console.log('\nNo recruited agents yet. Run `discover` then `onboard` to get started.\n');
      return;
    }

    console.log(`\n📋 Recruited Agents (${agents.length}):\n`);
    for (const agent of agents) {
      const status = agent.status.toUpperCase();
      const vol = agent.totalVolume.toFixed(2);
      console.log(`  [${status}] ${agent.name} (${agent.type})`);
      console.log(`    Source: ${agent.source} | Volume: ${vol} SOL | Bets: ${agent.totalBets}`);
      if (agent.affiliateCode) {
        console.log(`    Affiliate Code: ${agent.affiliateCode}`);
      }
      console.log('');
    }
  });

// ─── MARKETS ───────────────────────────────────────────────────

program
  .command('markets')
  .description('List active Baozi prediction markets (LIVE from Solana mainnet)')
  .option('-l, --limit <limit>', 'Number of markets to show', '10')
  .action(async (opts) => {
    const recruiter = new AgentRecruiter();
    console.log('\n📊 Fetching active markets from Solana mainnet...');
    console.log(`   Network: ${String(NETWORK)} | Program: ${String(PROGRAM_ID)}\n`);

    const markets = await recruiter.listMarkets(parseInt(opts.limit, 10));

    if (markets.length === 0) {
      console.log('No markets found.\n');
      return;
    }

    for (const market of markets) {
      console.log(`  [${market.status}] ${market.title}`);
      if (market.totalPool !== undefined) {
        console.log(`    Pool: ${market.totalPool.toFixed(4)} SOL`);
      }
      console.log(`    PDA: ${market.id}`);
      console.log('');
    }
    console.log(`Total: ${markets.length} active markets\n`);
  });

// ─── SETUP ─────────────────────────────────────────────────────

program
  .command('setup')
  .description('Show MCP setup instructions for new agents')
  .option('-c, --code <code>', 'Affiliate code', process.env.RECRUITER_AFFILIATE_CODE || 'RECRUITER')
  .action((opts) => {
    const recruiter = new AgentRecruiter({ affiliateCode: opts.code });
    console.log(recruiter.getSetupInstructions());
    console.log(`\nAffiliate Link: ${recruiter.getAffiliateLink()}`);
  });

// ─── DEMO ──────────────────────────────────────────────────────

program
  .command('demo')
  .description('Run a full demo: discover → pitch → onboard → dashboard (with LIVE market data)')
  .option('-c, --code <code>', 'Affiliate code', process.env.RECRUITER_AFFILIATE_CODE || 'RECRUITER')
  .action(async (opts) => {
    const recruiter = new AgentRecruiter({
      affiliateCode: opts.code,
      dryRun: false, // Use real MCP handlers
    });

    console.log('\n🥟 BAOZI AGENT RECRUITER — FULL DEMO');
    console.log(`   Network: ${String(NETWORK)} | Program: ${String(PROGRAM_ID)}`);
    console.log('═'.repeat(60));

    // Step 1: Show live markets
    console.log('\n📊 STEP 1: LIVE MARKETS FROM SOLANA MAINNET\n');
    const markets = await recruiter.listMarkets(5);
    if (markets.length > 0) {
      for (const m of markets) {
        console.log(`  • ${m.title}`);
        console.log(`    Pool: ${m.totalPool?.toFixed(4)} SOL | Status: ${m.status}`);
      }
    } else {
      console.log('  (No active markets found)');
    }

    // Step 2: Discovery
    console.log('\n' + '═'.repeat(60));
    console.log('\n📡 STEP 2: AGENT DISCOVERY\n');
    console.log('Scanning GitHub for AI agent projects...\n');

    const discovered = await recruiter.discover({
      sources: ['github'],
      customQuery: 'AI agent autonomous',
      limit: 5,
    });

    console.log(`Found ${discovered.length} potential agents to recruit.\n`);

    // Step 3: Pitch generation
    console.log('═'.repeat(60));
    console.log('\n📨 STEP 3: OUTREACH PITCHES\n');

    const types = recruiter.listPitchTypes();
    console.log(`Available pitch types: ${types.map(t => `${t.type} (${t.variants} variants)`).join(', ')}\n`);

    const samplePitch = recruiter.generatePitch('trading-bot');
    console.log(`Sample pitch for trading bots:\n`);
    console.log(`  Subject: ${samplePitch.subject}`);
    console.log(`  Variant: ${samplePitch.variant}`);
    console.log(`  Link: ${samplePitch.affiliateLink}\n`);

    // Step 4: Onboarding with real MCP
    console.log('═'.repeat(60));
    console.log('\n🚀 STEP 4: AGENT ONBOARDING (REAL MCP HANDLERS)\n');

    const demoAgent = recruiter.addAgent(
      'DemoTrader',
      'A demo trading bot for showcase purposes',
      'github:demo/trader',
    );

    console.log(`Onboarding: ${demoAgent.name}\n`);

    const result = await recruiter.onboard(demoAgent, {
      onStepStart: (step) => {
        process.stdout.write(`  ⏳ ${step}...`);
      },
      onStepComplete: (step) => {
        console.log(' ✅');
      },
    });

    console.log(`\nFinal status: ${result.status}`);
    console.log('Notes:');
    for (const note of result.notes) {
      console.log(`  • ${note}`);
    }

    // Simulate some activity
    recruiter.recordBet(result.id, 2.5);
    recruiter.recordBet(result.id, 1.0);
    recruiter.recordBet(result.id, 5.0);

    // Step 5: Dashboard
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 STEP 5: TRACKING DASHBOARD\n');
    console.log(recruiter.getDashboard());

    // Show affiliate link
    console.log(`\n🔗 Recruiter Affiliate Link: ${recruiter.getAffiliateLink()}`);
    console.log(`\nAll recruited agents earn the recruiter 1% lifetime commission.`);
    console.log('═'.repeat(60));
  });

program.parse();
