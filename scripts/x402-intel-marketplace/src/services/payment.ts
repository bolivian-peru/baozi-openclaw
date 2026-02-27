import type { X402Invoice, X402Quote, X402Settlement } from "../types.ts";
import { nowIso, simpleId } from "../lib/utils.ts";

export class X402PaymentService {
  private readonly dryRun: boolean;

  constructor(dryRun: boolean) {
    this.dryRun = dryRun;
  }

  createQuote(postId: string, buyer: string, amountUsd: number): X402Quote {
    return {
      id: simpleId("quote", `${postId}-${buyer}`),
      postId,
      buyer,
      amountUsd,
      currency: "USDC",
      createdAt: nowIso(),
    };
  }

  createInvoice(quote: X402Quote): X402Invoice {
    const id = simpleId("inv", quote.id);
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    return {
      id,
      quoteId: quote.id,
      paymentUrl: `https://x402.local/pay/${id}?amount=${quote.amountUsd}`,
      expiresAt: expires,
      createdAt: nowIso(),
    };
  }

  settleInvoice(invoice: X402Invoice): X402Settlement {
    const status = "settled" as const;
    return {
      id: simpleId("set", invoice.id),
      invoiceId: invoice.id,
      status,
      simulated: this.dryRun,
      txHash: this.dryRun
        ? `sim_${invoice.id}`
        : `0x${Math.random().toString(16).slice(2).padEnd(64, "0")}`,
      settledAt: nowIso(),
    };
  }
}
