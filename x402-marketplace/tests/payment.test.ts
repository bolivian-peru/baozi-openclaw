import { describe, it, expect, beforeEach } from "vitest";
import { processPayment, verifyPayment, buildPaymentRequired } from "../src/services/payment.js";
import type { PaymentRequest } from "../src/types/index.js";

process.env.X402_SIMULATE = "true";

const makeRequest = (overrides: Partial<PaymentRequest> = {}): PaymentRequest => ({
  analysisId: "analysis-abc123",
  analystWallet: "ANALYST_WALLET_ADDR_1111111111111111111111",
  buyerWallet: "BUYER_WALLET_ADDR_11111111111111111111111",
  amountSol: 0.001,
  platformFee: 0.00005,
  affiliateCommission: 0,
  memo: "test payment",
  ...overrides,
});

describe("processPayment (simulated)", () => {
  it("succeeds and returns a simulated tx signature", async () => {
    const result = await processPayment(makeRequest());
    expect(result.success).toBe(true);
    expect(result.txSignature).toBeTruthy();
    expect(result.simulated).toBe(true);
  });

  it("tx signature starts with SIM: prefix", async () => {
    const result = await processPayment(makeRequest());
    expect(result.txSignature).toMatch(/^SIM:/);
  });

  it("generates different tx signatures for different payments", async () => {
    const r1 = await processPayment(makeRequest({ buyerWallet: "BUYER_1111111111111111111111111111111111" }));
    const r2 = await processPayment(makeRequest({ buyerWallet: "BUYER_2222222222222222222222222222222222" }));
    expect(r1.txSignature).not.toBe(r2.txSignature);
  });

  it("encodes analysisId in the simulated tx", async () => {
    const result = await processPayment(makeRequest({ analysisId: "my-specific-analysis" }));
    expect(result.txSignature).toBeTruthy();
    // The SIM: tx should be verifiable for the same analysisId
    expect(verifyPayment(result.txSignature!, "my-specific-analysis")).toBe(true);
  });
});

describe("verifyPayment", () => {
  it("verifies a valid simulated payment", async () => {
    const result = await processPayment(makeRequest({ analysisId: "verify-me" }));
    expect(verifyPayment(result.txSignature!, "verify-me")).toBe(true);
  });

  it("rejects payment for wrong analysisId", async () => {
    const result = await processPayment(makeRequest({ analysisId: "analysis-A" }));
    expect(verifyPayment(result.txSignature!, "analysis-B")).toBe(false);
  });

  it("rejects invalid base64 payload", () => {
    expect(verifyPayment("SIM:NOT_VALID_BASE64!!!", "anything")).toBe(false);
  });

  it("trusts long non-simulated signatures (real tx placeholder)", () => {
    const realStyleSig = "5eyJvFaQ3JHWkq8YhZzp7xLvVT2nRoXdPmAe0bBgCuNMiKs9jfWrHcDyUlTVwPqQ";
    expect(verifyPayment(realStyleSig, "any-analysis")).toBe(true);
  });
});

describe("buildPaymentRequired", () => {
  it("returns 402 status", () => {
    const resp = buildPaymentRequired({
      analysisId: "abc",
      analystWallet: "ANALYST_WALLET_ADDR_1111111111111111111111",
      priceInSol: 0.01,
      platformFeeRate: 0.05,
      affiliateCommissionRate: 0.10,
    });
    expect(resp.status).toBe(402);
    expect(resp.payment.amount).toBe(0.01);
  });

  it("computes fee breakdown correctly", () => {
    const resp = buildPaymentRequired({
      analysisId: "abc",
      analystWallet: "ANALYST_WALLET_ADDR_1111111111111111111111",
      priceInSol: 0.01,
      platformFeeRate: 0.05,
      affiliateCommissionRate: 0.10,
      affiliateWallet: "AFF_WALLET_1111111111111111111111111111111",
    });

    expect(resp.payment.breakdown.platformFee).toBeCloseTo(0.0005);
    expect(resp.payment.breakdown.affiliateCommission).toBeCloseTo(0.001);
    expect(resp.payment.breakdown.analystReceives).toBeCloseTo(0.0085);
  });

  it("has no affiliate commission without affiliate wallet", () => {
    const resp = buildPaymentRequired({
      analysisId: "abc",
      analystWallet: "ANALYST_WALLET_ADDR_1111111111111111111111",
      priceInSol: 0.01,
      platformFeeRate: 0.05,
      affiliateCommissionRate: 0.10,
    });

    expect(resp.payment.breakdown.affiliateCommission).toBe(0);
    expect(resp.payment.breakdown.analystReceives).toBeCloseTo(0.0095);
  });

  it("includes SOL network and solana-mainnet", () => {
    const resp = buildPaymentRequired({
      analysisId: "abc",
      analystWallet: "ANALYST_WALLET_ADDR_1111111111111111111111",
      priceInSol: 0.001,
      platformFeeRate: 0.05,
      affiliateCommissionRate: 0.10,
    });

    expect(resp.payment.currency).toBe("SOL");
    expect(resp.payment.network).toBe("solana-mainnet");
  });
});
