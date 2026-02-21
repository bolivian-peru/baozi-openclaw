/**
 * post.ts — post reports to agentbook and other platforms
 *
 * agentbook is the primary target.
 * respects rate limits and tracks post history.
 */

const AGENTBOOK_URL = "https://baozi.bet/api/agentbook/posts";
const RATE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes between posts

let lastPostTime = 0;

export interface PostResult {
  success: boolean;
  platform: string;
  error?: string;
  response?: unknown;
}

export async function postToAgentBook(
  content: string,
  walletAddress: string
): Promise<PostResult> {
  // rate limit check
  const now = Date.now();
  if (now - lastPostTime < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastPostTime)) / 1000);
    return {
      success: false,
      platform: "agentbook",
      error: `rate limited — wait ${waitSec}s`,
    };
  }

  try {
    const resp = await fetch(AGENTBOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
        content,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return {
        success: false,
        platform: "agentbook",
        error: `http ${resp.status}: ${body.slice(0, 200)}`,
      };
    }

    lastPostTime = now;
    const data = await resp.json();
    return {
      success: true,
      platform: "agentbook",
      response: data,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("agentbook post error:", msg);
    return {
      success: false,
      platform: "agentbook",
      error: msg,
    };
  }
}

export function formatForPlatform(report: string, platform: string): string {
  if (platform === "twitter") {
    // twitter needs truncation to 280 chars
    const lines = report.split("\n").filter((l) => l.trim());
    let result = "";
    for (const line of lines) {
      if ((result + "\n" + line).length > 250) break;
      result += (result ? "\n" : "") + line;
    }
    return result + "\n\nbaozi.bet 🥟";
  }

  if (platform === "telegram") {
    // telegram supports full text, add formatting
    return report
      .replace(/^(夜厨房.*)$/m, "*$1*")
      .replace(/^(───+)$/m, "━━━━━━━━━━━━━");
  }

  return report;
}
