import type { DiscoveredAgent } from '../types.js';
import { BaoziMCPClient } from '../mcp/client.js';
import { classifyAgentType } from './classifier.js';

/**
 * Discover agents from Baozi AgentBook via MCP handlers
 * 
 * Uses real @baozi.bet/mcp-server handlers to scan the AgentBook
 * for active agents that could benefit from prediction market trading.
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
