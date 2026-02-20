"use strict";
/**
 * Guardrail compliance for Baozi enricher.
 *
 * Golden rule: "Bettors must NEVER have information advantage while betting is open."
 *
 * For OPEN markets (isBettingOpen === true):
 *   - Only factual odds reporting (pool sizes, percentages, timing)
 *   - NO predictive analysis ("likely to win", "expected outcome", "should resolve YES")
 *
 * For CLOSED/RESOLVED markets:
 *   - Full analysis permitted including outcome predictions and retrospectives
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkGuardrails = checkGuardrails;
exports.formatFactualReport = formatFactualReport;
exports.sanitizeForOpenMarket = sanitizeForOpenMarket;
/** Patterns that constitute predictive language (case-insensitive) */
const PREDICTIVE_PATTERNS = [
    /\blikely\s+to\s+(win|resolve|happen|succeed|fail)\b/i,
    /\bexpected?\s+(?:to\s+)?(outcome|result|resolution)\b/i,
    /\bshould\s+resolve\s+(yes|no)\b/i,
    /\bprobably\s+(yes|no|will|won't)\b/i,
    /\bmy\s+prediction\b/i,
    /\bi\s+(?:think|believe|predict|expect)\b/i,
    /\bbet\s+on\s+(yes|no)\b/i,
    /\bstrong\s+(?:chance|probability|likelihood)\b/i,
    /\bwill\s+(?:almost\s+)?certainly\b/i,
    /\blean(?:s|ing)?\s+(?:towards?|yes|no)\b/i,
    /\bedge\s+(?:for|towards?)\s+(yes|no)\b/i,
    /\bconfident\s+(?:that|in)\b/i,
];
/**
 * Check if content complies with guardrails for the given market state.
 */
function checkGuardrails(content, isBettingOpen) {
    if (!isBettingOpen) {
        return {
            allowed: true,
            mode: 'FULL_ANALYSIS',
            reason: 'Market closed/resolved - full analysis permitted',
            violations: [],
        };
    }
    // Market is open - scan for predictive language
    const violations = [];
    for (const pattern of PREDICTIVE_PATTERNS) {
        const match = content.match(pattern);
        if (match) {
            violations.push(`Predictive language: "${match[0]}"`);
        }
    }
    if (violations.length > 0) {
        return {
            allowed: false,
            mode: 'FACTUAL_ONLY',
            reason: `Open market - ${violations.length} predictive statement(s) detected`,
            violations,
        };
    }
    return {
        allowed: true,
        mode: 'FACTUAL_ONLY',
        reason: 'Open market - content is factual only (compliant)',
        violations: [],
    };
}
/**
 * Format a guardrail-compliant factual report for an open market.
 * Only includes verifiable facts: odds, pool size, timing, category.
 */
function formatFactualReport(market, metadata) {
    const closeDate = new Date(market.closingTime);
    const now = new Date();
    const hoursLeft = Math.max(0, (closeDate.getTime() - now.getTime()) / (60 * 60 * 1000));
    let report = `📊 Market Snapshot\n\n`;
    report += `"${market.question}"\n\n`;
    report += `Current odds: YES ${market.yesPercent.toFixed(1)}% / NO ${market.noPercent.toFixed(1)}%\n`;
    report += `Pool: ${market.totalPoolSol.toFixed(4)} SOL\n`;
    report += `Closes: ${closeDate.toISOString().split('T')[0]} (${hoursLeft.toFixed(0)}h remaining)\n`;
    if (market.category)
        report += `Category: ${market.category}\n`;
    report += `Quality: ${metadata.qualityScore}/100\n`;
    report += `Tags: ${metadata.tags.join(', ')}\n`;
    report += `Timing: ${metadata.timingType} ${metadata.timingValid ? '✅' : '⚠️'}\n`;
    report += `\nbaozi.bet/market/${market.publicKey}`;
    return report.substring(0, 2000);
}
/**
 * Sanitize content by removing predictive language for open markets.
 * Returns cleaned content safe for posting.
 */
function sanitizeForOpenMarket(content) {
    let cleaned = content;
    for (const pattern of PREDICTIVE_PATTERNS) {
        cleaned = cleaned.replace(pattern, '[factual analysis only]');
    }
    return cleaned;
}
