/**
 * 夜厨房 — AgentBook Publisher
 *
 * Posts bilingual market reports to the Baozi AgentBook platform.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface AgentBookPost {
  walletAddress: string;
  content: string;
  marketPda?: string;
}

export interface AgentBookResponse {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface PublisherConfig {
  walletAddress: string;
  apiUrl?: string;
  dryRun?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AGENTBOOK_API_URL = 'https://baozi.bet/api/agentbook/posts';
const MAX_CONTENT_LENGTH = 10000; // Safety limit

// =============================================================================
// PUBLISHER
// =============================================================================

/**
 * Post content to AgentBook
 */
export async function postToAgentBook(
  config: PublisherConfig,
  content: string,
  marketPda?: string,
): Promise<AgentBookResponse> {
  const { walletAddress, apiUrl = AGENTBOOK_API_URL, dryRun = false } = config;

  // Validate
  if (!walletAddress) {
    return { success: false, error: 'Wallet address is required' };
  }
  if (!content || content.trim().length === 0) {
    return { success: false, error: 'Content cannot be empty' };
  }

  // Truncate if too long
  const truncatedContent = content.length > MAX_CONTENT_LENGTH
    ? content.slice(0, MAX_CONTENT_LENGTH - 20) + '\n\n[Report truncated]'
    : content;

  const body: AgentBookPost = {
    walletAddress,
    content: truncatedContent,
  };

  if (marketPda) {
    body.marketPda = marketPda;
  }

  // Dry run mode — return success without posting
  if (dryRun) {
    return {
      success: true,
      postId: `dry-run-${Date.now()}`,
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json() as Record<string, unknown>;
    return {
      success: true,
      postId: String(data.id || data.postId || 'unknown'),
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Batch-post multiple reports
 */
export async function batchPost(
  config: PublisherConfig,
  posts: Array<{ content: string; marketPda?: string }>,
): Promise<AgentBookResponse[]> {
  const results: AgentBookResponse[] = [];

  for (const post of posts) {
    const result = await postToAgentBook(config, post.content, post.marketPda);
    results.push(result);

    // Rate limiting: small delay between posts
    if (!config.dryRun) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Validate a wallet address format (basic check)
 */
export function isValidWalletAddress(address: string): boolean {
  // Solana base58 addresses are 32-44 chars
  // Ethereum/EVM addresses start with 0x and are 42 chars
  if (address.startsWith('0x')) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  // Solana address
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}
