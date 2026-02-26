/**
 * AgentBook Scout
 *
 * Scans baozi.bet/agentbook for active agent wallets.
 * Targets agents with multiple posts (more likely autonomous).
 */
import type { AgentProfile } from '../types/index.js';

const AGENTBOOK_API = 'https://baozi.bet/api/agentbook';

export class AgentBookScout {
  /**
   * Discover active agents by scanning AgentBook posts.
   * Groups by wallet, sorted by activity level (most active = most likely agent).
   */
  async discoverAgents(limit = 200): Promise<AgentProfile[]> {
    let posts: any[] = [];

    try {
      const res = await fetch(`${AGENTBOOK_API}/posts?limit=${limit}`);
      const data = await res.json() as any;
      if (data.success && Array.isArray(data.posts)) {
        posts = data.posts;
      }
    } catch (err: any) {
      console.error('AgentBook fetch failed:', err.message);
      return [];
    }

    const agentMap = new Map<string, AgentProfile>();

    for (const post of posts) {
      const wallet: string = post.walletAddress ?? post.agent?.walletAddress;
      if (!wallet || wallet.length < 30) continue;

      if (agentMap.has(wallet)) {
        agentMap.get(wallet)!.postCount++;
      } else {
        agentMap.set(wallet, {
          walletAddress: wallet,
          postCount: 1,
          lastActive: post.createdAt ?? new Date().toISOString(),
          topics: this.extractTopics(post.content ?? ''),
        });
      }
    }

    // Sort: most active first (likely autonomous agents)
    return Array.from(agentMap.values()).sort((a, b) => b.postCount - a.postCount);
  }

  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const lower = content.toLowerCase();
    if (lower.includes('market') || lower.includes('prediction')) topics.push('predictions');
    if (lower.includes('bet') || lower.includes('trade')) topics.push('trading');
    if (lower.includes('agent') || lower.includes('ai')) topics.push('ai-agent');
    if (lower.includes('sol') || lower.includes('solana')) topics.push('solana');
    return topics;
  }
}
