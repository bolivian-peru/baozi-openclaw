/**
 * LLM-powered market analyzer using Google Gemini.
 * Generates market analysis for AgentBook posts and market comments.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaoziApi, type BaoziMarket } from "./baozi-api.js";

export type AnalysisType = "morning_roundup" | "odds_alert" | "closing_soon";

export class MarketAnalyzer {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-2.0-flash") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  /**
   * Generate a morning market roundup — top markets by volume.
   */
  async generateMorningRoundup(markets: BaoziMarket[]): Promise<string> {
    const topMarkets = markets
      .sort((a, b) => (b.totalPoolSol || 0) - (a.totalPoolSol || 0))
      .slice(0, 8);

    if (topMarkets.length === 0) {
      return "No active markets on Baozi right now. Check back later!";
    }

    const marketList = topMarkets
      .map((m, i) => `${i + 1}. ${BaoziApi.formatMarket(m)}`)
      .join("\n");

    const prompt = `You are a sharp prediction market analyst posting on AgentBook (a social feed for AI agents on Baozi.bet, a Solana prediction market platform).

Write a concise morning market roundup post analyzing these active prediction markets:

${marketList}

Guidelines:
- Be analytical, not promotional. Point out interesting odds, potential mispricings, or notable trends.
- Use a casual but smart tone — think crypto Twitter analyst, not corporate newsletter.
- Include specific numbers (odds percentages, pool sizes in SOL).
- Highlight 2-3 most interesting markets with brief takes on why.
- End with one bold prediction or contrarian take.
- Keep it between 200-800 characters. Be punchy.
- Do NOT use hashtags. Do NOT start with "gm" or greetings.
- Do NOT mention that you are an AI or agent.`;

    return await this.generate(prompt);
  }

  /**
   * Generate a midday odds movement alert — biggest probability shifts.
   */
  async generateOddsAlert(markets: BaoziMarket[]): Promise<string> {
    const marketsWithOdds = markets.filter(
      (m) => m.yesPercent !== undefined && m.yesPercent !== 50
    );

    // If all markets are at 50/50 (no bets yet), analyze all markets
    const analysisMarkets = marketsWithOdds.length > 0 ? marketsWithOdds : markets;

    if (analysisMarkets.length === 0) {
      return "No markets with active odds to analyze right now.";
    }

    const marketList = analysisMarkets
      .slice(0, 10)
      .map((m, i) => `${i + 1}. ${BaoziApi.formatMarket(m)}`)
      .join("\n");

    const prompt = `You are a prediction market analyst on AgentBook (Baozi.bet's social feed).

Analyze these active markets and post an odds analysis update:

${marketList}

Guidelines:
- Focus on which markets have the most interesting current odds.
- Point out where odds might be mispriced vs common knowledge or publicly available information.
- Identify markets where the pool size doesn't match the probability (potential value bets).
- If many markets show 50/50, point out that these are fresh markets with early-mover opportunities.
- Be specific: mention exact odds, pool sizes, and closing times.
- Keep it between 200-800 characters. Sharp and analytical.
- Do NOT use hashtags. Do NOT start with greetings.
- Do NOT mention that you are an AI.`;

    return await this.generate(prompt);
  }

  /**
   * Generate an evening "closing soon" post — markets expiring within 24h.
   */
  async generateClosingSoon(markets: BaoziMarket[]): Promise<string> {
    const now = Date.now();
    const closingSoon = markets
      .filter((m) => {
        const closeTime = new Date(m.closingTime).getTime();
        const hoursLeft = (closeTime - now) / (1000 * 60 * 60);
        return hoursLeft > 0 && hoursLeft <= 48; // expanded to 48h to catch more
      })
      .sort((a, b) =>
        new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime()
      )
      .slice(0, 6);

    // Fallback: general analysis if no markets closing soon
    const analysisMarkets = closingSoon.length > 0 ? closingSoon : markets.slice(0, 5);
    const isClosingSoon = closingSoon.length > 0;

    const marketList = analysisMarkets
      .map((m, i) => `${i + 1}. ${BaoziApi.formatMarket(m)}`)
      .join("\n");

    const prompt = isClosingSoon
      ? `You are a prediction market analyst on AgentBook (Baozi.bet).

These markets are closing soon — last chance to bet:

${marketList}

Guidelines:
- Create urgency: these are final hours to enter positions.
- Include specific closing times and current odds.
- Give quick takes on which side looks strong and why.
- Keep it between 200-800 characters. Punchy and actionable.
- Do NOT use hashtags. Do NOT mention you are AI.`
      : `You are a prediction market analyst on AgentBook (Baozi.bet).

Write a brief evening market outlook analyzing these markets:

${marketList}

Guidelines:
- Give a brief evening outlook on the most interesting active markets.
- Be analytical and concise. 200-600 characters.
- Do NOT use hashtags. Do NOT mention you are AI.`;

    return await this.generate(prompt);
  }

  /**
   * Generate a short comment for a specific market (10-500 chars).
   */
  async generateMarketComment(market: BaoziMarket): Promise<string> {
    const marketInfo = BaoziApi.formatMarket(market);

    const prompt = `You are a market analyst commenting on a prediction market on Baozi.bet.

Market: ${marketInfo}

Write a brief, insightful comment about this market. Include:
- Your assessment of whether current odds are fair
- One key factor that could move odds
- A clear lean (which side you'd favor and why)

STRICT: Keep between 50-400 characters. Be direct and specific. No hashtags. No greeting.`;

    const comment = await this.generate(prompt);

    // Enforce 10-500 char limit
    if (comment.length > 500) {
      return comment.substring(0, 497) + "...";
    }
    if (comment.length < 10) {
      return `Interesting odds on this market. Pool at ${market.totalPoolSol} SOL.`;
    }
    return comment;
  }

  /**
   * Select which analysis type to generate based on current UTC hour.
   */
  static getAnalysisType(): AnalysisType {
    const hour = new Date().getUTCHours();
    if (hour >= 6 && hour < 12) return "morning_roundup";
    if (hour >= 12 && hour < 18) return "odds_alert";
    return "closing_soon";
  }

  /**
   * Generate content based on analysis type.
   */
  async generateByType(
    type: AnalysisType,
    markets: BaoziMarket[]
  ): Promise<string> {
    switch (type) {
      case "morning_roundup":
        return this.generateMorningRoundup(markets);
      case "odds_alert":
        return this.generateOddsAlert(markets);
      case "closing_soon":
        return this.generateClosingSoon(markets);
    }
  }

  private async generate(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();
    return text;
  }
}
