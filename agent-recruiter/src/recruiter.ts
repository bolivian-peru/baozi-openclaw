import { RecruiterConfig, DiscoveredAgent, RecruitedAgent, AgentType } from './types';
import { loadConfig, BAOZI } from './config';
import { BaoziMCPClient } from './mcp';
import { discoverAgents, createManualAgent, DiscoveryOptions } from './discovery';
import { initRecruitedAgent, generateOnboardingPackage, executeOnboardingFlow } from './onboarding';
import { generatePitch, generateAllPitches, listPitchTypes } from './outreach';
import { TrackingStore, formatDashboard, formatAgentProfile } from './tracking';

/**
 * Agent Recruiter
 * 
 * The core recruiter agent that discovers, onboards, and tracks
 * AI agents to trade on Baozi prediction markets.
 * 
 * Architecture:
 *   Recruiter (has affiliate code)
 *     ├── Discovery → finds agents via AgentBook, GitHub, social
 *     ├── Outreach → generates tailored pitches
 *     ├── Onboarding → guides through setup flow
 *     └── Tracking → monitors recruited agents
 */
export class AgentRecruiter {
  readonly config: RecruiterConfig;
  readonly client: BaoziMCPClient;
  readonly store: TrackingStore;

  constructor(configOverrides: Partial<RecruiterConfig> = {}) {
    this.config = loadConfig(configOverrides);
    this.client = new BaoziMCPClient();
    this.store = new TrackingStore(this.config.dataDir);
  }

  // ─── DISCOVERY ──────────────────────────────────────────────

  /**
   * Run discovery across all sources, return new (unknown) agents
   */
  async discover(options?: DiscoveryOptions): Promise<DiscoveredAgent[]> {
    const allAgents = await discoverAgents(this.client, options);

    // Filter out already-known agents
    const newAgents = allAgents.filter(a => !this.store.isKnown(a.id));

    return newAgents;
  }

  /**
   * Manually add an agent to track
   */
  addAgent(
    name: string,
    description: string,
    contactMethod: string,
    walletAddress?: string,
  ): RecruitedAgent {
    const discovered = createManualAgent(name, description, contactMethod, walletAddress);
    const recruited = initRecruitedAgent(discovered);
    this.store.upsert(recruited);
    return recruited;
  }

  // ─── OUTREACH ───────────────────────────────────────────────

  /**
   * Generate a pitch for a specific agent
   */
  generatePitch(agentType: AgentType, variant?: string) {
    return generatePitch(agentType, this.config.affiliateCode, variant);
  }

  /**
   * Generate all pitch variations (for demo/showcase)
   */
  generateAllPitches() {
    return generateAllPitches(this.config.affiliateCode);
  }

  /**
   * List available pitch types
   */
  listPitchTypes() {
    return listPitchTypes();
  }

  // ─── ONBOARDING ─────────────────────────────────────────────

  /**
   * Generate a complete onboarding package for an agent
   */
  getOnboardingPackage(agent: DiscoveredAgent) {
    return generateOnboardingPackage(agent, this.config, this.client);
  }

  /**
   * Onboard a discovered agent (full flow)
   */
  async onboard(
    agent: DiscoveredAgent,
    callbacks?: {
      onStepStart?: (step: string, agent: RecruitedAgent) => void;
      onStepComplete?: (step: string, agent: RecruitedAgent) => void;
      onError?: (step: string, error: Error, agent: RecruitedAgent) => void;
    },
  ): Promise<RecruitedAgent> {
    const recruited = initRecruitedAgent(agent);

    // Run onboarding flow
    const result = await executeOnboardingFlow(
      recruited,
      this.config,
      this.client,
      callbacks,
    );

    // Persist
    this.store.upsert(result);

    return result;
  }

  /**
   * Onboard a batch of agents
   */
  async onboardBatch(
    agents: DiscoveredAgent[],
    callbacks?: {
      onAgentStart?: (agent: DiscoveredAgent, index: number) => void;
      onAgentComplete?: (agent: RecruitedAgent, index: number) => void;
    },
  ): Promise<RecruitedAgent[]> {
    const results: RecruitedAgent[] = [];

    // Process in batches to respect rate limits
    const batchSize = this.config.maxConcurrentOnboards;

    for (let i = 0; i < agents.length; i += batchSize) {
      const batch = agents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (agent, idx) => {
          callbacks?.onAgentStart?.(agent, i + idx);
          const result = await this.onboard(agent);
          callbacks?.onAgentComplete?.(result, i + idx);
          return result;
        }),
      );
      results.push(...batchResults);
    }

    return results;
  }

  // ─── TRACKING ───────────────────────────────────────────────

  /**
   * Get the tracking dashboard
   */
  getDashboard(): string {
    const stats = this.store.getStats();
    return formatDashboard(stats);
  }

  /**
   * Get stats
   */
  getStats() {
    return this.store.getStats();
  }

  /**
   * Get all recruited agents
   */
  getRecruitedAgents(): RecruitedAgent[] {
    return this.store.getAll();
  }

  /**
   * Get a specific agent's profile
   */
  getAgentProfile(id: string): string | null {
    const agent = this.store.get(id);
    return agent ? formatAgentProfile(agent) : null;
  }

  /**
   * Record a bet for a recruited agent
   */
  recordBet(agentId: string, amount: number, txSignature?: string): void {
    this.store.recordBet(agentId, amount, txSignature);
  }

  /**
   * Export all data
   */
  exportData(): string {
    return this.store.export();
  }

  // ─── MARKETS ────────────────────────────────────────────────

  /**
   * List active markets (useful for onboarding demos)
   */
  async listMarkets(limit: number = 10) {
    return this.client.listMarkets({ status: 'active', limit });
  }

  /**
   * Get affiliate link
   */
  getAffiliateLink(): string {
    return this.client.formatAffiliateLink(this.config.affiliateCode);
  }

  /**
   * Get MCP setup instructions
   */
  getSetupInstructions(): string {
    return this.client.generateSetupInstructions(this.config.affiliateCode);
  }
}
