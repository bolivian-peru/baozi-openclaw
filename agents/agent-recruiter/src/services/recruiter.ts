/**
 * Recruiter Service
 *
 * Orchestrates one full recruitment cycle:
 *   1. Ensure affiliate code is registered
 *   2. Discover agents on AgentBook
 *   3. Filter out already-contacted agents
 *   4. Post recruitment messages
 *   5. Persist records
 */
import { AgentBookScout } from './agentbook-scout.js';
import { AffiliateManager } from './affiliate-manager.js';
import { Messenger } from './messenger.js';
import { Store } from './store.js';
import type { RecruiterConfig, RecruitmentReport } from '../types/index.js';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class Recruiter {
  private scout: AgentBookScout;
  private affiliate: AffiliateManager;
  private messenger: Messenger;
  private store: Store;
  private config: RecruiterConfig;

  constructor(config: RecruiterConfig) {
    this.config = config;
    this.scout     = new AgentBookScout();
    this.affiliate = new AffiliateManager(config.affiliateCode, config.walletAddress);
    this.messenger = new Messenger(config.walletAddress, config.dryRun);
    this.store     = new Store(config.affiliateCode);
  }

  /** Run one full recruitment cycle. */
  async runCycle(): Promise<RecruitmentReport> {
    const report: RecruitmentReport = {
      timestamp: new Date().toISOString(),
      discovered: 0,
      alreadyContacted: 0,
      newlyContacted: 0,
      errors: 0,
      estimatedWeeklyCommissionSol: 0,
    };

    console.log('\n🤖 AGENT RECRUITER — Baozi.bet');
    console.log(`   Affiliate code: ${this.config.affiliateCode}`);
    console.log(`   Wallet: ${this.config.walletAddress.slice(0, 8)}...`);
    console.log(`   Dry-run: ${this.config.dryRun}\n`);

    // 1. Init affiliate (load MCP tools)
    await this.affiliate.init();
    const { exists } = await this.affiliate.checkCode();
    if (exists) {
      console.log(`✅ Affiliate code "${this.config.affiliateCode}" is registered on-chain`);
    } else {
      console.log(`⚠️  Affiliate code not yet registered. Build tx:`);
      const tx = await this.affiliate.buildRegistrationTx();
      if (tx) {
        console.log(`   Transaction built (sign + submit to activate): ${tx.slice(0, 40)}...`);
      } else {
        console.log(`   (MCP tools not available — add SOLANA_PRIVATE_KEY to register on-chain)`);
      }
    }

    // 2. Discover agents
    console.log('\n📡 Scanning AgentBook for active agents...');
    const agents = await this.scout.discoverAgents(200);
    report.discovered = agents.length;
    console.log(`   Found ${agents.length} unique wallets`);

    // 3. Filter already-contacted
    const newAgents = agents.filter(a => !this.store.isContacted(a.walletAddress));
    report.alreadyContacted = agents.length - newAgents.length;
    const targets = newAgents.slice(0, this.config.maxPerCycle);

    console.log(`   Already contacted: ${report.alreadyContacted} | New targets: ${targets.length}`);

    if (targets.length === 0) {
      console.log('\n✓ No new agents to contact this cycle.');
      this.store.markCycleComplete();
      return report;
    }

    // 4. Post broadcast recruitment message
    console.log('\n📢 Broadcasting recruitment post to AgentBook...');
    const posted = await this.messenger.broadcastRecruitment(this.config.affiliateCode);
    if (posted) {
      console.log('   ✅ Recruitment post sent');
    } else {
      console.log('   ⚠️  Post failed (check wallet address)');
      report.errors++;
    }

    // 5. Record targets as contacted
    for (const agent of targets) {
      this.store.record(agent.walletAddress, this.config.affiliateCode);
      report.newlyContacted++;
      console.log(`   → Recorded: ${agent.walletAddress.slice(0, 12)}... (posts: ${agent.postCount})`);
      await sleep(200);
    }

    this.store.markCycleComplete();

    // 6. Estimate commission
    const total = this.store.getTotalContacted();
    // Assume 20% activation rate × 2 SOL/week average volume × 1% commission
    report.estimatedWeeklyCommissionSol = total * 0.2 * 2 * 0.01;

    console.log(`\n📊 Cycle complete:`);
    console.log(`   Discovered: ${report.discovered} | New: ${report.newlyContacted} | Total ever: ${total}`);
    console.log(`   Est. weekly commission: ${report.estimatedWeeklyCommissionSol.toFixed(4)} SOL`);
    console.log(`   Onboarding guide: ${this.affiliate.formatOnboardingLink()}`);

    return report;
  }

  /** Print current recruitment status. */
  async showStatus(): Promise<void> {
    const records = this.store.getAll();
    const total   = this.store.getTotalContacted();
    console.log(`\n🤖 Agent Recruiter Status`);
    console.log(`   Affiliate code: ${this.config.affiliateCode}`);
    console.log(`   Total contacted: ${total}`);
    console.log(`   Last cycle: ${this.store.getLastCycle() ?? 'never'}`);
    if (records.length > 0) {
      console.log(`\n   Recent recruits:`);
      records.slice(-5).forEach(r => {
        console.log(`     ${r.walletAddress.slice(0, 16)}... [${r.status}] ${r.recruitedAt.slice(0, 10)}`);
      });
    }
    const estSol = total * 0.2 * 2 * 0.01;
    console.log(`\n   Est. weekly commission: ${estSol.toFixed(4)} SOL (at 20% activation, 2 SOL/wk avg)`);
  }
}
