/**
 * Market Service
 *
 * Handles the lifecycle of prediction markets using DIRECT imports
 * from @baozi.bet/mcp-server handlers (no subprocess spawning):
 * - Validates predictions against pari-mutuel rules
 * - Reads live market data from Solana mainnet
 * - Creates Lab markets via MCP
 * - Places bets on behalf of callers
 * - Generates share cards
 * - Checks market status and resolution
 */
import {
  execMcpTool,
  listMarkets,
  getMarket,
  getQuote as getQuoteDirect,
  getPositions as getPositionsDirect,
  PROGRAM_ID,
  NETWORK,
} from "./mcp-client.js";
import type { ParsedPrediction, MarketCreateParams, McpResult, ShareCardData } from "../types/index.js";

const BAOZI_SHARE_CARD_API = "https://baozi.bet/api/share/card";
const DEFAULT_RESOLUTION_BUFFER = 300; // 5 minutes
const DEFAULT_CREATOR_FEE = 200; // 2% (200 basis points)

export interface MarketServiceConfig {
  /** Default bet amount in SOL */
  defaultBetAmount?: number;
  /** Referral code */
  referralCode?: string;
  /** Dry run mode (don't actually create markets) */
  dryRun?: boolean;
}

export class MarketService {
  private config: MarketServiceConfig;

  constructor(config: MarketServiceConfig = {}) {
    this.config = {
      defaultBetAmount: 0.1,
      referralCode: "cristol",
      dryRun: false,
      ...config,
    };
  }

  /**
   * Get the on-chain program ID and network (for verification)
   */
  getProtocolInfo(): { programId: string; network: string } {
    return {
      programId: PROGRAM_ID.toBase58(),
      network: NETWORK,
    };
  }

  /**
   * List live markets from Solana mainnet via direct handler import
   */
  async listLiveMarkets(status?: string): Promise<McpResult> {
    try {
      const markets = await listMarkets(status);
      return { success: true, data: markets };
    } catch (err: any) {
      return { success: false, error: `listMarkets error: ${err.message}` };
    }
  }

  /**
   * Get a specific market's details from chain via direct handler
   */
  async getMarketDetails(marketPda: string): Promise<McpResult> {
    try {
      const market = await getMarket(marketPda);
      return { success: true, data: market };
    } catch (err: any) {
      return { success: false, error: `getMarket error: ${err.message}` };
    }
  }

  /**
   * Get a quote for a potential bet via direct handler
   */
  async getQuote(marketPda: string, side: string, amount: number): Promise<McpResult> {
    try {
      const quote = await getQuoteDirect(marketPda, side as "Yes" | "No", amount);
      return { success: true, data: quote };
    } catch (err: any) {
      return { success: false, error: `getQuote error: ${err.message}` };
    }
  }

  /**
   * Get positions for a wallet via direct handler
   */
  async getPositions(walletAddress: string): Promise<McpResult> {
    try {
      const positions = await getPositionsDirect(walletAddress);
      return { success: true, data: positions };
    } catch (err: any) {
      return { success: false, error: `getPositions error: ${err.message}` };
    }
  }

  /**
   * Build market creation parameters from a parsed prediction
   */
  buildMarketParams(prediction: ParsedPrediction): MarketCreateParams {
    const deadline = new Date(prediction.deadline);

    // Close time: 24 hours before deadline for event-based (Type A)
    // This follows pari-mutuel rules to prevent info advantage
    const closeTime = new Date(deadline.getTime() - 24 * 60 * 60 * 1000);

    // If close time would be in the past, set it to 1 hour from now
    const now = new Date();
    const minCloseTime = new Date(now.getTime() + 60 * 60 * 1000);
    const effectiveCloseTime = closeTime > minCloseTime ? closeTime : minCloseTime;

    return {
      question: prediction.question,
      closingTime: Math.floor(effectiveCloseTime.getTime() / 1000),
      resolutionBuffer: DEFAULT_RESOLUTION_BUFFER,
      creatorFee: DEFAULT_CREATOR_FEE,
      dataSource: prediction.dataSource,
      resolutionCriteria: prediction.resolutionCriteria,
      outcomes: prediction.raceOutcomes,
    };
  }

