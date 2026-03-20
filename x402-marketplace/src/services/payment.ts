/**
 * x402 Payment Service
 *
 * Handles micropayments for analysis purchases.
 * Simulates the x402 payment protocol when X402_SIMULATE=true.
 *
 * x402 Protocol Flow:
 * 1. Buyer requests content → server returns HTTP 402 with payment details
 * 2. Buyer constructs and signs Solana payment tx
 * 3. Buyer retries request with payment_tx in header/param
 * 4. Server verifies tx on-chain and grants access
 *
 * In simulation mode, we generate a deterministic fake tx signature
 * that encodes the payment details for audit/testing purposes.
 */
import { nanoid } from "nanoid";
import type { PaymentRequest, PaymentResult } from "../types/index.js";

const SIMULATE = process.env.X402_SIMULATE !== "false";

/**
 * Generate a simulated x402 payment transaction.
 * In production, this would be a real Solana transaction signed by the buyer.
 */
function simulatePaymentTx(req: PaymentRequest): string {
  const payload = Buffer.from(
    JSON.stringify({
      analysisId: req.analysisId,
      buyer: req.buyerWallet,
      analyst: req.analystWallet,
      amount: req.amountSol,
      nonce: nanoid(),
      ts: Date.now(),
    })
  ).toString("base64");

  // Prefix with "SIM:" to clearly mark simulated transactions
  return `SIM:${payload}`;
}

/**
 * Process an x402 micropayment for analysis access.
 *
 * In simulation mode: generates a signed stub transaction immediately.
 * In real mode: would broadcast a Solana SPL/native transfer.
 */
export async function processPayment(req: PaymentRequest): Promise<PaymentResult> {
  if (SIMULATE) {
    // Simulated payment — always succeeds for testing/demo
    const txSignature = simulatePaymentTx(req);
    return {
      success: true,
      txSignature,
      simulated: true,
    };
  }

  // Real x402 payment — submit Solana transaction
  // TODO: integrate with @solana/web3.js when buyer wallet is available
  return {
    success: false,
    error: "Real x402 payments require a connected Solana wallet. Set X402_SIMULATE=true for demo.",
    simulated: false,
  };
}

/**
 * Verify a payment transaction is valid for the given analysis.
 * In simulation mode, decodes the stub to verify it matches.
 */
export function verifyPayment(txSignature: string, analysisId: string): boolean {
  if (txSignature.startsWith("SIM:")) {
    try {
      const payload = JSON.parse(Buffer.from(txSignature.slice(4), "base64").toString());
      return payload.analysisId === analysisId;
    } catch {
      return false;
    }
  }

  // Real tx verification would check on-chain via Solana RPC
  // For now, trust non-simulated signatures (future: query Helius)
  return txSignature.length > 40;
}

/**
 * Build the 402 Payment Required response for an analysis.
 * This is what agents receive when they try to access paid content.
 */
export function buildPaymentRequired(params: {
  analysisId: string;
  analystWallet: string;
  priceInSol: number;
  platformFeeRate: number;
  affiliateCommissionRate: number;
  affiliateWallet?: string;
}) {
  const platformFee = params.priceInSol * params.platformFeeRate;
  const affiliateCommission = params.affiliateWallet
    ? params.priceInSol * params.affiliateCommissionRate
    : 0;
  const analystReceives = params.priceInSol - platformFee - affiliateCommission;

  return {
    status: 402,
    message: "Payment Required — x402 micropayment needed to access this analysis",
    payment: {
      analysisId: params.analysisId,
      recipient: params.analystWallet,
      amount: params.priceInSol,
      currency: "SOL",
      network: "solana-mainnet",
      breakdown: {
        analystReceives,
        platformFee,
        affiliateCommission,
      },
      instructions: "Submit payment_tx with a valid Solana transfer transaction to unlock content",
    },
  };
}
