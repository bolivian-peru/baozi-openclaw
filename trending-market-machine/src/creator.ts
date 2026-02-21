/**
 * Market creation module
 * Creates Lab markets on Baozi via direct @baozi.bet/mcp-server handler imports
 */

import type { MarketProposal, CreatedMarket, MachineConfig } from "./types/index.js";
import {
  execMcpTool,
  listMarkets,
  previewMarketCreation,
  PROGRAM_ID,
  NETWORK,
} from "./mcp-client.js";

/**
 * Create a Lab market on Baozi from a validated proposal
 */
export async function createLabMarket(
  proposal: MarketProposal,
  config: MachineConfig
): Promise<CreatedMarket> {
  console.log(`[creator] Creating market: "${proposal.question}"`);
  console.log(`[creator] Program ID: ${PROGRAM_ID.toBase58()}`);
  console.log(`[creator] Network: ${NETWORK}`);

  if (config.dryRun) {
    console.log("[creator] DRY RUN — previewing market creation via real MCP handler");

    // Even in dry run, call the real preview handler to validate
    try {
      const closingTime = proposal.closeTime;
      const resolutionTime = new Date(
        new Date(closingTime).getTime() + 24 * 60 * 60 * 1000
      ).toISOString();

      const preview = await previewMarketCreation({
        question: proposal.question,
        layer: "lab",
        closingTime,
        resolutionTime,
        marketType: proposal.marketType === "A" ? "event" : "measurement",
        eventTime: proposal.eventTime,
        measurementStart: proposal.measurementStart,
        creatorWallet: config.affiliateWallet || "FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx",
      });

      console.log(`[creator] Preview result:`, JSON.stringify(preview, null, 2));

      return {
        marketId: preview.marketPda || `preview-${Date.now()}`,
        proposal,
        txSignature: `dry-run-preview-${Date.now()}`,
        createdAt: new Date(),
      };
    } catch (err) {
      console.warn(`[creator] Preview failed (expected in dry-run): ${err}`);
      return {
        marketId: `dry-run-${Date.now()}`,
        proposal,
        txSignature: "dry-run-no-tx",
        createdAt: new Date(),
      };
    }
  }

  // Use real MCP handler to build the transaction
  const closingTime = proposal.closeTime;
  const resolutionTime = new Date(
    new Date(closingTime).getTime() + 24 * 60 * 60 * 1000
  ).toISOString();

  const toolName = proposal.isRaceMarket
    ? "build_create_race_market_transaction"
    : "build_create_lab_market_transaction";

  const params: Record<string, unknown> = {
    question: proposal.question,
    description: proposal.description,
    closing_time: closingTime,
    resolution_time: resolutionTime,
    market_type: proposal.marketType === "A" ? "event" : "measurement",
    data_source: proposal.dataSource,
    resolution_criteria: proposal.resolutionCriteria,
    category: proposal.category,
    tags: proposal.tags,
    creator_fee_bps: config.creatorFeeBps,
    creator_wallet: config.affiliateWallet || "FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx",
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

  const data = result.data as Record<string, unknown>;
  const market: CreatedMarket = {
    marketId: (data?.marketPda || data?.market_id || data?.marketId || "unknown") as string,
    proposal,
    txSignature: (data?.transaction?.toString() || data?.tx_signature || data?.signature || "pending-sign") as string,
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
    return `https://baozi.bet/share/${marketId}.png`;
  }

  try {
    const result = await execMcpTool("generate_share_card", {
      market_id: marketId,
    });

    if (result.success) {
      const data = result.data as Record<string, unknown>;
      const url = data?.url as string | undefined;
      if (url) {
        console.log(`[creator] Share card generated: ${url}`);
        return url;
      }
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

    const data = (await resp.json()) as Record<string, unknown>;
    const postId = (data.id || data.post_id) as string;
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
    console.log(`[creator] Fetching existing markets via real MCP handler (Program: ${PROGRAM_ID.toBase58()}, Network: ${NETWORK})`);
    // Direct handler call — no subprocess, no HTTP proxy
    const markets = await listMarkets("active");

    if (!markets || !Array.isArray(markets)) {
      console.warn("[creator] Could not fetch existing markets for dedup");
      return [];
    }

    console.log(`[creator] Found ${markets.length} active markets on-chain`);
    return markets.map((m) => m.question || "");
  } catch (err) {
    console.warn(`[creator] Error fetching existing markets: ${err}`);
    return [];
  }
}
