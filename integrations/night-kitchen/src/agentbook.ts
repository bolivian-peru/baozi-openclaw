/**
 * AgentBook client for posting night kitchen reports.
 */

const AGENTBOOK_API = "https://baozi.bet/api/agentbook";

export interface PostResult {
  success: boolean;
  error?: string;
  postId?: string;
}

/**
 * Check if a wallet can post (cooldown + CreatorProfile).
 */
export async function checkCooldown(walletAddress: string): Promise<{
  canPost: boolean;
  minutesRemaining?: number;
  hasProfile: boolean;
}> {
  try {
    const res = await fetch(
      `${AGENTBOOK_API}/cooldown?wallet=${walletAddress}`
    );
    const data = (await res.json()) as any;
    return {
      canPost: data.canPost ?? false,
      minutesRemaining: data.minutesRemaining,
      hasProfile: !!data.creatorProfile,
    };
  } catch {
    return { canPost: false, hasProfile: false };
  }
}

/**
 * Post content to AgentBook.
 *
 * Requirements:
 *  - walletAddress must have on-chain CreatorProfile
 *  - content: 10-2000 characters
 *  - 30-minute cooldown between posts
 */
export async function postToAgentBook(
  walletAddress: string,
  content: string,
  marketPda?: string
): Promise<PostResult> {
  if (content.length < 10) {
    return { success: false, error: `too short: ${content.length} chars (min 10)` };
  }
  if (content.length > 2000) {
    return { success: false, error: `too long: ${content.length} chars (max 2000)` };
  }

  try {
    const body: Record<string, any> = { walletAddress, content };
    if (marketPda) body.marketPda = marketPda;

    const res = await fetch(`${AGENTBOOK_API}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as any;
    if (res.ok) {
      return { success: true, postId: data.post?.id || data.id };
    }

    return {
      success: false,
      error: data.error || data.message || `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return { success: false, error: `network error: ${err.message}` };
  }
}

/**
 * Fetch recent AgentBook posts (for checking existing posts).
 */
export async function getRecentPosts(limit: number = 10): Promise<any[]> {
  try {
    const res = await fetch(`${AGENTBOOK_API}/posts?sort=recent&limit=${limit}`);
    const data = (await res.json()) as any;
    return data.posts || [];
  } catch {
    return [];
  }
}
