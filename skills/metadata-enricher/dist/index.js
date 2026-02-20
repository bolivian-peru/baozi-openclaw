"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const baozi_api_1 = require("./baozi-api");
const enricher_1 = require("./enricher");
const signer_1 = require("./signer");
const config_1 = require("./config");
const rate_limiter_1 = require("./rate-limiter");
const guardrails_1 = require("./guardrails");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const LOG_FILE = path.join(__dirname, '..', 'enricher.log');
const STATE_FILE = path.join(__dirname, '..', 'analyzed-markets.json');
function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n');
}
function loadAnalyzedMarkets() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            return new Set(data);
        }
    }
    catch (e) {
        console.error('Error loading state:', e);
    }
    return new Set();
}
function saveAnalyzedMarkets(analyzed) {
    fs.writeFileSync(STATE_FILE, JSON.stringify([...analyzed], null, 2));
}
const api = new baozi_api_1.BaoziAPI();
let analyzedMarkets = loadAnalyzedMarkets();
let postCount = 0;
let commentCount = 0;
const POST_COOLDOWN_MS = 30 * 60 * 1000;
const COMMENT_COOLDOWN_MS = 60 * 60 * 1000;
let lastPostTime = 0;
let lastCommentTime = 0;
function formatEnrichmentPost(market, metadata) {
    // Guardrail check: open markets get factual-only reports
    if (market.isBettingOpen) {
        const factual = (0, guardrails_1.formatFactualReport)({ ...market, publicKey: market.publicKey }, { qualityScore: metadata.qualityScore, tags: metadata.tags, timingType: metadata.timingType, timingValid: metadata.timingValid });
        log(`  🛡️ Guardrail: open market -> factual-only report`);
        return factual;
    }
    // Closed/resolved markets get full analysis
    const emoji = metadata.qualityScore >= 80 ? '🟢' : metadata.qualityScore >= 60 ? '🟡' : '🔴';
    let post = `${emoji} Market Quality Report\n\n`;
    post += `"${market.question}"\n\n`;
    post += `Category: ${metadata.category}\n`;
    post += `Tags: ${metadata.tags.join(', ')}\n`;
    post += `Quality: ${metadata.qualityScore}/100\n`;
    post += `Timing: ${metadata.timingType} - ${metadata.timingValid ? 'Compliant' : 'VIOLATION'}\n`;
    // v7.0 compliance flag
    if (!metadata.v7Compliant) {
        post += `\n🚫 v7.0 NON-COMPLIANT: ${metadata.v7Reason}\n`;
    }
    else {
        post += `v7.0: ✅ Compliant\n`;
    }
    post += `Flags: ${metadata.qualityFlags.join(', ')}\n`;
    if (!metadata.timingValid) {
        post += `\n⚠️ ${metadata.timingNotes}\n`;
    }
    post += `\nbaozi.bet/market/${market.publicKey}`;
    return post.substring(0, 2000);
}
function formatEnrichmentComment(market, metadata) {
    const v7Flag = metadata.v7Compliant ? 'v7✅' : 'v7🚫';
    return `Quality: ${metadata.qualityScore}/100 | ${metadata.category} | ${metadata.timingType} timing ${metadata.timingValid ? '✅' : '⚠️'} | ${v7Flag} | ${metadata.qualityFlags.slice(0, 3).join(', ')}`.substring(0, 500);
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function analyzeNewMarkets() {
    log('🔍 Checking for markets to analyze...');
    const rateLimiter = (0, rate_limiter_1.getRateLimiterConfig)();
    log(`  Rate limits: batch=${rateLimiter.batchSize}, delay=${rateLimiter.perItemDelayMs}ms, interBatch=${rateLimiter.interBatchDelayMs}ms`);
    const allMarkets = await api.getAllMarkets();
    const unanalyzed = allMarkets.filter(m => !analyzedMarkets.has(m.publicKey));
    if (unanalyzed.length === 0) {
        log('No new markets to analyze');
        return;
    }
    log(`Found ${unanalyzed.length} markets to analyze (processing in batches of ${rateLimiter.batchSize})`);
    const existingQuestions = allMarkets.map(m => m.question);
    const batches = (0, rate_limiter_1.batchArray)(unanalyzed, rateLimiter.batchSize);
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        log(`\n📦 Batch ${batchIdx + 1}/${batches.length} (${batch.length} markets)`);
        for (const market of batch) {
            // Step 1: Fetch market data (already have it from allMarkets)
            log(`  [1/4] market fetched: "${market.question.substring(0, 60)}..."`);
            // Step 2: Enrich with LLM + data sources
            const metadata = await (0, enricher_1.enrichMarket)({ publicKey: market.publicKey, question: market.question, closingTime: market.closingTime, totalPoolSol: market.totalPoolSol }, existingQuestions);
            log(`  [2/4] data sources queried -> ${metadata.category} | Quality: ${metadata.qualityScore}/100`);
            // Step 3: Generate analysis (already done in enrichment)
            log(`  [3/4] analysis generated -> Timing: ${metadata.timingType} ${metadata.timingValid ? '✅' : '❌'} | Flags: ${metadata.qualityFlags.join(', ')}`);
            const now = Date.now();
            // Step 4: Post with guardrail compliance
            if (now - lastPostTime >= POST_COOLDOWN_MS) {
                const post = formatEnrichmentPost(market, metadata);
                // Double-check guardrails before posting
                const guardrailCheck = (0, guardrails_1.checkGuardrails)(post, market.isBettingOpen);
                if (!guardrailCheck.allowed) {
                    log(`  🛡️ Guardrail blocked: ${guardrailCheck.violations.join('; ')}`);
                    // Use sanitized version
                    const sanitized = (0, guardrails_1.sanitizeForOpenMarket)(post);
                    const recheck = (0, guardrails_1.checkGuardrails)(sanitized, market.isBettingOpen);
                    if (recheck.allowed) {
                        const success = await api.postToAgentBook(sanitized, market.publicKey);
                        if (success) {
                            postCount++;
                            lastPostTime = Date.now();
                        }
                    }
                }
                else {
                    const success = await api.postToAgentBook(post, market.publicKey);
                    if (success) {
                        postCount++;
                        lastPostTime = Date.now();
                        log(`  [4/4] posted -> AgentBook post #${postCount} (${guardrailCheck.mode})`);
                    }
                }
                await (0, rate_limiter_1.sleep)(rateLimiter.perItemDelayMs);
            }
            // Comment on market if cooldown allows
            if (now - lastCommentTime >= COMMENT_COOLDOWN_MS) {
                const comment = formatEnrichmentComment(market, metadata);
                // Guardrail check on comments too
                const commentCheck = (0, guardrails_1.checkGuardrails)(comment, market.isBettingOpen);
                if (commentCheck.allowed) {
                    const messageText = `Enricher analysis for ${market.publicKey} at ${Date.now()}`;
                    const { signature, message } = (0, signer_1.signMessage)(messageText);
                    const success = await api.commentOnMarket(market.publicKey, comment, signature, message);
                    if (success) {
                        commentCount++;
                        lastCommentTime = Date.now();
                        log(`  💬 Comment #${commentCount} on "${market.question.substring(0, 50)}..."`);
                    }
                }
                await (0, rate_limiter_1.sleep)(rateLimiter.perItemDelayMs);
            }
            analyzedMarkets.add(market.publicKey);
            saveAnalyzedMarkets(analyzedMarkets);
        }
        // Inter-batch delay
        if (batchIdx < batches.length - 1) {
            log(`  ⏳ Inter-batch delay: ${rateLimiter.interBatchDelayMs}ms`);
            await (0, rate_limiter_1.sleep)(rateLimiter.interBatchDelayMs);
        }
    }
    log(`\n✅ Analysis complete. Posts: ${postCount}, Comments: ${commentCount}, Total analyzed: ${analyzedMarkets.size}`);
}
async function main() {
    log('🔬 Metadata Enricher starting (LLM-powered)...');
    log(`Wallet: ${config_1.config.walletAddress}`);
    log(`API: ${config_1.config.apiUrl}`);
    log(`LLM: ${process.env.OPENAI_API_KEY ? 'GPT-4o-mini' : 'Keyword fallback'}`);
    log(`Previously analyzed: ${analyzedMarkets.size} markets`);
    // Initial analysis
    await analyzeNewMarkets();
    // Poll every 2 hours
    node_cron_1.default.schedule(`0 */2 * * *`, async () => {
        log('⏰ Scheduled analysis trigger');
        await analyzeNewMarkets();
    });
    log('✅ Cron scheduled (every 2h). Running...');
    process.on('SIGINT', () => {
        log(`🛑 Shutting down. Posts: ${postCount}, Comments: ${commentCount}, Analyzed: ${analyzedMarkets.size}`);
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        log(`🛑 Shutting down. Posts: ${postCount}, Comments: ${commentCount}, Analyzed: ${analyzedMarkets.size}`);
        process.exit(0);
    });
}
main().catch(err => {
    log(`💥 Fatal: ${err}`);
    process.exit(1);
});
