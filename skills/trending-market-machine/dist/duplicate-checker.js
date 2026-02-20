"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMarketDuplicate = isMarketDuplicate;
exports.filterDuplicates = filterDuplicates;
/**
 * Duplicate Checker — Cross-references proposals against existing Baozi markets
 *
 * Checks both our local DB and the live Baozi REST API to prevent duplicates.
 */
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const tracker_1 = require("./tracker");
let cachedMarkets = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
/**
 * Fetch all markets from Baozi REST API
 */
async function fetchBaoziMarkets() {
    if (Date.now() - cacheTimestamp < CACHE_TTL && cachedMarkets.length > 0) {
        return cachedMarkets;
    }
    try {
        const response = await axios_1.default.get(`${config_1.config.apiUrl}/markets`, { timeout: 10000 });
        if (response.data.success) {
            const binary = (response.data.data.binary || []).map((m) => ({
                publicKey: m.publicKey,
                question: m.question,
                status: m.status,
                isBettingOpen: m.isBettingOpen,
            }));
            const race = (response.data.data.race || []).map((m) => ({
                publicKey: m.publicKey,
                question: m.question,
                status: m.status,
                isBettingOpen: true,
            }));
            cachedMarkets = [...binary, ...race];
            cacheTimestamp = Date.now();
            return cachedMarkets;
        }
    }
    catch (err) {
        console.error(`Failed to fetch Baozi markets: ${err.message}`);
    }
    return cachedMarkets; // Return stale cache if fetch fails
}
/**
 * Normalize a question for comparison
 */
function normalize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Calculate similarity between two strings (0-1)
 */
function similarity(a, b) {
    const normA = normalize(a);
    const normB = normalize(b);
    if (normA === normB)
        return 1.0;
    // Check containment
    if (normA.includes(normB) || normB.includes(normA))
        return 0.9;
    // Word overlap (Jaccard)
    const wordsA = new Set(normA.split(' '));
    const wordsB = new Set(normB.split(' '));
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
}
/**
 * Check if a proposed question is too similar to any existing market
 */
async function isMarketDuplicate(question) {
    // 1. Check local DB first (fast)
    if ((0, tracker_1.isDuplicate)(question)) {
        return { isDuplicate: true, reason: 'Exists in local database' };
    }
    // 2. Check live Baozi markets
    const markets = await fetchBaoziMarkets();
    for (const market of markets) {
        const sim = similarity(question, market.question);
        if (sim > 0.7) {
            return {
                isDuplicate: true,
                reason: `Similar to existing market (${(sim * 100).toFixed(0)}% match)`,
                similarMarket: market.question,
            };
        }
    }
    return { isDuplicate: false };
}
/**
 * Filter proposals, removing duplicates
 */
async function filterDuplicates(proposals) {
    const filtered = [];
    for (const p of proposals) {
        const check = await isMarketDuplicate(p.question);
        if (!check.isDuplicate) {
            filtered.push(p);
        }
        else {
            console.log(`  🔄 Skipping duplicate: "${p.question}" — ${check.reason}`);
        }
    }
    return filtered;
}
//# sourceMappingURL=duplicate-checker.js.map