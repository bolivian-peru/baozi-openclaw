/**
 * Guardrail compliance for AgentBook Pundit.
 *
 * Golden rule: "Bettors must NEVER have information advantage while betting is open."
 *
 * Open markets: FACTUAL ONLY - odds, pool, timing. No predictions.
 * Closed/resolved markets: Full analysis with outcome discussion allowed.
 */

/** Predictive language patterns to block on open markets */
const PREDICTIVE_PATTERNS = [
  /\blikely\s+to\s+(win|resolve|happen|succeed|fail)\b/i,
  /\bexpect(?:ed)?\s+(?:to\s+)?(outcome|result|resolution)\b/i,
  /\bshould\s+resolve\s+(yes|no)\b/i,
  /\bprobably\s+(yes|no|will|won't)\b/i,
  /\bmy\s+prediction\b/i,
  /\bi\s+(?:think|believe|predict|expect)\s/i,
  /\bbet\s+on\s+(yes|no)\b/i,
  /\bstrong\s+(?:chance|probability|likelihood)\b/i,
  /\bwill\s+(?:almost\s+)?certainly\b/i,
  /\blean(?:s|ing)?\s+(?:towards?|yes|no)\b/i,
  /\bedge\s+(?:for|towards?)\s+(yes|no)\b/i,
  /\bconfident\s+(?:that|in)\b/i,
  /\bwill\s+(?:definitely|surely)\b/i,
];

/**
 * Check if content contains predictive language.
 */
export function containsPredictiveLanguage(content: string): { hasPrediction: boolean; matches: string[] } {
  const matches: string[] = [];
  for (const pattern of PREDICTIVE_PATTERNS) {
    const match = content.match(pattern);
    if (match) matches.push(match[0]);
  }
  return { hasPrediction: matches.length > 0, matches };
}

/**
 * Sanitize content by replacing predictive language with factual placeholder.
 */
export function sanitize(content: string): string {
  let cleaned = content;
  for (const pattern of PREDICTIVE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[odds-based analysis]');
  }
  return cleaned;
}

// =============================================================================
// PARIMUTUEL RULES v7.0 AWARENESS
// =============================================================================

/** v7.0: Price prediction markets are BANNED */
const BANNED_PRICE_PATTERNS = [
  /will\s+\w+\s+(?:be\s+)?(?:above|below|reach|exceed|hit|break|surpass|cross)\s+\$[\d,]+/i,
  /(?:price|value)\s+(?:of\s+)?\w+\s+(?:above|below|over|under)/i,
  /(?:bitcoin|btc|ethereum|eth|solana|sol|crypto)\s+(?:price|value)/i,
];

/** v7.0: Measurement-period markets are BANNED */
const BANNED_MEASUREMENT_PATTERNS = [
  /during\s+(?:this|next|the)\s+(?:week|month|quarter|year)/i,
  /(?:weekly|monthly|quarterly|annual)\s+(?:average|total|volume)/i,
];

/**
 * Check if a market question violates v7.0 rules.
 */
export function isV7Banned(question: string): { banned: boolean; reason: string } {
  const q = question.toLowerCase();
  for (const p of BANNED_PRICE_PATTERNS) {
    if (p.test(q)) return { banned: true, reason: 'Price prediction (v7.0 banned)' };
  }
  for (const p of BANNED_MEASUREMENT_PATTERNS) {
    if (p.test(q)) return { banned: true, reason: 'Measurement-period (v7.0 banned)' };
  }
  return { banned: false, reason: 'v7.0 compliant' };
}

/**
 * Get the system prompt modifier for open vs closed markets.
 */
export function getGuardrailPromptSuffix(isBettingOpen: boolean): string {
  if (isBettingOpen) {
    return `\n\nCRITICAL GUARDRAIL: This market is OPEN for betting. You MUST NOT include any predictive language. Do NOT say "likely to win", "should resolve YES/NO", "I think", "probably", "expected outcome", "confident", etc. ONLY report factual data: current odds, pool size, time remaining, and notable shifts. Stick to numbers and observable facts.\n\nNOTE (v7.0): If this market involves price predictions or measurement periods, flag it as non-compliant with parimutuel rules v7.0.`;
  }
  return `\n\nThis market is closed/resolved. You may include retrospective analysis and discuss the outcome.`;
}
