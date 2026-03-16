"use strict";
/**
 * x402 Payment Handler
 *
 * Handles micropayments via x402 protocol
 * Note: This is a prototype implementation. In production,
 * use the actual x402 SDK for payment processing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentRequest = createPaymentRequest;
exports.processPayment = processPayment;
exports.verifyPayment = verifyPayment;
exports.getPaymentStatus = getPaymentStatus;
exports.createX402Headers = createX402Headers;
exports.isX402Available = isX402Available;
const database_1 = require("./database");
const config = {
    gatewayUrl: process.env.X402_GATEWAY_URL || 'https://api.x402.org',
    merchantWallet: process.env.MERCHANT_WALLET || 'DEMO_MERCHANT_WALLET',
    isSimulated: process.env.X402_SIMULATED === 'true' || true
};
// Generate a simulated payment
async function createPaymentRequest(analysis, buyerWallet) {
    const analyst = (0, database_1.getAnalyst)(analysis.analystWallet);
    return {
        to: analyst?.wallet || analysis.analystWallet,
        amount: analysis.priceSol,
        asset: 'SOL',
        description: `Intel for: ${analysis.marketQuestion}`,
        data: {
            analysisId: analysis.id,
            marketAddress: analysis.marketAddress
        }
    };
}
// Process x402 payment and deliver intel
async function processPayment(paymentRequest, buyerWallet, txId) {
    try {
        const { analysisId, marketAddress } = paymentRequest.data;
        // Get the analysis
        const analysis = (0, database_1.getAnalysis)(analysisId);
        if (!analysis) {
            return {
                success: false,
                error: 'Analysis not found'
            };
        }
        // Verify the market matches
        if (analysis.marketAddress !== marketAddress) {
            return {
                success: false,
                error: 'Market address mismatch'
            };
        }
        // In simulated mode, just record the purchase
        // In production, verify the actual payment on-chain
        if (config.isSimulated) {
            const purchaseId = uuidv4();
            const analyst = (0, database_1.getAnalyst)(analysis.analystWallet);
            (0, database_1.recordPurchase)(purchaseId, analysisId, buyerWallet, analysis.priceSol, analyst?.wallet || null, txId || `sim_${purchaseId}`);
            return {
                success: true,
                txId: txId || `sim_${purchaseId}`,
                analysis
            };
        }
        // In production, verify payment via x402 gateway
        // For now, still simulate
        const purchaseId = uuidv4();
        const analyst = (0, database_1.getAnalyst)(analysis.analystWallet);
        (0, database_1.recordPurchase)(purchaseId, analysisId, buyerWallet, analysis.priceSol, analyst?.wallet || null, txId || `sim_${purchaseId}`);
        return {
            success: true,
            txId: txId || `sim_${purchaseId}`,
            analysis
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Payment processing failed'
        };
    }
}
// Verify payment (for production x402 integration)
async function verifyPayment(txId) {
    if (config.isSimulated) {
        return true; // Simulated payments always succeed
    }
    // In production, query x402 gateway for payment verification
    try {
        const response = await fetch(`${config.gatewayUrl}/verify/${txId}`);
        const data = await response.json();
        return data.verified === true;
    }
    catch {
        return false;
    }
}
// Get payment status
async function getPaymentStatus(txId) {
    if (config.isSimulated) {
        return { status: 'confirmed', txId };
    }
    try {
        const response = await fetch(`${config.gatewayUrl}/status/${txId}`);
        return await response.json();
    }
    catch {
        return { status: 'unknown', txId };
    }
}
// Create x402 headers for MCP requests
function createX402Headers(payment) {
    return {
        'x402-payment': JSON.stringify(payment),
        'x402-version': '1.0'
    };
}
// Check if x402 is available
function isX402Available() {
    return !config.isSimulated || process.env.X402_ENABLED === 'true';
}
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
//# sourceMappingURL=x402.js.map