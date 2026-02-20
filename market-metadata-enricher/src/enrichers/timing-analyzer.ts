/**
 * Timing Analyzer
 * Analyzes market timing characteristics: urgency, duration, resolution windows
 */

import type { Market } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import type { TimingAnalysis } from '../types/index.js';

const HOUR_MS = 3600_000;
const DAY_MS = 86_400_000;

/**
 * Parse an ISO date string or Unix timestamp to milliseconds
 */
function toMs(timeValue: string): number {
  // Try parsing as ISO date string first
  const parsed = Date.parse(timeValue);
  if (!isNaN(parsed)) return parsed;

  // Try as a raw number (seconds)
  const num = Number(timeValue);
  if (!isNaN(num)) {
    // If it looks like seconds (< year 2100 in seconds), convert to ms
    return num < 4_102_444_800 ? num * 1000 : num;
  }

  return Date.now();
}

/**
 * Format hours into human-readable duration
 */
function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours < 24) return `${Math.round(hours)} hours`;
  if (hours < 168) return `${(hours / 24).toFixed(1)} days`;
  if (hours < 720) return `${(hours / 168).toFixed(1)} weeks`;
  return `${(hours / 720).toFixed(1)} months`;
}

/**
 * Analyze timing characteristics of a market
 */
export function analyzeMarketTiming(market: Market): TimingAnalysis {
  const now = Date.now();
  const closingMs = toMs(market.closingTime);
  const resolutionMs = toMs(market.resolutionTime);

  const hoursUntilClose = Math.max(0, (closingMs - now) / HOUR_MS);
  const hoursUntilResolution = Math.max(0, (resolutionMs - now) / HOUR_MS);

  const isClosingSoon = hoursUntilClose < 24 && hoursUntilClose > 0;
  const isLongTerm = hoursUntilClose > 30 * 24; // > 30 days
  const isShortTerm = hoursUntilClose < 3 * 24; // < 3 days

  // Resolution should be after closing, with some buffer
  const resolutionGapHours = (resolutionMs - closingMs) / HOUR_MS;
  const hasReasonableResolution = resolutionGapHours >= 1 && resolutionGapHours <= 7 * 24;

  // Determine urgency
  let urgency: 'low' | 'medium' | 'high';
  if (hoursUntilClose <= 0) {
    urgency = 'high'; // Already closed or closing
  } else if (hoursUntilClose <= 6) {
    urgency = 'high';
  } else if (hoursUntilClose < 48) {
    urgency = 'medium';
  } else {
    urgency = 'low';
  }

  // Build timing summary
  const parts: string[] = [];
  if (hoursUntilClose <= 0) {
    parts.push('Market is closed');
  } else {
    parts.push(`Closes in ${formatDuration(hoursUntilClose)}`);
  }
  parts.push(`Resolution in ${formatDuration(hoursUntilResolution)}`);

  if (isClosingSoon) parts.push('⚡ Closing soon!');
  if (isLongTerm) parts.push('📅 Long-term market');
  if (isShortTerm && hoursUntilClose > 0) parts.push('⏱️ Short-term market');
  if (!hasReasonableResolution) parts.push('⚠️ Unusual resolution window');

  return {
    hoursUntilClose,
    hoursUntilResolution,
    isClosingSoon,
    isLongTerm,
    isShortTerm,
    hasReasonableResolution,
    timingSummary: parts.join(' | '),
    urgency,
  };
}

/**
 * Check if a market was recently created (within the last N hours)
 */
export function isRecentlyCreated(market: Market, withinHours: number = 24): boolean {
  // Use the closing time and total pool to infer recency
  // New markets typically have small pools
  const closingMs = toMs(market.closingTime);
  const now = Date.now();
  const totalDurationHours = (closingMs - now) / HOUR_MS;

  // Markets with very small pools are likely new
  return market.totalPoolSol < 1.0 || totalDurationHours > (withinHours * 0.9);
}

/**
 * Get time-based urgency score (0-100)
 */
export function getTimingScore(market: Market): number {
  const analysis = analyzeMarketTiming(market);

  let score = 50; // Base score

  // Penalize if closing time is unreasonable
  if (analysis.hoursUntilClose <= 0) score -= 30; // Already closed
  if (analysis.hoursUntilClose < 1) score -= 20; // Less than 1 hour
  if (analysis.hoursUntilClose > 365 * 24) score -= 15; // More than a year

  // Bonus for reasonable timeframes
  if (analysis.hoursUntilClose >= 24 && analysis.hoursUntilClose <= 90 * 24) score += 20;

  // Resolution window check
  if (analysis.hasReasonableResolution) score += 20;
  else score -= 10;

  // Clamp
  return Math.max(0, Math.min(100, score));
}
