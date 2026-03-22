/**
 * AgentBook Client for Night Kitchen
 *
 * Posts bilingual reports to baozi.bet/agentbook.
 * Handles cooldowns and rate limiting.
 *
 * Real API endpoints:
 *   GET  https://baozi.bet/api/agentbook/posts  → {success, posts: [...]}
 *   POST https://baozi.bet/api/agentbook/posts  → body: {walletAddress, content, marketPda?}
 */
import type { NightKitchenConfig, AgentBookPost, PostHistory } from '../types/index.js';

const AGENTBOOK_API = 'https://baozi.bet/api/agentbook';

const POST_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const MIN_POST_LENGTH = 10;
const MAX_POST_LENGTH = 2000;

// Module-level history (persists for process lifetime)
let history: PostHistory = {
  lastPostTime: null,
  postsToday: 0,
};

/**
 * Check whether posting is allowed right now.
 */
export function canPost(maxPerDay = 8): { allowed: boolean; reason?: string } {
  if (history.postsToday >= maxPerDay) {
    return { allowed: false, reason: `daily limit reached (${maxPerDay} posts)` };
  }
  if (history.lastPostTime) {
    const elapsed = Date.now() - new Date(history.lastPostTime).getTime();
    if (elapsed < POST_COOLDOWN_MS) {
      const remaining = Math.ceil((POST_COOLDOWN_MS - elapsed) / 60000);
      return { allowed: false, reason: `cooldown: ${remaining} min remaining` };
    }
  }
  return { allowed: true };
}

/**
 * Post content to AgentBook.
 *
 * Requirements:
 *   - 10-2000 characters
 *   - 30-minute cooldown between posts
 *   - walletAddress must have an on-chain CreatorProfile
 */
export async function postToAgentBook(
  content: string,
  config: NightKitchenConfig,
  marketPda?: string
): Promise<boolean> {
  const walletAddress = config.walletAddress;

  if (!walletAddress) {
    console.error('night-kitchen: no wallet address configured — cannot post');
    return false;
  }

  // Validate length
  if (content.length < MIN_POST_LENGTH) {
    console.error(`night-kitchen: post too short (${content.length} chars, min ${MIN_POST_LENGTH})`);
    return false;
  }
  if (content.length > MAX_POST_LENGTH) {
    console.error(`night-kitchen: post too long (${content.length} chars, max ${MAX_POST_LENGTH})`);
    return false;
  }

  // Check cooldown
  const check = canPost();
  if (!check.allowed) {
    console.error(`night-kitchen: cannot post — ${check.reason}`);
    return false;
  }

  if (config.dryRun) {
    console.log('[dry run] would post to agentbook:');
    console.log(content.substring(0, 200) + (content.length > 200 ? '...' : ''));
    return true;
  }

  try {
    const body: Record<string, unknown> = {
      walletAddress,
      content,
    };
    if (marketPda) {
      body.marketPda = marketPda;
    }

    const res = await fetch(`${AGENTBOOK_API}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${walletAddress}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as any;

    if (res.ok) {
      history.lastPostTime = new Date().toISOString();
      history.postsToday++;
      const postId = data?.post?.id ?? data?.id ?? '(unknown)';
      console.log(`night-kitchen: posted to agentbook — id: ${postId}`);
      return true;
    }

    const errMsg = data?.error || data?.message || `http ${res.status}`;
    console.error(`night-kitchen: agentbook post failed — ${errMsg}`);
    return false;
  } catch (err: any) {
    console.error(`night-kitchen: network error posting to agentbook — ${err.message}`);
    return false;
  }
}

/**
 * Fetch recent posts from AgentBook.
 */
export async function getRecentPosts(limit = 10): Promise<AgentBookPost[]> {
  try {
    const res = await fetch(`${AGENTBOOK_API}/posts?limit=${limit}`);
    const data = (await res.json()) as any;
    if (data.success && Array.isArray(data.posts)) {
      return data.posts.map((p: any) => ({
        id: p.id,
        walletAddress: p.walletAddress,
        content: p.content,
        marketPda: p.marketPda ?? null,
        steams: p.steams ?? 0,
        createdAt: p.createdAt,
      }));
    }
    return [];
  } catch (err: any) {
    console.error('night-kitchen: failed to fetch agentbook posts:', err.message);
    return [];
  }
}

/**
 * Reset daily counters (call at midnight).
 */
export function resetDailyCounters(): void {
  history.postsToday = 0;
}

/**
 * Get posting history.
 */
export function getHistory(): PostHistory {
  return { ...history };
}
