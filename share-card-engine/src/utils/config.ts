/**
 * Default configuration for Share Card Engine
 */
import type { ShareCardConfig, CardGenerationOptions } from '../types/index.js';

export const DEFAULT_CONFIG: ShareCardConfig = {
  baseUrl: 'https://baozi.bet',
  colors: {
    yes: '#22c55e',    // Green for YES
    no: '#ef4444',     // Red for NO
    background: '#0f172a',  // Dark slate
    text: '#f8fafc',   // Light text
    accent: '#f59e0b', // Amber accent (baozi brand)
  },
  includeQR: false,
  footerText: '🥟 Powered by Baozi.bet — Prediction Markets on Solana',
};

export const DEFAULT_OPTIONS: CardGenerationOptions = {
  style: 'default',
  platform: 'generic',
  showCountdown: true,
  showVolume: true,
  showOddsBar: true,
};

/**
 * Build a market URL with optional affiliate code
 */
export function buildMarketUrl(
  publicKey: string,
  config: ShareCardConfig = DEFAULT_CONFIG,
  affiliateCode?: string
): string {
  const base = `${config.baseUrl}/market/${publicKey}`;
  const code = affiliateCode || config.affiliateCode;
  return code ? `${base}?ref=${code}` : base;
}

/**
 * Merge partial config with defaults
 */
export function mergeConfig(partial?: Partial<ShareCardConfig>): ShareCardConfig {
  if (!partial) return { ...DEFAULT_CONFIG };
  return {
    ...DEFAULT_CONFIG,
    ...partial,
    colors: {
      ...DEFAULT_CONFIG.colors,
      ...(partial.colors || {}),
    },
  };
}

/**
 * Merge partial options with defaults
 */
export function mergeOptions(partial?: Partial<CardGenerationOptions>): CardGenerationOptions {
  if (!partial) return { ...DEFAULT_OPTIONS };
  return {
    ...DEFAULT_OPTIONS,
    ...partial,
  };
}
