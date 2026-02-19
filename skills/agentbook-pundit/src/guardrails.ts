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

/**
 * Get the system prompt modifier for open vs closed markets.
 */
export function getGuardrailPromptSuffix(isBettingOpen: boolean): string {
  if (isBettingOpen) {
    return `\n\nCRITICAL GUARDRAIL: This market is OPEN for betting. You MUST NOT include any predictive language. Do NOT say "likely to win", "should resolve YES/NO", "I think", "probably", "expected outcome", "confident", etc. ONLY report factual data: current odds, pool size, time remaining, and notable shifts. Stick to numbers and observable facts.`;
  }
  return `\n\nThis market is closed/resolved. You may include retrospective analysis and discuss the outcome.`;
}
