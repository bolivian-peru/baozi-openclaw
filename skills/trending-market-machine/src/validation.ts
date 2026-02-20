/**
 * Validation — v7.0 Compliance & Timing Rules
 */
import { MarketProposal } from './trend-detector';

// =============================================================================
// v7.0 BANNED MARKET DETECTION
// =============================================================================

const PRICE_PREDICTION_PATTERNS = [
  /will\s+\w+\s+(?:be\s+)?(?:above|below|reach|exceed|hit|break|surpass|cross)\s+\$[\d,]+/i,
  /(?:price|value)\s+(?:of\s+)?\w+\s+(?:above|below|over|under)/i,
  /\$[\d,]+\s+(?:by|on|before)\s+/i,
  /(?:bitcoin|btc|ethereum|eth|solana|sol|crypto)\s+(?:price|value)/i,
  /(?:stock|share|equity)\s+(?:price|value)/i,
  /market\s+cap\s+(?:above|below|reach)/i,
];

const MEASUREMENT_PERIOD_PATTERNS = [
  /during\s+(?:this|next|the)\s+(?:week|month|quarter|year)/i,
  /(?:weekly|monthly|quarterly|annual)\s+(?:average|total|volume)/i,
  /(?:over|across|throughout)\s+(?:the\s+)?(?:period|timeframe|window)/i,
  /what\s+will\s+\w+\s+(?:measure|read|show)\s+(?:at|on)/i,
];

export function checkV7Compliance(question: string): { allowed: boolean; reason: string } {
  const q = question.toLowerCase();

  for (const pattern of PRICE_PREDICTION_PATTERNS) {
    if (pattern.test(q)) return { allowed: false, reason: 'BANNED: Price prediction market' };
  }

  for (const pattern of MEASUREMENT_PERIOD_PATTERNS) {
    if (pattern.test(q)) return { allowed: false, reason: 'BANNED: Measurement-period market' };
  }

  return { allowed: true, reason: 'v7.0 compliant' };
}

// =============================================================================
// v7.0 TIMING RULES (Type A only)
// =============================================================================

export interface TimingClassification {
  type: 'A';
  eventTime?: Date;
  valid: boolean;
  reason: string;
}

export function classifyAndValidateTiming(proposal: MarketProposal): TimingClassification {
  const question = proposal.question.toLowerCase();
  const closingMs = proposal.closingTime.getTime();
  const buffer24h = 24 * 60 * 60 * 1000;

  // Extract date from question
  const dateMatch = question.match(/(?:by|on|before)\s+(\d{4}-\d{2}-\d{2})/i);
  let eventDate: Date | null = null;

  if (dateMatch) {
    eventDate = new Date(dateMatch[1] + 'T23:59:59Z');
  }

  if (eventDate && !isNaN(eventDate.getTime())) {
    const valid = closingMs <= eventDate.getTime() - buffer24h;
    return {
      type: 'A',
      eventTime: eventDate,
      valid,
      reason: valid ? 'Valid Type A timing' : 'Type A VIOLATION: close_time > event_time - 24h',
    };
  }

  // Fallback: Assume LLM set correct time
  return {
    type: 'A',
    valid: true,
    reason: 'Type A (inferred): no explicit date in question',
  };
}

export function enforceTimingRules(proposal: MarketProposal): MarketProposal | null {
  const classification = classifyAndValidateTiming(proposal);
  if (classification.valid) return proposal;

  if (classification.eventTime) {
    const adjustedClose = new Date(classification.eventTime.getTime() - (24 * 60 * 60 * 1000));
    if (adjustedClose.getTime() <= Date.now()) return null;
    
    return { ...proposal, closingTime: adjustedClose };
  }
  return null;
}
