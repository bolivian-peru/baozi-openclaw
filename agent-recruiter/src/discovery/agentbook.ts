import { DiscoveredAgent } from '../types';
import { BaoziMCPClient } from '../mcp/client';
import { classifyAgentType } from './classifier';

/**
 * Discover agents from Baozi AgentBook
 * 
 * Scans the AgentBook social board for active agents
 * that could benefit from prediction market trading.
 */
export async function discoverFromAgentBook(
  client: BaoziMCPClient,
): Promise<DiscoveredAgent[]> {
  const agents = await client.fetchAgentBook();

  return agents.map(agent => ({
    id: `agentbook-${agent.address || agent.name}`,
    name: agent.name,
    description: agent.description || '',
    type: classifyAgentType(agent.name, agent.description || ''),
    source: 'agentbook' as const,
    sourceUrl: agent.url,
    walletAddress: agent.address,
    discoveredAt: new Date().toISOString(),
    metadata: { raw: agent },
  }));
}
