"use strict";
/**
 * x402 Agent Intel Marketplace
 *
 * Pay-Per-Insight for Prediction Markets
 *
 * This skill enables:
 * - Analyst agents to publish market analysis behind x402 paywall
 * - Buyer agents to pay via x402 for access to insights
 * - Reputation tracking based on prediction accuracy
 * - Affiliate integration for recurring revenue
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
exports.registerAnalyst = registerAnalyst;
exports.getAnalystProfile = getAnalystProfile;
exports.getAllAnalysts = getAllAnalysts;
exports.publishAnalysis = publishAnalysis;
exports.getMyAnalyses = getMyAnalyses;
exports.listIntel = listIntel;
exports.listLatestIntel = listLatestIntel;
exports.getPaymentRequest = getPaymentRequest;
exports.purchaseIntel = purchaseIntel;
exports.getMyPurchases = getMyPurchases;
exports.betWithIntel = betWithIntel;
exports.updateAnalysisResolution = updateAnalysisResolution;
exports.getLeaderboard = getLeaderboard;
exports.getMarketInfo = getMarketInfo;
exports.getMarketQuote = getMarketQuote;
exports.listMarkets = listMarkets;
const db = __importStar(require("./database"));
const x402 = __importStar(require("./x402"));
const mcp = __importStar(require("./mcp-client"));
// ============================================================================
// ANALYST OPERATIONS
// ============================================================================
/**
 * Register as an analyst agent
 *
 * @param wallet - Agent's wallet address
 * @param displayName - Public display name
 * @param affiliateCode - Unique affiliate code (3-10 chars, alphanumeric)
 */
async function registerAnalyst(wallet, displayName, affiliateCode) {
    // Validate affiliate code
    if (!/^[A-Z0-9]{3,10}$/i.test(affiliateCode)) {
        return { success: false, error: 'Affiliate code must be 3-10 alphanumeric characters' };
    }
    // Check if code is already taken
    const existing = db.getAnalystByCode(affiliateCode);
    if (existing && existing.wallet !== wallet) {
        return { success: false, error: 'Affiliate code already in use' };
    }
    // Register the analyst
    const analyst = db.registerAnalyst(wallet, displayName, affiliateCode);
    // Optionally register with baozi affiliate system
    await mcp.registerAffiliate(wallet, affiliateCode);
    return { success: true, analyst };
}
/**
 * Get analyst profile with stats
 */
function getAnalystProfile(wallet) {
    const analyst = db.getAnalyst(wallet);
    if (!analyst)
        return null;
    const stats = db.getAnalystStats(wallet);
    return {
        analyst: analyst.displayName,
        wallet: analyst.wallet,
        affiliateCode: analyst.affiliateCode,
        stats
    };
}
/**
 * Get all registered analysts
 */
function getAllAnalysts() {
    const analysts = db.getAllAnalysts();
    return analysts.map(analyst => ({
        analyst: analyst.displayName,
        wallet: analyst.wallet,
        affiliateCode: analyst.affiliateCode,
        stats: db.getAnalystStats(analyst.wallet)
    }));
}
// ============================================================================
// PUBLISH ANALYSIS
// ============================================================================
/**
 * Publish market analysis behind x402 paywall
 *
 * @param analystWallet - Wallet of publishing analyst
 * @param marketAddress - Target market address
 * @param marketQuestion - Market question for display
 * @param thesis - Full analysis text (200-2000 chars)
 * @param recommendedSide - YES or NO
 * @param confidence - Confidence score 1-100
 * @param priceSol - Price in SOL for access
 */
async function publishAnalysis(analystWallet, marketAddress, marketQuestion, thesis, recommendedSide, confidence, priceSol) {
    // Validate analyst
    const analyst = db.getAnalyst(analystWallet);
    if (!analyst) {
        return { success: false, error: 'Analyst not registered. Call registerAnalyst first.' };
    }
    // Validate inputs
    if (thesis.length < 200 || thesis.length > 2000) {
        return { success: false, error: 'Thesis must be 200-2000 characters' };
    }
    if (confidence < 1 || confidence > 100) {
        return { success: false, error: 'Confidence must be between 1 and 100' };
    }
    if (priceSol < 0.001 || priceSol > 10) {
        return { success: false, error: 'Price must be between 0.001 and 10 SOL' };
    }
    // Create analysis
    const analysis = {
        id: generateId(),
        analystWallet,
        marketAddress,
        marketQuestion,
        thesis,
        recommendedSide,
        confidence,
        priceSol,
        createdAt: Date.now(),
        resolved: false,
        correct: null
    };
    db.createAnalysis(analysis);
    return { success: true, analysis };
}
/**
 * Get analyst's published analyses
 */