  /**
   * Create a Lab market on Baozi via direct MCP handler
   */
  async createLabMarket(params: MarketCreateParams, walletAddress: string): Promise<McpResult> {
    console.log(`  ⟳ Creating Lab market: "${params.question}"`);

    if (this.config.dryRun) {
      const fakePda = `DRY_RUN_${Date.now()}`;
      console.log(`  ✓ [DRY RUN] Would create market: ${fakePda}`);
      return {
        success: true,
        data: {
          market_pda: fakePda,
          transaction: "dry_run_tx",
          message: "Dry run — no market created",
        },
      };
    }

    const toolParams: Record<string, any> = {
      question: params.question,
      closing_time: params.closingTime,
      resolution_buffer: params.resolutionBuffer,
      creator_fee_bps: params.creatorFee,
      data_source: params.dataSource,
      resolution_criteria: params.resolutionCriteria,
      wallet: walletAddress,
    };

    if (params.outcomes && params.outcomes.length > 0) {
      toolParams.outcomes = params.outcomes;
      return execMcpTool("build_create_race_market_transaction", toolParams);
    }

    return execMcpTool("build_create_lab_market_transaction", toolParams);
  }

  /**
   * Place a bet on a market via direct MCP handler
   */
  async placeBet(
    marketPda: string,
    walletAddress: string,
    side: string,
    amount: number
  ): Promise<McpResult> {
    console.log(`  ⟳ Placing ${amount} SOL bet on ${side.toUpperCase()}...`);

    if (this.config.dryRun) {
      console.log(`  ✓ [DRY RUN] Would bet ${amount} SOL on ${side}`);
      return {
        success: true,
        data: { transaction: "dry_run_bet_tx", message: "Dry run — no bet placed" },
      };
    }

    return execMcpTool("build_bet_transaction", {
      market: marketPda,
      outcome: side.toLowerCase() === "yes" ? "Yes" : "No",
      amount_sol: amount,
      user_wallet: walletAddress,
      affiliate_code: this.config.referralCode,
    });
  }

  /**
   * Generate a share card URL for a call
   */
  generateShareCardUrl(data: ShareCardData): string {
    const params = new URLSearchParams({
      market: data.marketPda,
      wallet: data.walletAddress,
    });
    if (this.config.referralCode) {
      params.set("ref", this.config.referralCode);
    }
    return `${BAOZI_SHARE_CARD_API}?${params.toString()}`;
  }

  /**
   * Generate a share card via MCP
   */
  async generateShareCard(marketPda: string, walletAddress: string): Promise<McpResult> {
    console.log(`  ⟳ Generating share card...`);

    if (this.config.dryRun) {
      const url = this.generateShareCardUrl({
        marketPda,
        walletAddress,
        callerName: "",
        question: "",
        betSide: "",
        betAmount: 0,
        hitRate: 0,
        totalCalls: 0,
      });
      return {
        success: true,
        data: { url, message: "Dry run share card URL" },
      };
    }

    return execMcpTool("generate_share_link", {
      market: marketPda,
      wallet: walletAddress,
      ref: this.config.referralCode,
    });
  }

  /**
   * Full flow: create market + place bet + generate share card
   */
  async executeCall(
    prediction: ParsedPrediction,
    walletAddress: string,
    betAmount?: number,
    betSide?: string
  ): Promise<{
    marketPda?: string;
    betTx?: string;
    shareCardUrl?: string;
    errors: string[];
  }> {
    const errors: string[] = [];
    const amount = betAmount ?? this.config.defaultBetAmount ?? 0.1;
    const side = betSide ?? (prediction.direction === "below" || prediction.direction === "no" ? "no" : "yes");

    // Step 1: Build params and create market
    const params = this.buildMarketParams(prediction);
    const createResult = await this.createLabMarket(params, walletAddress);

    if (!createResult.success) {
      errors.push(`Market creation failed: ${createResult.error}`);
      return { errors };
    }

    const marketPda = createResult.data?.market_pda || createResult.data?.marketPda;
    if (!marketPda) {
      errors.push("No market PDA returned from creation");
      return { errors };
    }
    console.log(`  ✓ Market created: ${marketPda}`);

    // Step 2: Place caller's bet (skin in the game)
    const betResult = await this.placeBet(marketPda, walletAddress, side, amount);
    let betTx: string | undefined;
    if (!betResult.success) {
      errors.push(`Bet placement failed: ${betResult.error}`);
    } else {
      betTx = betResult.data?.transaction || betResult.data?.signature;
      console.log(`  ✓ Bet placed: ${amount} SOL on ${side.toUpperCase()}`);
    }

    // Step 3: Generate share card
    const shareResult = await this.generateShareCard(marketPda, walletAddress);
    let shareCardUrl: string | undefined;
    if (!shareResult.success) {
      // Fallback to URL construction
      shareCardUrl = this.generateShareCardUrl({
        marketPda,
        walletAddress,
        callerName: "",
        question: prediction.question,
        betSide: side,
        betAmount: amount,
        hitRate: 0,
        totalCalls: 0,
      });
      console.log(`  ⚠ Share card MCP failed, using direct URL`);
    } else {
      shareCardUrl = shareResult.data?.url || shareResult.data?.image_url;
      console.log(`  ✓ Share card generated`);
    }

    return { marketPda, betTx, shareCardUrl, errors };
  }
}
