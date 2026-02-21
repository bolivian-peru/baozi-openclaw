import type { DiscoveredAgent, DiscoverySource } from '../types.js';
import { BaoziMCPClient } from '../mcp/client.js';
import { discoverFromAgentBook } from './agentbook.js';
import {
  discoverFromGitHub,
  discoverFromElizaOS,
  discoverFromLangChain,
  discoverFromSolanaAgentKit,
  AGENT_DIRECTORIES,
} from './social.js';
import { classifyAgentType } from './classifier.js';

export { classifyAgentType } from './classifier.js';
export { AGENT_DIRECTORIES } from './social.js';

export interface DiscoveryOptions {
  sources?: DiscoverySource[];
  customQuery?: string;
  limit?: number;
}

/**
 * Run discovery across all configured sources.
 * Deduplicates by agent ID.
 */
export async function discoverAgents(
  client: BaoziMCPClient,
  options: DiscoveryOptions = {},
): Promise<DiscoveredAgent[]> {
  const sources = options.sources || [
    'agentbook',
    'github',
    'elizaos',
    'langchain',
    'solana-agent-kit',
  ];

  const allAgents: DiscoveredAgent[] = [];
  const seenIds = new Set<string>();

  const discoveryPromises: Array<Promise<DiscoveredAgent[]>> = [];

  if (sources.includes('agentbook')) {
    discoveryPromises.push(
      discoverFromAgentBook(client).catch(err => {
        console.warn('AgentBook discovery failed:', err.message);
        return [];
      }),
    );
  }

  if (sources.includes('github')) {
    const query = options.customQuery || 'AI agent autonomous trading solana';
    discoveryPromises.push(
      discoverFromGitHub(query, options.limit || 20).catch(err => {
        console.warn('GitHub discovery failed:', err.message);
        return [];
      }),
    );
  }

  if (sources.includes('elizaos')) {
    discoveryPromises.push(
      discoverFromElizaOS().catch(err => {
        console.warn('ElizaOS discovery failed:', err.message);
        return [];
      }),
    );
  }

  if (sources.includes('langchain')) {
    discoveryPromises.push(
      discoverFromLangChain().catch(err => {
        console.warn('LangChain discovery failed:', err.message);
        return [];
      }),
    );
  }

  if (sources.includes('solana-agent-kit')) {
    discoveryPromises.push(
      discoverFromSolanaAgentKit().catch(err => {
        console.warn('Solana Agent Kit discovery failed:', err.message);
        return [];
      }),
    );
  }

  const results = await Promise.all(discoveryPromises);

  for (const agents of results) {
    for (const agent of agents) {
      if (!seenIds.has(agent.id)) {
        seenIds.add(agent.id);
        allAgents.push(agent);
      }
    }
  }

  return allAgents;
}

/**
 * Create a manually-added agent for the recruiter to onboard
 */
export function createManualAgent(
  name: string,
  description: string,
  contactMethod: string,
  walletAddress?: string,
): DiscoveredAgent {
  return {
    id: `manual-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name,
    description,
    type: classifyAgentType(name, description),
    source: 'manual',
    walletAddress,
    contactMethod,
    discoveredAt: new Date().toISOString(),
    metadata: {},
  };
}