function getMyAnalyses(wallet) {
    return db.getAnalystAnalyses(wallet);
}
// ============================================================================
// DISCOVER & PURCHASE INTEL
// ============================================================================
/**
 * List available analyses for a market
 */
function listIntel(marketAddress) {
    const analyses = db.getAnalysesByMarket(marketAddress);
    return analyses.map(analysis => {
        const analyst = db.getAnalyst(analysis.analystWallet);
        const stats = db.getAnalystStats(analyst.wallet);
        return {
            id: analysis.id,
            analyst,
            marketAddress: analysis.marketAddress,
            marketQuestion: analysis.marketQuestion,
            thesisPreview: analysis.thesis.substring(0, 100) + '...',
            recommendedSide: analysis.recommendedSide,
            confidence: analysis.confidence,
            priceSol: analysis.priceSol,
            stats,
            createdAt: analysis.createdAt
        };
    });
}
/**
 * List latest analyses across all markets
 */
function listLatestIntel(limit = 20) {
    // This would need a separate query in production
    // For now, just return empty or implement pagination
    return [];
}
/**
 * Get x402 payment request for analysis
 */
async function getPaymentRequest(analysisId, buyerWallet) {
    const analysis = db.getAnalysis(analysisId);
    if (!analysis) {
        return { success: false, error: 'Analysis not found' };
    }
    const request = await x402.createPaymentRequest(analysis, buyerWallet);
    return { success: true, request };
}
/**
 * Purchase analysis via x402
 */
async function purchaseIntel(paymentRequest, buyerWallet, txId) {
    return x402.processPayment(paymentRequest, buyerWallet, txId);
}
/**
 * Get buyer's purchased intel
 */
function getMyPurchases(wallet) {
    return db.getPurchasesByBuyer(wallet);
}
// ============================================================================
// BETTING WITH AFFILIATE
// ============================================================================
/**
 * Place bet with analyst's affiliate code
 */
async function betWithIntel(marketAddress, side, amount, analysisId) {
    const analysis = db.getAnalysis(analysisId);
    if (!analysis) {
        return { success: false, error: 'Analysis not found' };
    }
    const analyst = db.getAnalyst(analysis.analystWallet);
    if (!analyst) {
        return { success: false, error: 'Analyst not found' };
    }
    // Place bet with affiliate code
    const result = await mcp.placeBet(marketAddress, side, amount, analyst.affiliateCode);
    if (!result.success) {
        return { success: false, error: 'Failed to place bet' };
    }
    // Generate affiliate link
    const affiliateLink = mcp.formatAffiliateLink(analyst.affiliateCode, marketAddress);
    return {
        success: true,
        txId: result.txId,
        affiliateLink
    };
}
// ============================================================================
// REPUTATION & TRACKING
// ============================================================================
/**
 * Update analysis resolution (called when market resolves)
 *
 * In production, this would be triggered by on-chain events
 */
async function updateAnalysisResolution(analysisId, actualOutcome) {
    const analysis = db.getAnalysis(analysisId);
    if (!analysis) {
        return { success: false, error: 'Analysis not found' };
    }
    if (analysis.resolved) {
        return { success: false, error: 'Analysis already resolved' };
    }
    const correct = analysis.recommendedSide === actualOutcome;
    db.updateAnalysisResolution(analysisId, correct);
    return { success: true, correct };
}
/**
 * Get leaderboard of top analysts
 */
function getLeaderboard(limit = 10) {
    const allAnalysts = getAllAnalysts();
    // Sort by accuracy (min 5 analyses required)
    const ranked = allAnalysts
        .filter(a => a.stats.totalAnalyses >= 5)
        .sort((a, b) => b.stats.accuracy - a.stats.accuracy)
        .slice(0, limit);
    return ranked;
}
/**
 * Get market info from MCP
 */
async function getMarketInfo(marketAddress) {
    return mcp.getMarket(marketAddress);
}
/**
 * Get current quotes
 */
async function getMarketQuote(marketAddress) {
    return mcp.getQuote(marketAddress);
}
/**
 * List active markets
 */
async function listMarkets(limit = 20) {
    return mcp.listMarkets(limit);
}
// ============================================================================
// UTILITIES
// ============================================================================
function generateId() {
    return 'intel_' + Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
// Initialize database on load
db.initDatabase();
// Export version
exports.VERSION = '1.0.0';
//# sourceMappingURL=index.js.map