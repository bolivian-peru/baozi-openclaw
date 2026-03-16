/**
 * x402 Payment Handler
 * 
 * Handles micropayments via x402 protocol
 * Note: This is a prototype implementation. In production, 
 * use the actual x402 SDK for payment processing.
 */

import { X402PaymentRequest, X402PaymentResponse, MarketAnalysis } from './types';
import { getAnalysis, getAnalyst, recordPurchase } from './database';

// Simulated x402 payment gateway
// In production, this would connect to actual x402 infrastructure

interface X402Config {
  gatewayUrl: string;
  merchantWallet: string;
  isSimulated: boolean;
}

const config: X402Config = {
  gatewayUrl: process.env.X402_GATEWAY_URL || 'https://api.x402.org',
  merchantWallet: process.env.MERCHANT_WALLET || 'DEMO_MERCHANT_WALLET',
  isSimulated: process.env.X402_SIMULATED === 'true' || true
};

// Generate a simulated payment
export async function createPaymentRequest(
  analysis: MarketAnalysis,
  buyerWallet: string
): Promise<X402PaymentRequest> {
  const analyst = getAnalyst(analysis.analystWallet);
  
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
export async function processPayment(
  paymentRequest: X402PaymentRequest,
  buyerWallet: string,
  txId?: string
): Promise<X402PaymentResponse> {
  try {
    const { analysisId, marketAddress } = paymentRequest.data;
    
    // Get the analysis
    const analysis = getAnalysis(analysisId);
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
      const analyst = getAnalyst(analysis.analystWallet);
      
      recordPurchase(
        purchaseId,
        analysisId,
        buyerWallet,
        analysis.priceSol,
        analyst?.wallet || null,
        txId || `sim_${purchaseId}`
      );
      
      return {
        success: true,
        txId: txId || `sim_${purchaseId}`,
        analysis
      };
    }
    
    // In production, verify payment via x402 gateway
    // For now, still simulate
    const purchaseId = uuidv4();
    const analyst = getAnalyst(analysis.analystWallet);
    
    recordPurchase(
      purchaseId,
      analysisId,
      buyerWallet,
      analysis.priceSol,
      analyst?.wallet || null,
      txId || `sim_${purchaseId}`
    );
    
    return {
      success: true,
      txId: txId || `sim_${purchaseId}`,
      analysis
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    };
  }
}

// Verify payment (for production x402 integration)
export async function verifyPayment(txId: string): Promise<boolean> {
  if (config.isSimulated) {
    return true; // Simulated payments always succeed
  }
  
  // In production, query x402 gateway for payment verification
  try {
    const response = await fetch(`${config.gatewayUrl}/verify/${txId}`);
    const data = await response.json() as { verified?: boolean };
    return data.verified === true;
  } catch {
    return false;
  }
}

// Get payment status
export async function getPaymentStatus(txId: string): Promise<any> {
  if (config.isSimulated) {
    return { status: 'confirmed', txId };
  }
  
  try {
    const response = await fetch(`${config.gatewayUrl}/status/${txId}`);
    return await response.json();
  } catch {
    return { status: 'unknown', txId };
  }
}

// Create x402 headers for MCP requests
export function createX402Headers(payment: X402PaymentRequest): Record<string, string> {
  return {
    'x402-payment': JSON.stringify(payment),
    'x402-version': '1.0'
  };
}

// Check if x402 is available
export function isX402Available(): boolean {
  return !config.isSimulated || process.env.X402_ENABLED === 'true';
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
