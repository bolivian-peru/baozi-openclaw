/**
 * Analyst Agent
 * 
 * An autonomous agent that:
 * 1. Analyzes prediction markets using market data
 * 2. Publishes analysis behind x402 paywall
 * 3. Earns revenue from analysis sales + affiliate commissions
 * 4. Builds reputation through accurate predictions
 * 
 * Revenue streams:
 * - x402 micropayments per analysis sold
 * - 1% affiliate commission on referred bets (lifetime)
 * - Creator fees if they created the market (up to 2%)
 */

import { AgentIntelMarketplace } from '../marketplace/index.js';
import { BaoziMCPClient } from '../mcp/index.js';
import { generateMockSignature } from '../x402/index.js';
import {
  AnalystProfile,
  MarketAnalysis,
  BaoziMarket,
} from '../types/index.js';

export interface AnalystAgentConfig {
  wallet: string;
  displayName: string;
  affiliateCode: string;
  bio?: string;
  /** Minimum confidence to publish (default: 60) */
  minConfidenceThreshold?: number;
  /** Default price per analysis in SOL */
  defaultPriceSOL?: number;
  /** Analysis generation strategy */
  strategy?: 'momentum' | 'contrarian' | 'fundamental' | 'sentiment';
}

export class AnalystAgent {
  private profile: AnalystProfile | null = null;
  private config: AnalystAgentConfig;
  private marketplace: AgentIntelMarketplace;
  private publishedAnalyses: Map<string, MarketAnalysis> = new Map();

  constructor(config: AnalystAgentConfig, marketplace: AgentIntelMarketplace) {
    this.config = config;
    this.marketplace = marketplace;
  }

  /**
   * Initialize the analyst agent — register on marketplace.
   */
  async initialize(): Promise<AnalystProfile> {
    this.profile = await this.marketplace.registerAnalyst({
      wallet: this.config.wallet,
      displayName: this.config.displayName,
      affiliateCode: this.config.affiliateCode,
      bio: this.config.bio,
    });
    return this.profile;
  }

  /**
   * Analyze a market and generate a thesis.
   * Uses market data from Baozi MCP to form an opinion.
   */
  async analyzeMarket(marketPda: string): Promise<{
    thesis: string;
    side: 'YES' | 'NO';
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    supportingData: string[];
  }> {
    const market = await this.marketplace.baoziClient.getMarket(marketPda);
    if (!market) throw new Error(`Market ${marketPda} not found`);

    return this.generateAnalysis(market);
  }

  /**
   * Analyze a market and publish the analysis with x402 paywall.
   */
  async analyzeAndPublish(marketPda: string, priceSOL?: number): Promise<MarketAnalysis> {
    if (!this.profile) throw new Error('Agent not initialized. Call initialize() first.');

    const analysis = await this.analyzeMarket(marketPda);
    const threshold = this.config.minConfidenceThreshold || 60;

    if (analysis.confidence < threshold) {
      throw new Error(
        `Confidence ${analysis.confidence}% below threshold ${threshold}%. Not publishing.`
      );
    }

    const published = await this.marketplace.publishAnalysis({
      analystId: this.profile.id,
      marketPda,
      thesis: analysis.thesis,
      recommendedSide: analysis.side,
      confidence: analysis.confidence,
      priceSOL: priceSOL || this.config.defaultPriceSOL || 0.01,
      supportingData: analysis.supportingData,
      riskLevel: analysis.riskLevel,
    });

    this.publishedAnalyses.set(published.id, published);
    return published;
  }

  /**
   * Also place a bet on the analyst's own analysis.
   * Analysts can put their money where their mouth is.
   */
  async betOnOwnAnalysis(analysisId: string, amount: number): Promise<{
    success: boolean;
    transactionSignature: string;
    shares: number;
  }> {
    if (!this.profile) throw new Error('Agent not initialized');

    const analysis = this.publishedAnalyses.get(analysisId);
    if (!analysis) throw new Error('Analysis not found in agent\'s published list');

    return this.marketplace.baoziClient.placeBet({
      marketPda: analysis.marketPda,
      side: analysis.recommendedSide,
      amount,
      wallet: this.config.wallet,
    });
  }

  /**
   * Get agent's profile.
   */
  getProfile(): AnalystProfile | null {
    return this.profile;
  }

  /**
   * Get agent's reputation stats.
   */
  getReputation() {
    if (!this.profile) return null;
    return this.marketplace.reputationTracker.getReputation(this.profile.id);
  }

  /**
   * Get all published analyses.
   */
  getPublishedAnalyses(): MarketAnalysis[] {
    return Array.from(this.publishedAnalyses.values());
  }

