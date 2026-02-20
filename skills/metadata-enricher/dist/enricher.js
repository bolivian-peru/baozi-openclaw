"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichMarket = enrichMarket;
exports.checkV7Compliance = checkV7Compliance;
exports.validateTiming = validateTiming;
exports.calculateQuality = calculateQuality;
exports.keywordClassify = keywordClassify;
exports.jaccardSimilarity = jaccardSimilarity;
async function classifyWithLLM(question, closingTime) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn('No OPENAI_API_KEY - using fallback classification');
        return null;
    }
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a prediction market classifier for Baozi. Analyze market questions and return JSON with:
- category: one of [crypto, sports, politics, tech, entertainment, science, economics, other]
- tags: array of 2-5 relevant tags
- timingType: "A" for event-based (will X happen by Y date?), "B" for measurement-period (what will X measure at Y time?), "unknown" if unclear
- eventTime: ISO date string of when the event would occur (for Type A) or null
- measurementStart: ISO date string of measurement period start (for Type B) or null
- dataSource: what data source could verify this (e.g., "CoinGecko", "ESPN", "SEC filings") or null
- isSubjective: true if the outcome can't be objectively verified
- reasoning: brief explanation of classification

Pari-mutuel timing rules:
- Type A (event-based): close_time must be <= event_time - 24h
- Type B (measurement-period): close_time must be < measurement_start
- Golden Rule: Bettors must NEVER have information advantage while betting is open`,
                    },
                    {
                        role: 'user',
                        content: `Classify this market:\nQuestion: "${question}"\nClosing time: ${closingTime}\n\nReturn ONLY valid JSON.`,
                    },
                ],
                max_tokens: 300,
                temperature: 0.3,
                response_format: { type: 'json_object' },
            }),
        });
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content)
            return null;
        return JSON.parse(content);
    }
    catch (err) {
        console.error('LLM classification failed:', err.message);
        return null;
    }
}
/**
 * Validate pari-mutuel v6.3 timing rules.
 */
function validateTiming(closingTime, timingType, eventTime, measurementStart) {
    const closeMs = new Date(closingTime).getTime();
    const bufferMs = 24 * 60 * 60 * 1000; // 24 hours
    if (timingType === 'A' && eventTime) {
        const eventMs = new Date(eventTime).getTime();
        if (isNaN(eventMs))
            return { valid: false, notes: 'Invalid event time' };
        const isValid = closeMs <= eventMs - bufferMs;
        return {
            valid: isValid,
            notes: isValid
                ? `Type A valid: closes ${((eventMs - closeMs) / bufferMs).toFixed(1)} days before event`
                : `Type A VIOLATION: close_time must be <= event_time - 24h. Gap: ${((eventMs - closeMs) / (60 * 60 * 1000)).toFixed(1)}h`,
        };
    }
    if (timingType === 'B' && measurementStart) {
        const measMs = new Date(measurementStart).getTime();
        if (isNaN(measMs))
            return { valid: false, notes: 'Invalid measurement start time' };
        const isValid = closeMs < measMs;
        return {
            valid: isValid,
            notes: isValid
                ? `Type B valid: closes ${((measMs - closeMs) / (60 * 60 * 1000)).toFixed(1)}h before measurement`
                : `Type B VIOLATION: close_time must be < measurement_start`,
        };
    }
    return { valid: true, notes: `Timing type: ${timingType} - no specific validation applicable` };
}
/**
 * Calculate quality score (0-100) based on 5 quality flags.
 */
function calculateQuality(question, classification, timingValid, totalPoolSol, existingMarkets) {
    const flags = [];
    let score = 0;
    // Flag 1: Question clarity (ends with ?, not too short, not too long)
    if (question.endsWith('?') && question.length >= 20 && question.length <= 200) {
        score += 20;
        flags.push('clear-question');
    }
    // Flag 2: Objective verifiability
    if (classification && !classification.isSubjective) {
        score += 20;
        flags.push('objectively-verifiable');
    }
    else if (!classification) {
        // Heuristic: questions with numbers, dates, or measurable terms are likely objective
        if (/\d/.test(question) || /by|before|after|reach|exceed/i.test(question)) {
            score += 15;
            flags.push('likely-verifiable');
        }
    }
    // Flag 3: Timing rules compliance
    if (timingValid) {
        score += 20;
        flags.push('timing-compliant');
    }
    // Flag 4: Has data source
    if (classification?.dataSource) {
        score += 20;
        flags.push(`data-source:${classification.dataSource}`);
    }
    // Flag 5: Not a duplicate
    const isDuplicate = existingMarkets.some(existing => {
        const similarity = jaccardSimilarity(question.toLowerCase(), existing.toLowerCase());
        return similarity > 0.45;
    });
    if (!isDuplicate) {
        score += 20;
        flags.push('unique');
    }
    else {
        flags.push('potential-duplicate');
    }
    return { score, flags };
}
function jaccardSimilarity(a, b) {
    const tokenize = (s) => s.replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
    const setA = new Set(tokenize(a));
    const setB = new Set(tokenize(b));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
}
/**
 * Fallback keyword classification when LLM is unavailable.
 */
function keywordClassify(question) {
    const q = question.toLowerCase();
    const categories = {
        crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'crypto', 'token', 'defi', 'nft'],
        sports: ['nba', 'nfl', 'mlb', 'fifa', 'world cup', 'championship', 'game', 'match', 'team', 'player'],
        politics: ['president', 'election', 'vote', 'congress', 'senate', 'trump', 'democrat', 'republican', 'policy'],
        tech: ['apple', 'google', 'ai', 'openai', 'microsoft', 'launch', 'release', 'software', 'chip'],
        entertainment: ['movie', 'album', 'oscars', 'grammy', 'box office', 'netflix', 'spotify'],
        science: ['nasa', 'space', 'climate', 'research', 'discovery', 'study'],
        economics: ['fed', 'rate', 'gdp', 'inflation', 'stock', 'market', 'dow', 'sp500'],
    };
    for (const [cat, keywords] of Object.entries(categories)) {
        if (keywords.some(k => q.includes(k))) {
            const matchedTags = keywords.filter(k => q.includes(k));
            return { category: cat, tags: matchedTags.slice(0, 5) };
        }
    }
    return { category: 'other', tags: [] };
}
/**
 * Enrich a single market with metadata.
 */
async function enrichMarket(market, existingQuestions) {
    // Try LLM classification first
    const llmResult = await classifyWithLLM(market.question, market.closingTime);
    let category;
    let tags;
    let timingType;
    if (llmResult) {
        category = llmResult.category;
        tags = llmResult.tags;
        timingType = llmResult.timingType;
    }
    else {
        const fallback = keywordClassify(market.question);
        category = fallback.category;
        tags = fallback.tags;
        timingType = 'unknown';
    }
    // Validate timing rules
    const timing = validateTiming(market.closingTime, timingType, llmResult?.eventTime || undefined, llmResult?.measurementStart || undefined);
    // Calculate quality score
    const quality = calculateQuality(market.question, llmResult, timing.valid, market.totalPoolSol, existingQuestions);
    // v7.0 compliance check
    const v7 = checkV7Compliance(market.question);
    // v7.0 non-compliant markets get quality penalty
    if (!v7.compliant) {
        quality.score = Math.min(quality.score, 20);
        quality.flags.push('v7-banned');
    }
    else {
        quality.flags.push('v7-compliant');
    }
    return {
        marketPda: market.publicKey,
        question: market.question,
        category,
        tags,
        qualityScore: quality.score,
        qualityFlags: quality.flags,
        timingType,
        timingValid: timing.valid,
        timingNotes: timing.notes,
        enrichedAt: new Date().toISOString(),
        v7Compliant: v7.compliant,
        v7Reason: v7.reason,
    };
}
// =============================================================================
// PARIMUTUEL RULES v7.0 COMPLIANCE
// =============================================================================
/** v7.0: Price prediction markets are BANNED */
const BANNED_PRICE_PATTERNS = [
    /will\s+\w+\s+(?:be\s+)?(?:above|below|reach|exceed|hit|break|surpass|cross)\s+\$[\d,]+/i,
    /(?:price|value)\s+(?:of\s+)?\w+\s+(?:above|below|over|under)/i,
    /\$[\d,]+\s+(?:by|on|before)\s+/i,
    /(?:bitcoin|btc|ethereum|eth|solana|sol|crypto)\s+(?:price|value)/i,
    /(?:stock|share|equity)\s+(?:price|value)/i,
];
/** v7.0: Measurement-period markets are BANNED */
const BANNED_MEASUREMENT_PATTERNS = [
    /during\s+(?:this|next|the)\s+(?:week|month|quarter|year)/i,
    /(?:weekly|monthly|quarterly|annual)\s+(?:average|total|volume)/i,
    /what\s+will\s+\w+\s+(?:measure|read|show)\s+(?:at|on)/i,
];
/**
 * Check v7.0 compliance for a market question.
 * Returns { compliant, reason }.
 */
function checkV7Compliance(question) {
    const q = question.toLowerCase();
    for (const pattern of BANNED_PRICE_PATTERNS) {
        if (pattern.test(q)) {
            return { compliant: false, reason: 'BANNED: Price prediction market (v7.0)' };
        }
    }
    for (const pattern of BANNED_MEASUREMENT_PATTERNS) {
        if (pattern.test(q)) {
            return { compliant: false, reason: 'BANNED: Measurement-period market (v7.0)' };
        }
    }
    return { compliant: true, reason: 'Event-based or general market — v7.0 compliant' };
}
