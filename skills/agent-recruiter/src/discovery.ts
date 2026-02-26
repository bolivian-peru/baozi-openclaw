/**
 * Agent Discovery — Find AI agents that could benefit from Baozi prediction markets
 *
 * Sources:
 * 1. Baozi AgentBook — agents already posting on Baozi social graph
 * 2. GitHub bounty commenters — devs engaged with Baozi ecosystem
 * 3. Known agent framework seeds — ElizaOS, LangChain, Solana Agent Kit
 */

import axios from 'axios';
import { config } from './config';
import { upsertAgent } from './tracker';

export interface DiscoveredAgent {
  id: string;
  source: string;
  handle: string;
  description: string;
  persona: 'crypto' | 'trading' | 'social' | 'general';
}

// Classify agent persona based on description keywords
function classifyPersona(text: string): 'crypto' | 'trading' | 'social' | 'general' {
  const lower = text.toLowerCase();
  if (lower.includes('trade') || lower.includes('trading') || lower.includes('bot') || lower.includes('quant')) {
    return 'trading';
  }
  if (lower.includes('crypto') || lower.includes('defi') || lower.includes('solana') || lower.includes('nft') || lower.includes('web3')) {
    return 'crypto';
  }
  if (lower.includes('social') || lower.includes('tweet') || lower.includes('content') || lower.includes('community')) {
    return 'social';
  }
  return 'general';
}

// Source 1: Baozi AgentBook posts
export async function discoverFromAgentBook(limit = 30): Promise<DiscoveredAgent[]> {
  const agents: DiscoveredAgent[] = [];

  try {
    const res = await axios.get<{
      posts?: Array<{ walletAddress?: string; content?: string; author?: string; id?: string }>;
    }>(
      `${config.agentBookApi}/posts?limit=${limit}`,
      { timeout: 10000 }
    );

    const posts = res.data?.posts || (Array.isArray(res.data) ? res.data : []);
    const seen = new Set<string>();

    for (const post of posts as Array<{ walletAddress?: string; content?: string; author?: string; id?: string }>) {
      const wallet = post.walletAddress || post.author || '';
      if (!wallet || seen.has(wallet)) continue;
      seen.add(wallet);

      const content = post.content || '';
      const shortWallet = wallet.slice(0, 8);

      agents.push({
        id: `agentbook:${wallet}`,
        source: 'agentbook',
        handle: shortWallet,
        description: content.slice(0, 200),
        persona: classifyPersona(content),
      });
    }
  } catch (err) {
    console.warn(`AgentBook discovery failed: ${(err as Error).message}`);
  }

  return agents;
}

// Source 2: GitHub bounty issue commenters on baozi-openclaw
export async function discoverFromGitHub(): Promise<DiscoveredAgent[]> {
  const agents: DiscoveredAgent[] = [];
  const issues = [39, 40, 41]; // Active bounties
  const seen = new Set<string>();

  for (const issueNum of issues) {
    try {
      const res = await axios.get<Array<{ user: { login: string }; body: string }>>(
        `https://api.github.com/repos/bolivian-peru/baozi-openclaw/issues/${issueNum}/comments`,
        {
          timeout: 10000,
          headers: { Accept: 'application/vnd.github.v3+json' },
        }
      );

      for (const comment of res.data || []) {
        const login = comment.user?.login || '';
        if (!login || seen.has(login) || login === 'aurora-ai' || login === 'TheAuroraAI') continue;
        seen.add(login);

        const body = comment.body || '';
        agents.push({
          id: `github:${login}`,
          source: `github-issue-${issueNum}`,
          handle: `@${login}`,
          description: body.slice(0, 200),
          persona: classifyPersona(body),
        });
      }
    } catch {
      // Skip failed requests
    }
  }

  return agents;
}

// Source 3: Curated agent framework seeds
export function getFrameworkSeeds(): DiscoveredAgent[] {
  return [
    {
      id: 'seed:elizaos-agents',
      source: 'framework-seed',
      handle: 'ElizaOS Ecosystem',
      description: 'AI agents built on ElizaOS framework — multi-modal, crypto-native',
      persona: 'crypto',
    },
    {
      id: 'seed:langchain-trading',
      source: 'framework-seed',
      handle: 'LangChain Trading Bots',
      description: 'Autonomous trading bots built with LangChain/LangGraph',
      persona: 'trading',
    },
    {
      id: 'seed:solana-agent-kit',
      source: 'framework-seed',
      handle: 'Solana Agent Kit',
      description: 'AI agents with native Solana capabilities',
      persona: 'crypto',
    },
    {
      id: 'seed:baozi-creator-ecosystem',
      source: 'framework-seed',
      handle: 'Baozi Creator Network',
      description: 'Active market creators on Baozi seeking monetization',
      persona: 'crypto',
    },
    {
      id: 'seed:clawgig-agents',
      source: 'framework-seed',
      handle: 'ClawGig AI Agents',
      description: 'Freelance AI agents on ClawGig marketplace',
      persona: 'general',
    },
    {
      id: 'seed:agentpact-agents',
      source: 'framework-seed',
      handle: 'AgentPact Sellers',
      description: 'AI agents on AgentPact offering data and analysis services',
      persona: 'general',
    },
  ];
}

// Run full discovery pipeline
export async function runDiscovery(limit = 30): Promise<{
  total: number;
  bySource: Record<string, number>;
  agents: DiscoveredAgent[];
}> {
  console.log('\n🔍 Running agent discovery pipeline...\n');

  const [agentBookAgents, githubAgents] = await Promise.all([
    discoverFromAgentBook(limit),
    discoverFromGitHub(),
  ]);

  const seeds = getFrameworkSeeds();
  const all = [...agentBookAgents, ...githubAgents, ...seeds];

  // Deduplicate by ID
  const seen = new Set<string>();
  const unique: DiscoveredAgent[] = [];
  for (const a of all) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      unique.push(a);
    }
  }

  // Persist to tracker
  for (const agent of unique) {
    upsertAgent({
      id: agent.id,
      source: agent.source,
      handle: agent.handle,
      description: agent.description,
      persona: agent.persona,
    });
  }

  const bySource: Record<string, number> = {};
  for (const a of unique) {
    bySource[a.source] = (bySource[a.source] || 0) + 1;
  }

  console.log(`✅ Discovered ${unique.length} agents:`);
  for (const [src, count] of Object.entries(bySource)) {
    console.log(`   ${src}: ${count}`);
  }

  return { total: unique.length, bySource, agents: unique };
}
