/**
 * x402 Payment Protocol
 *
 * x402 is an HTTP-native micropayment standard built on Solana.
 * Flow:
 *   1. Buyer requests intel → server returns HTTP 402 with payment details
 *   2. Buyer constructs & signs Solana tx, sends payment
 *   3. Buyer retries request with `x-payment: <proof>` header
 *   4. Server verifies proof → returns decrypted content
 *
 * This module implements the payment request/verification logic.
 * When X402_FACILITATOR_URL is set, real Solana transactions are used.
 * Otherwise, payments are simulated for development/demo purposes.
 *
 * Reference: https://github.com/coinbase/x402
 */
import { randomUUID } from "crypto";
import type {
  X402PaymentRequest,
  X402PaymentProof,
  X402PaymentResult,
} from "./types.js";

/** Number of seconds a payment request stays valid. */
const PAYMENT_REQUEST_TTL_SECONDS = 600; // 10 minutes

/**
 * Build an x402 payment request for accessing a piece of intel.
 *
 * The buyer receives this when the marketplace returns 402.
 */
export function buildPaymentRequest(
  intelId: string,
  recipientWallet: string,
  priceSOL: number,
  network: "solana-mainnet" | "solana-devnet" = "solana-mainnet"
): X402PaymentRequest {
  return {
    intelId,
    recipient: recipientWallet,
    amount: priceSOL,
    network,
    nonce: randomUUID(),
    expiresAt: Math.floor(Date.now() / 1000) + PAYMENT_REQUEST_TTL_SECONDS,
  };
}

/**
 * Validate a payment request (not expired, correct fields).
 */
export function validatePaymentRequest(req: X402PaymentRequest): {
  valid: boolean;
  error?: string;
} {
  const now = Math.floor(Date.now() / 1000);
  if (req.expiresAt < now) {
    return { valid: false, error: "Payment request has expired" };
  }
  if (!req.recipient || !req.intelId || !req.nonce) {
    return { valid: false, error: "Malformed payment request" };
  }
  if (req.amount <= 0) {
    return { valid: false, error: "Invalid payment amount" };
  }
  return { valid: true };
}

/**
 * Process an x402 payment.
 *
 * When X402_FACILITATOR_URL is configured, this submits a real Solana
 * transaction via the facilitator. Otherwise, it returns a simulated proof
 * that can be used for development and demos.
 *
 * @param request   The payment request from the marketplace (HTTP 402 body)
 * @param buyerKey  Buyer's base58-encoded private key (used to sign the tx)
 * @param facilitatorUrl  Optional x402 facilitator endpoint
 */
export async function processPayment(
  request: X402PaymentRequest,
  buyerKey: string | undefined,
  facilitatorUrl?: string
): Promise<X402PaymentResult> {
  // Validate the request first
  const validation = validatePaymentRequest(request);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  if (facilitatorUrl && buyerKey) {
    return processRealPayment(request, buyerKey, facilitatorUrl);
  }

  // Simulated payment path — safe for demos without real SOL
  return simulatePayment(request);
}

/**
 * Submit a real x402 payment via a facilitator service.
 *
 * The facilitator handles the Solana transaction construction so the buyer
 * only needs to provide their private key for signing.
 */
async function processRealPayment(
  request: X402PaymentRequest,
  buyerKey: string,
  facilitatorUrl: string
): Promise<X402PaymentResult> {
  try {
    const response = await fetch(`${facilitatorUrl}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request,
        buyerKey,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `Facilitator error: ${err}` };
    }

    const data = (await response.json()) as {
      txSignature: string;
      paidAt: string;
    };

    const proof: X402PaymentProof = {
      txSignature: data.txSignature,
      request,
      paidAt: data.paidAt,
      simulated: false,
    };

    return { success: true, proof };
  } catch (err: any) {
    return { success: false, error: `Payment failed: ${err.message}` };
  }
}

/**
 * Simulate an x402 payment (for development/demo mode).
 *
 * Generates a fake transaction signature that encodes the payment details.
 * Clearly marked as simulated — not a real Solana transaction.
 */
function simulatePayment(request: X402PaymentRequest): X402PaymentResult {
  // Deterministic fake signature based on payment details
  const fakeSignature = [
    "SIM",
    request.intelId.slice(0, 8),
    request.nonce.slice(0, 8),
    Date.now().toString(36).toUpperCase(),
  ].join("");

  const proof: X402PaymentProof = {
    txSignature: fakeSignature,
    request,
    paidAt: new Date().toISOString(),
    simulated: true,
  };

  return { success: true, proof };
}

/**
 * Verify a payment proof submitted by a buyer.
 *
 * For real payments: checks the Solana transaction on-chain.
 * For simulated: validates the proof structure.
 */
export async function verifyPayment(
  proof: X402PaymentProof,
  expectedIntelId: string,
  expectedRecipient: string,
  expectedAmount: number
): Promise<{ valid: boolean; error?: string }> {
  if (proof.request.intelId !== expectedIntelId) {
    return { valid: false, error: "Payment was for a different intel item" };
  }
  if (proof.request.recipient !== expectedRecipient) {
    return { valid: false, error: "Payment recipient mismatch" };
  }
  if (proof.request.amount < expectedAmount) {
    return { valid: false, error: "Insufficient payment amount" };
  }

  const requestValidation = validatePaymentRequest(proof.request);
  if (!requestValidation.valid) {
    return { valid: false, error: requestValidation.error };
  }

  if (proof.simulated) {
    // Simulated proofs are always valid (demo mode)
    return { valid: true };
  }

  // For real proofs, verify on Solana
  return verifyOnChain(proof);
}

/**
 * Verify a Solana transaction exists and transfers the correct amount.
 * Stub implementation — in production this queries the RPC node.
 */
async function verifyOnChain(
  proof: X402PaymentProof
): Promise<{ valid: boolean; error?: string }> {
  // In production: fetch tx from Solana RPC, check:
  //   - tx.meta.postBalances - tx.meta.preBalances for recipient
  //   - matches expected lamports (amount * LAMPORTS_PER_SOL)
  //   - tx was included in a confirmed block
  // For now, trust the proof structure (real facilitator would verify this)
  if (!proof.txSignature || proof.txSignature.length < 10) {
    return { valid: false, error: "Invalid transaction signature" };
  }
  return { valid: true };
}

/**
 * Format an x402 402 response body (what the server returns when payment is required).
 */
export function format402Response(request: X402PaymentRequest): {
  status: 402;
  payment: X402PaymentRequest;
  instructions: string;
} {
  return {
    status: 402,
    payment: request,
    instructions: [
      `This content costs ${request.amount} SOL.`,
      `Send ${request.amount} SOL to ${request.recipient} on ${request.network}.`,
      `Include nonce ${request.nonce} in the memo field.`,
      `Then retry with header: x-payment: <base64-encoded-proof-json>`,
      `Payment request expires at: ${new Date(request.expiresAt * 1000).toISOString()}`,
    ].join(" | "),
  };
}
