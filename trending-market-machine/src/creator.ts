/**
 * Market creation module
 * Creates Lab markets on Baozi via direct @baozi.bet/mcp-server handler imports
 */

import type { MarketProposal, CreatedMarket, MachineConfig } from "./types/index.js";
import { execMcpTool, listMarkets, handleTool } from "./mcp-client.js";

/**
 * Create a Lab market on Baozi from a validated proposal
 */
export async function createLabMarket(
  proposal: MarketProposal,
  config: MachineConfig
): Promise<CreatedMarket> {
  console.log(`[creator] Creating market: "${proposal.question}"`);

  if (config.dryRun) {
    console.log("[creator] DRY RUN — skipping actual creation");
    return {
      marketId: `dry-run-${Date.now()}`,
      proposal,
      txSignature: "dry-run-no-tx",
      createdAt: new Date(),
    };
  }

  // Use MCP tool to build the transaction
  const toolName = proposal.isRaceMarket
    ? "build_create_race_market_transaction"
    : "build_create_lab_market_transaction";

  const params: Record<string, unknown> = {
    question: proposal.question,
    description: proposal.description,
    close_time: proposal.closeTime,
    data_source: proposal.dataSource,
    resolution_criteria: proposal.resolutionCriteria,
    category: proposal.category,
    tags: proposal.tags,
    creator_fee_bps: config.creatorFeeBps,
    ...(proposal.measurementStart ? { measurement_start: proposal.measurementStart } : {}),
    ...(proposal.eventTime ? { event_time: proposal.eventTime } : {}),
  };

  if (proposal.isRaceMarket && proposal.outcomes) {
    params.outcomes = proposal.outcomes;
  }

  const result = await execMcpTool(toolName, params);

  if (!result.success) {
    throw new Error(`Market creation failed: ${result.error}`);
  }

  const market: CreatedMarket = {
    marketId: result.data?.market_id || result.data?.marketId || "unknown",
    proposal,
    txSignature: result.data?.tx_signature || result.data?.signature || "unknown",
    createdAt: new Date(),
  };

  console.log(`[creator] Market created: ${market.marketId} (tx: ${market.txSignature})`);
  return market;
}

/**
 * Set market metadata (title, description, image, category, tags)
 */
export async function setMarketMetadata(
  marketId: string,
  proposal: MarketProposal,
  config: MachineConfig
): Promise<void> {
  if (config.dryRun) {
    console.log("[creator] DRY RUN — skipping metadata");
    return;
  }

  try {
    const resp = await fetch(`${config.baoziBaseUrl}/api/markets/metadata`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendingMarketMachine/1.0",
      },
      body: JSON.stringify({
        market_id: marketId,
        title: proposal.question,
        description: proposal.description,
        category: proposal.category,
        tags: proposal.tags,
        data_source: proposal.dataSource,
        resolution_criteria: proposal.resolutionCriteria,
      }),
    });

    if (!resp.ok) {
      console.warn(`[creator] Metadata API returned ${resp.status}: ${await resp.text()}`);
    } else {
      console.log(`[creator] Metadata set for market ${marketId}`);
    }
  } catch (err) {
    console.warn(`[creator] Failed to set metadata: ${err}`);
  }
}

/**
 * Generate a share card for the created market
 */
export async function generateShareCard(
  marketId: string,
  config: MachineConfig
): Promise<string | undefined> {
  if (config.dryRun) {
    console.log("[creator] DRY RUN — skipping share card");
    return "https://baozi.bet/share/dry-run.png";
  }

  try {
    const result = await execMcpTool("generate_share_card", {
      market_id: marketId,
    });

    if (result.success && result.data?.url) {
      console.log(`[creator] Share card generated: ${result.data.url}`);
      return result.data.url;
    }

    console.warn(`[creator] Share card generation returned no URL`);
    return undefined;
  } catch (err) {
    console.warn(`[creator] Failed to generate share card: ${err}`);
    return undefined;
  }
}

/**
 * Post announcement to AgentBook
 */
export async function postToAgentBook(
  market: CreatedMarket,
  shareCardUrl: string | undefined,
  config: MachineConfig
): Promise<string | undefined> {
  if (config.dryRun) {
    console.log("[creator] DRY RUN — skipping AgentBook post");
    return "dry-run-post-id";
  }

  try {
    const emoji = categoryEmoji(market.proposal.category);
    const post = [
      `${emoji} Fresh market from the Market Machine! 🥟`,
      "",
      `📊 ${market.proposal.question}`,
      "",
      `Category: ${market.proposal.category}`,
      `Type: ${market.proposal.marketType === "A" ? "Event-based" : "Measurement-period"}`,
      `Closes: ${new Date(market.proposal.closeTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      `Source: ${market.proposal.topic.source}`,
      "",
      `🔗 https://baozi.bet/markets/${market.marketId}`,
      shareCardUrl ? `\n📸 ${shareCardUrl}` : "",
      "",
      `#trending #${market.proposal.category} #prediction`,
    ].join("\n");

    const resp = await fetch(`${config.baoziBaseUrl}/api/agentbook/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendingMarketMachine/1.0",
      },
      body: JSON.stringify({
        content: post,
        market_id: market.marketId,
        type: "market_creation",
      }),
    });

    if (!resp.ok) {
      console.warn(`[creator] AgentBook post failed: ${resp.status}`);
      return undefined;
    }

    const data = await resp.json();
    const postId = data.id || data.post_id;
    console.log(`[creator] Posted to AgentBook: ${postId}`);
    return postId;
  } catch (err) {
    console.warn(`[creator] Failed to post to AgentBook: ${err}`);
    return undefined;
  }
}

function categoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    crypto: "🪙",
    sports: "⚽",
    technology: "💻",
    entertainment: "🎬",
    finance: "📈",
    politics: "🏛️",
    science: "🔬",
    other: "📊",
  };
  return emojis[category] || "📊";
}

/**
 * Fetch existing market questions from Baozi for duplicate checking
 * Uses direct listMarkets handler from @baozi.bet/mcp-server
 */
export async function fetchExistingMarketQuestions(
  config: MachineConfig
): Promise<string[]> {
  try {
    // Direct handler call — no subprocess, no HTTP proxy
    const markets = await listMarkets("active");

    if (!markets || !Array.isArray(markets)) {
      console.warn("[creator] Could not fetch existing markets for dedup");
      return [];
    }

    return markets.map((m: any) => m.question || m.title || "");
  } catch (err) {
    console.warn(`[creator] Error fetching existing markets: ${err}`);
    return [];
  }
}
