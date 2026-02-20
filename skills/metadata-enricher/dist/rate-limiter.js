"use strict";
/**
 * Rate limiter for market enrichment pipeline.
 * Prevents hammering RPC / Baozi API when processing many markets.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRateLimiterConfig = getRateLimiterConfig;
exports.batchArray = batchArray;
exports.sleep = sleep;
const DEFAULT_CONFIG = {
    batchSize: 5,
    perItemDelayMs: 3000,
    interBatchDelayMs: 10000,
    maxConcurrent: 1,
};
function getRateLimiterConfig() {
    return {
        batchSize: parseInt(process.env.BATCH_SIZE || String(DEFAULT_CONFIG.batchSize), 10),
        perItemDelayMs: parseInt(process.env.PER_ITEM_DELAY_MS || String(DEFAULT_CONFIG.perItemDelayMs), 10),
        interBatchDelayMs: parseInt(process.env.INTER_BATCH_DELAY_MS || String(DEFAULT_CONFIG.interBatchDelayMs), 10),
        maxConcurrent: parseInt(process.env.MAX_CONCURRENT || String(DEFAULT_CONFIG.maxConcurrent), 10),
    };
}
/**
 * Split an array into batches of the given size.
 */
function batchArray(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    return batches;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
