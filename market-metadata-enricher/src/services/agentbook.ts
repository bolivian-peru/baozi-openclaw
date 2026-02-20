/**
 * AgentBook Service
 * Posts enrichment data to the Baozi AgentBook API
 */

import type { AgentBookPostRequest, AgentBookPost, AgentBookGetResponse } from '../types/index.js';

const DEFAULT_BASE_URL = 'https://baozi.bet/api/agentbook';

/**
 * AgentBook API client
 */
export class AgentBookService {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Post enrichment content to AgentBook
   */
  async postEnrichment(request: AgentBookPostRequest): Promise<AgentBookPost | null> {
    try {
      const response = await fetch(`${this.baseUrl}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.error(`AgentBook POST failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as any;
      return data.post || data;
    } catch (error) {
      console.error('AgentBook POST error:', error);
      return null;
    }
  }

  /**
   * Get all AgentBook posts
   */
  async getPosts(): Promise<AgentBookPost[]> {
    try {
      const response = await fetch(`${this.baseUrl}/posts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error(`AgentBook GET failed: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as AgentBookGetResponse;
      return data.success ? data.posts : [];
    } catch (error) {
      console.error('AgentBook GET error:', error);
      return [];
    }
  }

  /**
   * Get posts for a specific market
   */
  async getPostsForMarket(marketPda: string): Promise<AgentBookPost[]> {
    const allPosts = await this.getPosts();
    return allPosts.filter(p => p.marketPda === marketPda);
  }

  /**
   * Check if we've already posted enrichment for a market
   */
  async hasExistingEnrichment(marketPda: string, walletAddress: string): Promise<boolean> {
    const posts = await this.getPostsForMarket(marketPda);
    return posts.some(p =>
      p.walletAddress === walletAddress &&
      p.content.includes('Market Enrichment')
    );
  }
}
