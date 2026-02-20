/**
 * Type definitions for Share Card Viral Engine
 */

/** Market data from the MCP server, normalized for card generation */
export interface MarketCardData {
  publicKey: string;
  marketId: string;
  question: string;
  yesPercent: number;
  noPercent: number;
  yesPoolSol: number;
  noPoolSol: number;
  totalPoolSol: number;
  status: string;
  closingTime: string;
  layer: string;
  currencyType: string;
  hasBets: boolean;
  isBettingOpen: boolean;
  creator: string;
}

/** Platform targets for card distribution */
export type Platform = 'twitter' | 'discord' | 'telegram' | 'generic';

/** Share card output formats */
export interface ShareCard {
  /** The raw HTML content for the card */
  html: string;
  /** Plain text fallback (for platforms that don't support rich content) */
  plainText: string;
  /** Platform-specific formatted content */
  platform: Platform;
  /** Direct link to the market on baozi.bet */
  marketUrl: string;
  /** Open Graph / Twitter Card meta tags as HTML string */
  metaTags: string;
  /** Embed-ready object for Discord/Telegram */
  embed: CardEmbed;
  /** Market data snapshot used to generate the card */
  marketData: MarketCardData;
  /** Timestamp when this card was generated */
  generatedAt: string;
}

/** Embed structure for Discord/Telegram */
export interface CardEmbed {
  title: string;
  description: string;
  color: number;
  fields: EmbedField[];
  footer: EmbedFooter;
  url: string;
  thumbnail?: { url: string };
}

export interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export interface EmbedFooter {
  text: string;
  icon_url?: string;
}

/** Configuration for the share card engine */
export interface ShareCardConfig {
  /** Base URL for baozi.bet (default: https://baozi.bet) */
  baseUrl: string;
  /** Brand colors */
  colors: {
    yes: string;
    no: string;
    background: string;
    text: string;
    accent: string;
  };
  /** Include QR code in cards */
  includeQR: boolean;
  /** Custom footer text */
  footerText: string;
  /** Affiliate referral code to append to links */
  affiliateCode?: string;
}

/** Distribution result for a single platform */
export interface DistributionResult {
  platform: Platform;
  success: boolean;
  content: string;
  error?: string;
  timestamp: string;
}

/** Batch distribution result */
export interface BatchDistributionResult {
  marketId: string;
  marketQuestion: string;
  results: DistributionResult[];
  totalSuccess: number;
  totalFailed: number;
}

/** Card style template options */
export type CardStyle = 'default' | 'compact' | 'detailed' | 'minimal';

/** Options for card generation */
export interface CardGenerationOptions {
  style: CardStyle;
  platform: Platform;
  config?: Partial<ShareCardConfig>;
  /** Show countdown timer to close */
  showCountdown: boolean;
  /** Show volume/pool metrics */
  showVolume: boolean;
  /** Show odds bar visualization */
  showOddsBar: boolean;
  /** Custom call-to-action text */
  ctaText?: string;
}

/** Quote data for enriched cards */
export interface QuoteSnapshot {
  side: 'Yes' | 'No';
  betAmountSol: number;
  expectedPayoutSol: number;
  potentialProfitSol: number;
  impliedOdds: number;
  decimalOdds: number;
}
