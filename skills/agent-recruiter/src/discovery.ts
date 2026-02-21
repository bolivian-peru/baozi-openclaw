/**
 * Agent Discovery — finds agents to recruit from multiple sources.
 *
 * Primary source: AgentNet (real network with 48+ registered agents)
 * Secondary: can be extended with ElizaOS registry, Twitter API, etc.
 */

import * as db from './db.js';
import { getPitchForAgent } from './templates.js';
import type { RecruitedAgent } from './types.js';

const AGENTNET_URL = process.env.AGENTNET_URL || 'http://localhost:8420';

interface AgentNetAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  platform: string;
  endpoint: string;
}

// --- AgentNet Discovery ---

export async function discoverFromAgentNet(limit = 50): Promise<RecruitedAgent[]> {
  const res = await fetch(`${AGENTNET_URL}/agents/search?limit=${limit}`);
  if (!res.ok) throw new Error(`AgentNet search failed: ${res.status}`);

  const agents: AgentNetAgent[] = await res.json();
  const recruited: RecruitedAgent[] = [];

  for (const agent of agents) {
    const pitch = getPitchForAgent(agent.capabilities || []);
    const recruit = db.addRecruit(
      agent.id,
      agent.name,
      'agentnet',
      agent.endpoint || '',
      pitch.id,
    );
    recruited.push(recruit);
  }

  return recruited;
}

// --- Manual Discovery ---

export function discoverManual(
  agentId: string, name: string, platform: string,
  endpoint: string, pitchType = 'general'
): RecruitedAgent {
  return db.addRecruit(agentId, name, platform, endpoint, pitchType);
}

// --- Discovery Stats ---

export function getDiscoveryStats() {
  const all = db.listRecruits();
  const byPlatform: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const r of all) {
    byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }

  return {
    total: all.length,
    byPlatform,
    byStatus,
  };
}