  /**
   * Generate market analysis based on strategy.
   * In production, this would use LLM + data feeds.
   */
  private generateAnalysis(market: BaoziMarket): {
    thesis: string;
    side: 'YES' | 'NO';
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    supportingData: string[];
  } {
    const strategy = this.config.strategy || 'fundamental';
    const yesPrice = market.currentPrices[0];
    const noPrice = market.currentPrices[1];
    
    let side: 'YES' | 'NO';
    let confidence: number;
    let thesis: string;
    let supportingData: string[];
    let riskLevel: 'low' | 'medium' | 'high';

    switch (strategy) {
      case 'contrarian':
        // Bet against the crowd when prices are extreme
        side = yesPrice > 0.7 ? 'NO' : yesPrice < 0.3 ? 'YES' : (yesPrice > 0.5 ? 'NO' : 'YES');
        confidence = Math.round(50 + Math.abs(yesPrice - 0.5) * 80);
        thesis = this.buildContrarianThesis(market, side, confidence);
        supportingData = [
          `Current YES price: ${(yesPrice * 100).toFixed(1)}%`,
          `Market volume: $${market.volume.toLocaleString()}`,
          `Contrarian signal: market appears ${yesPrice > 0.7 ? 'over' : 'under'}priced`,
          `Historical reversion rate for similar extremes: ~65%`,
        ];
        riskLevel = Math.abs(yesPrice - 0.5) > 0.3 ? 'high' : 'medium';
        break;

      case 'momentum':
        // Follow the trend — strong prices = strong conviction
        side = yesPrice > 0.5 ? 'YES' : 'NO';
        confidence = Math.round(50 + Math.abs(yesPrice - 0.5) * 60);
        thesis = this.buildMomentumThesis(market, side, confidence);
        supportingData = [
          `Current YES price: ${(yesPrice * 100).toFixed(1)}%`,
          `Market volume: $${market.volume.toLocaleString()}`,
          `Momentum signal: price trending ${side === 'YES' ? 'up' : 'down'}`,
          `Volume supports trend continuation`,
        ];
        riskLevel = confidence > 75 ? 'low' : 'medium';
        break;

      case 'sentiment':
        // Based on volume and liquidity signals
        const volLiqRatio = market.volume / Math.max(market.liquidity, 1);
        side = volLiqRatio > 3 ? (yesPrice > 0.5 ? 'YES' : 'NO') : (yesPrice > 0.5 ? 'NO' : 'YES');
        confidence = Math.round(55 + Math.min(volLiqRatio * 5, 30));
        thesis = this.buildSentimentThesis(market, side, confidence, volLiqRatio);
        supportingData = [
          `Volume/Liquidity ratio: ${volLiqRatio.toFixed(2)}`,
          `Market volume: $${market.volume.toLocaleString()}`,
          `Market liquidity: $${market.liquidity.toLocaleString()}`,
          `Sentiment signal: ${volLiqRatio > 3 ? 'high conviction' : 'low conviction'} market`,
        ];
        riskLevel = volLiqRatio > 5 ? 'low' : volLiqRatio > 2 ? 'medium' : 'high';
        break;

      default: // fundamental
        // Simple fundamental analysis based on price deviation
        const fairValue = 0.5; // Assume 50/50 as baseline
        const mispricing = yesPrice - fairValue;
        side = mispricing > 0.1 ? 'YES' : mispricing < -0.1 ? 'NO' : (yesPrice > 0.5 ? 'YES' : 'NO');
        confidence = Math.round(55 + Math.abs(mispricing) * 80);
        thesis = this.buildFundamentalThesis(market, side, confidence, mispricing);
        supportingData = [
          `Current YES price: ${(yesPrice * 100).toFixed(1)}%`,
          `Estimated fair value: ${(fairValue * 100).toFixed(1)}%`,
          `Mispricing: ${(mispricing * 100).toFixed(1)}%`,
          `Volume: $${market.volume.toLocaleString()} | Liquidity: $${market.liquidity.toLocaleString()}`,
        ];
        riskLevel = Math.abs(mispricing) > 0.2 ? 'high' : Math.abs(mispricing) > 0.1 ? 'medium' : 'low';
    }

    confidence = Math.min(confidence, 95); // Cap at 95%
    return { thesis, side, confidence, riskLevel, supportingData };
  }

