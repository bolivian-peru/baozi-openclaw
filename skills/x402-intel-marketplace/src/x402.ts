/**
 * x402 Payment Protocol Handler
 *
 * Implements the x402 HTTP 402 Payment Required flow for agent-to-agent
 * micropayments. Compatible with the x402.org specification.
 *
 * Flow:
 *   1. Client hits resource → server returns 402 with payment requirements
 *   2. Client constructs SOL transfer transaction and signs it
 *   3. Client sends request with X-PAYMENT header (base64-encoded proof)
 *   4. Server verifies payment on-chain → returns resource
 */

import { Request, Response, NextFunction } from "express";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { X402PaymentRequest, X402PaymentProof } from "./types";

const NETWORK = process.env.SOLANA_NETWORK || "mainnet-beta";
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// Cache verified payments to prevent replay attacks
const verifiedPayments = new Set<string>();

export function build402Response(params: {
  priceSOL: number;
  payTo: string;
  resource: string;
  description: string;
}): X402PaymentRequest {
  const lamports = Math.round(params.priceSOL * LAMPORTS_PER_SOL);

  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: NETWORK === "mainnet-beta" ? "solana-mainnet" : "solana-devnet",
        maxAmountRequired: lamports.toString(),
        resource: params.resource,
        description: params.description,
        mimeType: "application/json",
        payTo: params.payTo,
        maxTimeoutSeconds: 300,
      },
    ],
    error: null,
  };
}

/**
 * Verify an x402 payment from the X-PAYMENT header.
 *
 * The payment proof is a base64-encoded JSON object containing:
 * - scheme: "exact"
 * - network: "solana-mainnet" | "solana-devnet"
 * - payload.signature: base58-encoded transaction signature
 * - payload.sender: base58-encoded sender public key
 * - payload.amountPaid: lamports as string
 * - payload.resource: the resource URL being paid for
 */
export async function verifyX402Payment(
  paymentHeader: string,
  expectedLamports: number,
  expectedPayTo: string,
  resource: string
): Promise<{ valid: boolean; signature: string; error?: string }> {
  let proof: X402PaymentProof;

  try {
    const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
    proof = JSON.parse(decoded);
  } catch {
    return { valid: false, signature: "", error: "Invalid payment header encoding" };
  }

  const payload = proof.payload;
  if (!payload?.signature || !payload?.sender || !payload?.amountPaid) {
    return { valid: false, signature: "", error: "Missing required payment fields" };
  }

  // Validate resource matches
  if (payload.resource !== resource) {
    return { valid: false, signature: payload.signature, error: "Resource mismatch" };
  }

  // Validate amount
  const paidLamports = parseInt(payload.amountPaid, 10);
  if (isNaN(paidLamports) || paidLamports < expectedLamports) {
    return {
      valid: false,
      signature: payload.signature,
      error: `Insufficient payment: expected ${expectedLamports}, got ${paidLamports}`,
    };
  }

  // Prevent replay attacks
  if (verifiedPayments.has(payload.signature)) {
    return { valid: false, signature: payload.signature, error: "Payment already used" };
  }

  // Verify on-chain
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const tx = await connection.getTransaction(payload.signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { valid: false, signature: payload.signature, error: "Transaction not found on-chain" };
    }

    if (tx.meta?.err) {
      return { valid: false, signature: payload.signature, error: "Transaction failed on-chain" };
    }

    // Verify the recipient received the expected amount
    const recipientIndex = tx.transaction.message.staticAccountKeys
      ? tx.transaction.message.staticAccountKeys.findIndex(
          (k) => k.toBase58() === expectedPayTo
        )
      : -1;

    if (recipientIndex !== -1 && tx.meta?.postBalances && tx.meta?.preBalances) {
      const received = tx.meta.postBalances[recipientIndex] - tx.meta.preBalances[recipientIndex];
      if (received < expectedLamports) {
        return {
          valid: false,
          signature: payload.signature,
          error: `On-chain amount mismatch: expected ${expectedLamports}, received ${received}`,
        };
      }
    }

    verifiedPayments.add(payload.signature);
    return { valid: true, signature: payload.signature };
  } catch (err: any) {
    // For demo mode: if RPC fails, accept the payment (development only)
    if (process.env.DEMO_MODE === "true") {
      verifiedPayments.add(payload.signature);
      return { valid: true, signature: payload.signature };
    }
    return { valid: false, signature: payload.signature, error: `RPC error: ${err.message}` };
  }
}

/**
 * Express middleware that enforces x402 payment for a route.
 * Attaches payment info to req.x402 on success.
 */
export function requireX402Payment(params: {
  priceSOL: number;
  payTo: string;
  getDescription: (req: Request) => string;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const paymentHeader = req.headers["x-payment"] as string | undefined;

    const resource = `${req.protocol}://${req.get("host")}${req.path}`;
    const payment402 = build402Response({
      priceSOL: params.priceSOL,
      payTo: params.payTo,
      resource,
      description: params.getDescription(req),
    });

    if (!paymentHeader) {
      res.status(402).json(payment402);
      return;
    }

    const result = await verifyX402Payment(
      paymentHeader,
      Math.round(params.priceSOL * LAMPORTS_PER_SOL),
      params.payTo,
      resource
    );

    if (!result.valid) {
      res.status(402).json({
        ...payment402,
        error: result.error || "Payment verification failed",
      });
      return;
    }

    // Attach payment proof to request
    (req as any).x402 = {
      signature: result.signature,
      paidLamports: Math.round(params.priceSOL * LAMPORTS_PER_SOL),
    };

    next();
  };
}
