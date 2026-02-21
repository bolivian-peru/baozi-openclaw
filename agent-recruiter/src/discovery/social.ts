import type { DiscoveredAgent } from '../types.js';
import { classifyAgentType } from './classifier.js';

/**
 * Social platform discovery sources
 * 
 * Scans public agent directories and frameworks
 * for AI agents that could benefit from prediction markets.
 */

/**
 * Discover agents from GitHub — search for repos related to AI agents
 * that could integrate with prediction markets
 */
export async function discoverFromGitHub(
  query: string = 'AI agent solana trading',
  limit: number = 20,
): Promise<DiscoveredAgent[]> {
  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&per_page=${limit}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'BaoziAgentRecruiter/2.0',
          ...(process.env.GITHUB_TOKEN
            ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!res.ok) {
      console.warn(`GitHub search returned ${res.status}`);
      return [];
    }

    const data = await res.json() as any;
    const repos = data.items || [];

    return repos.map((repo: any) => ({
      id: `github-${repo.full_name}`,
      name: repo.name,
      description: repo.description || '',
      type: classifyAgentType(repo.name, repo.description || ''),
      source: 'github' as const,
      sourceUrl: repo.html_url,
      discoveredAt: new Date().toISOString(),
      metadata: {
        stars: repo.stargazers_count,
        language: repo.language,
        owner: repo.owner?.login,
        updatedAt: repo.updated_at,
      },
    }));
  } catch (err) {
    console.warn('Failed to search GitHub:', (err as Error).message);
    return [];
  }
}

/**
 * Discover agents from ElizaOS ecosystem
 */
export async function discoverFromElizaOS(): Promise<DiscoveredAgent[]> {
  return discoverFromGitHub('elizaos agent plugin', 15);
}

/**
 * Discover agents from LangChain ecosystem
 */
export async function discoverFromLangChain(): Promise<DiscoveredAgent[]> {
  return discoverFromGitHub('langchain agent tool solana', 15);
}

/**
 * Discover agents from Solana Agent Kit
 */
export async function discoverFromSolanaAgentKit(): Promise<DiscoveredAgent[]> {
  return discoverFromGitHub('solana-agent-kit agent', 15);
}

/**
 * Well-known agent directories to scan
 */
export const AGENT_DIRECTORIES = [
  {
    name: 'ElizaOS',
    url: 'https://github.com/elizaOS',
    description: 'Open-source AI agent framework with plugin system',
    discoveryMethod: 'github-org',
  },
  {
    name: 'LangChain Agents',
    url: 'https://github.com/langchain-ai',
    description: 'LangChain-based agent implementations',
    discoveryMethod: 'github-org',
  },
  {
    name: 'Solana Agent Kit',
    url: 'https://github.com/sendaifun/solana-agent-kit',
    description: 'Toolkit for building AI agents on Solana',
    discoveryMethod: 'github-repo',
  },
  {
    name: 'Baozi AgentBook',
    url: 'https://baozi.bet/agentbook',
    description: 'Baozi native agent social board',
    discoveryMethod: 'api',
  },
  {
    name: 'Baozi Creator Directory',
    url: 'https://baozi.bet/creator',
    description: 'Baozi market creators',
    discoveryMethod: 'api',
  },
];