  private buildFundamentalThesis(market: BaoziMarket, side: 'YES' | 'NO', confidence: number, mispricing: number): string {
    return [
      `## Fundamental Analysis: ${market.title}`,
      ``,
      `**Recommendation: ${side} at ${confidence}% confidence**`,
      ``,
      `The current market price of ${(market.currentPrices[0] * 100).toFixed(1)}% for YES `,
      `${Math.abs(mispricing) > 0.1 ? 'significantly ' : ''}${mispricing > 0 ? 'overvalues' : 'undervalues'} `,
      `the true probability of this event.`,
      ``,
      `**Key Factors:**`,
      `- Market volume of $${market.volume.toLocaleString()} indicates ${market.volume > 50000 ? 'strong' : 'moderate'} interest`,
      `- Liquidity depth of $${market.liquidity.toLocaleString()} suggests ${market.liquidity > 10000 ? 'efficient' : 'thin'} pricing`,
      `- The ${Math.abs(mispricing * 100).toFixed(1)}% mispricing presents a ${Math.abs(mispricing) > 0.15 ? 'significant' : 'modest'} opportunity`,
      ``,
      `**Risk Assessment:** ${Math.abs(mispricing) > 0.2 ? 'High deviation from fair value — could snap back' : 'Moderate positioning recommended'}`,
      ``,
      `**Position Sizing:** Recommend ${confidence > 75 ? '2-3%' : '1-2%'} of portfolio at current prices.`,
    ].join('\n');
  }

  private buildContrarianThesis(market: BaoziMarket, side: 'YES' | 'NO', confidence: number): string {
    const yesPrice = market.currentPrices[0];
    return [
      `## Contrarian Analysis: ${market.title}`,
      ``,
      `**Recommendation: ${side} at ${confidence}% confidence**`,
      ``,
      `The market is pricing YES at ${(yesPrice * 100).toFixed(1)}%, which I believe represents `,
      `${yesPrice > 0.65 ? 'excessive optimism' : yesPrice < 0.35 ? 'excessive pessimism' : 'a slight imbalance'}.`,
      ``,
      `**Contrarian Thesis:**`,
      `- Markets tend to overshoot at extremes — current pricing reflects crowd bias`,
      `- Volume of $${market.volume.toLocaleString()} suggests emotional rather than rational pricing`,
      `- Historical reversion patterns suggest a correction toward fair value`,
      `- ${side === 'NO' ? 'The market is ignoring tail risks to the downside' : 'The market is overly discounting positive catalysts'}`,
      ``,
      `**Edge:** Contrarian positions at extreme prices historically yield 15-25% alpha in prediction markets.`,
      ``,
      `**Risk:** High — this is a contrarian bet. Size accordingly (1% max of portfolio).`,
    ].join('\n');
  }

  private buildMomentumThesis(market: BaoziMarket, side: 'YES' | 'NO', confidence: number): string {
    return [
      `## Momentum Analysis: ${market.title}`,
      ``,
      `**Recommendation: ${side} at ${confidence}% confidence**`,
      ``,
      `The market is showing clear directional momentum with YES priced at `,
      `${(market.currentPrices[0] * 100).toFixed(1)}%.`,
      ``,
      `**Momentum Signals:**`,
      `- Price trend strongly favors ${side}`,
      `- Volume of $${market.volume.toLocaleString()} confirms the move is backed by real capital`,
      `- Liquidity depth at $${market.liquidity.toLocaleString()} — sufficient for position entry`,
      `- Smart money appears aligned with current direction`,
      ``,
      `**Strategy:** Follow the trend. Markets in motion tend to stay in motion.`,
      ``,
      `**Position:** Medium conviction — ${confidence > 70 ? '2-3%' : '1-2%'} of portfolio. `,
      `Set a mental stop if price reverses more than 15 cents.`,
    ].join('\n');
  }

  private buildSentimentThesis(market: BaoziMarket, side: 'YES' | 'NO', confidence: number, volLiqRatio: number): string {
    return [
      `## Sentiment Analysis: ${market.title}`,
      ``,
      `**Recommendation: ${side} at ${confidence}% confidence**`,
      ``,
      `Volume-to-liquidity ratio of ${volLiqRatio.toFixed(2)} indicates `,
      `${volLiqRatio > 3 ? 'strong conviction' : 'weak conviction'} in current pricing.`,
      ``,
      `**Sentiment Indicators:**`,
      `- Vol/Liq ratio: ${volLiqRatio.toFixed(2)} (${volLiqRatio > 5 ? 'very high' : volLiqRatio > 3 ? 'high' : 'moderate'})`,
      `- Current YES: ${(market.currentPrices[0] * 100).toFixed(1)}%`,
      `- ${volLiqRatio > 3 ? 'High volume relative to liquidity suggests informed trading' : 'Low ratio suggests uncertainty — watch for catalysts'}`,
      `- Market category: ${market.category} — ${market.category === 'crypto' ? 'high volatility expected' : 'moderate volatility'}`,
      ``,
      `**Interpretation:** ${volLiqRatio > 3 ? 'Smart money is positioned. Follow the signal.' : 'No strong signal. Fading current price may be profitable.'}`,
      ``,
      `**Position:** ${volLiqRatio > 3 ? 'Higher' : 'Lower'} conviction — size accordingly.`,
    ].join('\n');
  }
}
