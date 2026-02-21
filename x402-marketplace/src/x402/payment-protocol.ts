/**
 * x402 Payment Protocol Implementation
 * 
 * Implements the x402 micropayment standard for agent-to-agent payments.
 * Based on HTTP 402 Payment Required status code for paywalled content.
 * 
 * Flow:
 * 1. Buyer requests analysis → receives 402 with payment details
 * 2. Buyer creates payment transaction → submits to x402 facilitator
 * 3. Payment confirmed → buyer receives analysis content
 * 4. Analyst receives SOL minus facilitator fee
 */

import { v4 as uuidv4 } from 'uuid';
import {
  X402PaymentRequest,
  X402PaymentReceipt,
  X402Headers,
  MarketAnalysis,
} from '../types/index.js';

/** x402 facilitator fee (1%) */
const FACILITATOR_FEE_BPS = 100;

/** Payment expiration window (15 minutes) */
const PAYMENT_EXPIRY_MS = 15 * 60 * 1000;

/**
 * x402PaymentProtocol handles the micropayment flow for analysis purchases.
 * 
 * In production, this integrates with on-chain Solana transactions.
 * The current implementation provides a complete protocol with simulated
 * transaction settlement for demo/testing purposes.
 */
export class X402PaymentProtocol {
  private pendingPayments: Map<string, X402PaymentRequest> = new Map();
  private confirmedReceipts: Map<string, X402PaymentReceipt> = new Map();
  private facilitatorWallet: string;

  constructor(facilitatorWallet: string) {
    this.facilitatorWallet = facilitatorWallet;
  }

  /**
   * Generate x402 payment headers for a paywalled analysis.
   * These headers tell the buyer agent how to pay.
   */
  createPaymentHeaders(analysis: MarketAnalysis, analystWallet: string): X402Headers {
    return {
      'X-Payment-Required': 'true',
      'X-Payment-Amount': analysis.priceSOL.toString(),
      'X-Payment-Currency': 'SOL',
      'X-Payment-Address': analystWallet,
      'X-Payment-Resource': analysis.id,
      'X-Payment-Expires': new Date(Date.now() + PAYMENT_EXPIRY_MS).toISOString(),
    };
  }

  /**
   * Create a payment request for a specific analysis.
   * Returns the payment request that the buyer needs to fulfill.
   */
  createPaymentRequest(
    analysis: MarketAnalysis,
    analystWallet: string
  ): X402PaymentRequest {
    const request: X402PaymentRequest = {
      payTo: analystWallet,
      amount: analysis.priceSOL,
      currency: 'SOL',
      memo: `x402:analysis:${analysis.id}`,
      expiresAt: Date.now() + PAYMENT_EXPIRY_MS,
      resourceId: analysis.id,
      resourceType: 'analysis',
    };

    this.pendingPayments.set(analysis.id, request);
    return request;
  }

  /**
   * Submit a payment for verification.
   * In production, this verifies the on-chain transaction.
   * Returns a receipt upon successful verification.
   */
  async submitPayment(
    analysisId: string,
    buyerWallet: string,
    transactionSignature: string
  ): Promise<X402PaymentReceipt> {
    const request = this.pendingPayments.get(analysisId);
    if (!request) {
      throw new X402Error('PAYMENT_NOT_FOUND', `No pending payment for analysis ${analysisId}`);
    }

    if (Date.now() > request.expiresAt) {
      this.pendingPayments.delete(analysisId);
      throw new X402Error('PAYMENT_EXPIRED', 'Payment request has expired');
    }

    // In production: verify on-chain transaction
    // - Check transaction signature exists on Solana
    // - Verify amount matches
    // - Verify recipient matches
    // - Verify transaction is finalized
    const verified = await this.verifyTransaction(
      transactionSignature,
      buyerWallet,
      request.payTo,
      request.amount
    );

    if (!verified) {
      throw new X402Error('PAYMENT_INVALID', 'Transaction verification failed');
    }

    const receipt: X402PaymentReceipt = {
      paymentId: uuidv4(),
      from: buyerWallet,
      to: request.payTo,
      amount: request.amount,
      currency: 'SOL',
      signature: transactionSignature,
      timestamp: Date.now(),
      status: 'confirmed',
      resourceId: analysisId,
    };

    this.confirmedReceipts.set(receipt.paymentId, receipt);
    this.pendingPayments.delete(analysisId);

    return receipt;
  }

  /**
   * Verify a payment receipt is valid.
   */
  verifyReceipt(paymentId: string): X402PaymentReceipt | null {
    return this.confirmedReceipts.get(paymentId) ?? null;
  }

  /**
   * Check if a specific analysis has been paid for by a buyer.
   */
  hasPayment(analysisId: string, buyerWallet: string): boolean {
    for (const receipt of this.confirmedReceipts.values()) {
      if (receipt.resourceId === analysisId && receipt.from === buyerWallet && receipt.status === 'confirmed') {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate facilitator fee for a payment amount.
   */
  calculateFee(amount: number): { fee: number; netAmount: number } {
    const fee = (amount * FACILITATOR_FEE_BPS) / 10000;
    return { fee, netAmount: amount - fee };
  }

  /**
   * Get all confirmed receipts for an analyst.
   */
  getAnalystReceipts(analystWallet: string): X402PaymentReceipt[] {
    return Array.from(this.confirmedReceipts.values())
      .filter(r => r.to === analystWallet && r.status === 'confirmed');
  }

  /**
   * Get all confirmed receipts for a buyer.
   */
  getBuyerReceipts(buyerWallet: string): X402PaymentReceipt[] {
    return Array.from(this.confirmedReceipts.values())
      .filter(r => r.from === buyerWallet && r.status === 'confirmed');
  }

  /**
   * Get payment stats.
   */
  getStats(): { totalPayments: number; totalVolume: number; pendingCount: number } {
    let totalVolume = 0;
    for (const receipt of this.confirmedReceipts.values()) {
      if (receipt.status === 'confirmed') {
        totalVolume += receipt.amount;
      }
    }
    return {
      totalPayments: this.confirmedReceipts.size,
      totalVolume,
      pendingCount: this.pendingPayments.size,
    };
  }

  /**
   * Verify an on-chain transaction.
   * In production, this queries the Solana RPC for the transaction.
   * For demo/testing, this simulates verification.
   */
  private async verifyTransaction(
    _signature: string,
    _from: string,
    _to: string,
    _amount: number
  ): Promise<boolean> {
    // Production implementation would:
    // 1. Connect to Solana RPC
    // 2. Fetch transaction by signature
    // 3. Parse transfer instruction
    // 4. Verify from, to, amount match
    // 5. Check transaction is finalized (not just confirmed)
    //
    // const connection = new Connection(clusterApiUrl('mainnet-beta'));
    // const tx = await connection.getTransaction(signature, { commitment: 'finalized' });
    // if (!tx) return false;
    // ... verify instructions match expected transfer ...
    
    // Simulated verification for demo
    return _signature.length > 0;
  }
}

/**
 * Custom error class for x402 payment errors.
 */
export class X402Error extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'X402Error';
  }
}

/**
 * Generate a simulated Solana transaction signature for testing.
 */
export function generateMockSignature(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let sig = '';
  for (let i = 0; i < 88; i++) {
    sig += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sig;
}
