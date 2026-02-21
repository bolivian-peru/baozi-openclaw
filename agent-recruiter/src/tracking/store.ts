import * as fs from 'fs';
import * as path from 'path';
import type {
  RecruitedAgent,
  RecruiterStats,
  DiscoveredAgent,
  DiscoverySource,
  OnboardingStatus,
} from '../types.js';

/**
 * Persistent store for recruited agents and tracking data.
 * 
 * Uses a simple JSON file for storage.
 * In production, this could be backed by a database.
 */
export class TrackingStore {
  private dataFile: string;
  private agents: Map<string, RecruitedAgent>;

  constructor(dataDir: string) {
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dataFile = path.join(dataDir, 'recruited-agents.json');
    this.agents = new Map();
    this.load();
  }

  /**
   * Load agents from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        for (const agent of data.agents || []) {
          this.agents.set(agent.id, agent);
        }
      }
    } catch (err) {
      console.warn('Failed to load tracking data:', (err as Error).message);
    }
  }

  /**
   * Save agents to disk
   */
  private save(): void {
    try {
      const data = {
        version: 1,
        updatedAt: new Date().toISOString(),
        agents: Array.from(this.agents.values()),
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn('Failed to save tracking data:', (err as Error).message);
    }
  }

  /**
   * Add or update a recruited agent
   */
  upsert(agent: RecruitedAgent): void {
    this.agents.set(agent.id, agent);
    this.save();
  }

  /**
   * Get a specific agent by ID
   */
  get(id: string): RecruitedAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all recruited agents
   */
  getAll(): RecruitedAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by status
   */
  getByStatus(status: OnboardingStatus): RecruitedAgent[] {
    return this.getAll().filter(a => a.status === status);
  }

  /**
   * Get agents by source
   */
  getBySource(source: DiscoverySource): RecruitedAgent[] {
    return this.getAll().filter(a => a.source === source);
  }

  /**
   * Check if an agent (by source ID) is already tracked
   */
  isKnown(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * Update agent status
   */
  updateStatus(id: string, status: OnboardingStatus, note?: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = status;
      agent.lastActivityAt = new Date().toISOString();
      if (note) agent.notes.push(note);
      this.save();
    }
  }

  /**
   * Record a bet for a recruited agent
   */
  recordBet(id: string, amount: number, txSignature?: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.totalBets += 1;
      agent.totalVolume += amount;
      agent.estimatedEarnings += amount * 0.01; // 1% affiliate
      agent.lastActivityAt = new Date().toISOString();
      if (txSignature) {
        agent.notes.push(`Bet: ${amount} SOL (tx: ${txSignature})`);
      }
      this.save();
    }
  }

  /**
   * Compute aggregate stats across all recruited agents
   */
  getStats(): RecruiterStats {
    const all = this.getAll();

    const bySource: Record<DiscoverySource, number> = {
      agentbook: 0, twitter: 0, github: 0,
      elizaos: 0, langchain: 0, 'solana-agent-kit': 0, manual: 0,
    };

    const byStatus: Record<OnboardingStatus, number> = {
      discovered: 0, contacted: 0, onboarding: 0,
      'profile-created': 0, 'affiliate-registered': 0,
      'first-bet-placed': 0, active: 0, inactive: 0, failed: 0,
    };

    let combinedVolume = 0;
    let estimatedEarnings = 0;

    for (const agent of all) {
      bySource[agent.source] = (bySource[agent.source] || 0) + 1;
      byStatus[agent.status] = (byStatus[agent.status] || 0) + 1;
      combinedVolume += agent.totalVolume;
      estimatedEarnings += agent.estimatedEarnings;
    }

    // Top recruits by volume
    const topRecruits = [...all]
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 10);

    return {
      totalDiscovered: all.length,
      totalContacted: all.filter(a => a.status !== 'discovered').length,
      totalOnboarded: all.filter(a =>
        ['first-bet-placed', 'active'].includes(a.status),
      ).length,
      totalActive: all.filter(a => a.status === 'active').length,
      combinedVolume,
      estimatedEarnings,
      topRecruits,
      bySource,
      byStatus,
    };
  }

  /**
   * Export all data as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        stats: this.getStats(),
        agents: this.getAll(),
      },
      null,
      2,
    );
  }

  /**
   * Get the count of agents
   */
  get count(): number {
    return this.agents.size;
  }
}
