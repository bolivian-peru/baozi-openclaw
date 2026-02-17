/**
 * AgentBook API client — posting to AgentBook and commenting on markets.
 * AgentBook posts need a CreatorProfile but no signature.
 * Market comments require wallet signature authentication.
 */

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

export interface AgentBookPost {
  id: number;
  walletAddress: string;
  content: string;
  steams: number;
  marketPda: string | null;
  createdAt: string;
}

export interface PostResult {
  success: boolean;
  post?: AgentBookPost;
  error?: string;
}

export interface CommentResult {
  success: boolean;
  comment?: unknown;
  error?: string;
}

export class AgentBookApi {
  private baseUrl: string;

  constructor(baseUrl: string = "https://baozi.bet") {
    this.baseUrl = baseUrl;
  }

  /**
   * Post to AgentBook feed.
   * Requires an on-chain CreatorProfile (no signature needed).
   *
   * Constraints:
   * - 30-minute cooldown between posts
   * - 10-2000 characters per post
   */
  async postToAgentBook(
    walletAddress: string,
    content: string,
    marketPda?: string
  ): Promise<PostResult> {
    if (content.length < 10 || content.length > 2000) {
      return {
        success: false,
        error: `Content must be 10-2000 chars, got ${content.length}`,
      };
    }

    const body: Record<string, string> = {
      walletAddress,
      content,
    };
    if (marketPda) {
      body.marketPda = marketPda;
    }

    const url = `${this.baseUrl}/api/agentbook/posts`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json() as { post?: AgentBookPost; error?: string };

      if (!res.ok) {
        return {
          success: false,
          error: `AgentBook POST failed: ${res.status} — ${JSON.stringify(data)}`,
        };
      }

      return { success: true, post: data.post || (data as unknown as AgentBookPost) };
    } catch (err) {
      return {
        success: false,
        error: `AgentBook POST error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Comment on an individual market.
   * Requires wallet signature authentication.
   *
   * Constraints:
   * - 1-hour cooldown between comments
   * - 10-500 characters per comment
   */
  async commentOnMarket(
    marketPda: string,
    content: string,
    privateKeyBase58: string
  ): Promise<CommentResult> {
    if (content.length < 10 || content.length > 500) {
      return {
        success: false,
        error: `Comment must be 10-500 chars, got ${content.length}`,
      };
    }

    const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
    const walletAddress = keypair.publicKey.toBase58();
    const url = `${this.baseUrl}/api/markets/${marketPda}/comments`;

    // SKILL.md specifies: sign message "baozi-comment:{marketPda}:{timestamp}"
    // Timestamp is Date.now() (milliseconds)
    // Signature is btoa(String.fromCharCode(...signature)) — browser base64
    const timestamp = Date.now();
    const message = `baozi-comment:${marketPda}:${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
    // Use btoa encoding as shown in SKILL.md example
    const signatureEncoded = Buffer.from(signature).toString("base64");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
          "x-signature": signatureEncoded,
          "x-message": message,
        },
        body: JSON.stringify({ content }),
      });

      const data = await res.json() as Record<string, unknown>;

      if (!res.ok) {
        return {
          success: false,
          error: `Comment POST failed: ${res.status} — ${JSON.stringify(data)}`,
        };
      }

      return { success: true, comment: data };
    } catch (err) {
      return {
        success: false,
        error: `Comment POST error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Fetch existing AgentBook posts (for checking cooldown / recent activity).
   */
  async getRecentPosts(): Promise<AgentBookPost[]> {
    const url = `${this.baseUrl}/api/agentbook/posts`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch AgentBook posts: ${res.status}`);
    }
    const data = await res.json() as { posts?: AgentBookPost[] };
    return data.posts || (data as unknown as AgentBookPost[]) || [];
  }

  /**
   * Check if we can post (30-min cooldown from our last post).
   */
  async canPost(walletAddress: string): Promise<{
    canPost: boolean;
    waitMs: number;
  }> {
    const posts = await this.getRecentPosts();
    const myPosts = posts.filter(
      (p) => p.walletAddress === walletAddress
    );

    if (myPosts.length === 0) {
      return { canPost: true, waitMs: 0 };
    }

    const lastPost = myPosts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    const elapsed = Date.now() - new Date(lastPost.createdAt).getTime();
    const cooldown = 30 * 60 * 1000; // 30 minutes

    if (elapsed >= cooldown) {
      return { canPost: true, waitMs: 0 };
    }

    return { canPost: false, waitMs: cooldown - elapsed };
  }
}
