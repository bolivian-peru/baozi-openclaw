import { config } from "../config.ts";
import { parseArgs, optionalStringFlag, requireStringFlag } from "../lib/args.ts";
import { MarketplaceRepository } from "../lib/repository.ts";
import { nowIso, simpleId } from "../lib/utils.ts";
import { X402PaymentService } from "../services/payment.ts";
import { applyOutcomeToAnalyst } from "../services/reputation.ts";
import type { Purchase, PurchaseVerdict } from "../types.ts";

function verdictFromOutcome(prediction: string, actual?: string): PurchaseVerdict {
  if (!actual || !actual.trim()) {
    return "pending";
  }
  return prediction.trim().toLowerCase() === actual.trim().toLowerCase() ? "win" : "loss";
}

export async function runBuy(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const buyer = requireStringFlag(flags, ["buyer", "b"], "buyer handle");
  const postId = requireStringFlag(flags, ["post-id", "p"], "post id");
  const buyerAffiliateCode = optionalStringFlag(flags, ["buyer-affiliate"], "");
  const actual = optionalStringFlag(flags, ["actual"], "");

  const repo = new MarketplaceRepository();
  const post = repo.findPost(postId);
  if (!post) {
    throw new Error(`Post not found: ${postId}`);
  }

  const analyst = repo.findAnalyst(post.analystHandle);
  if (!analyst) {
    throw new Error(`Analyst not found for post: ${post.analystHandle}`);
  }

  const payments = new X402PaymentService(config.dryRun);
  const quote = payments.createQuote(post.id, buyer, post.priceUsd);
  const invoice = payments.createInvoice(quote);
  const settlement = payments.settleInvoice(invoice);

  const verdict = verdictFromOutcome(post.prediction, actual);
  const now = nowIso();

  const purchase: Purchase = {
    id: simpleId("purchase", `${buyer}-${post.id}`),
    postId: post.id,
    analystHandle: post.analystHandle,
    buyer,
    buyerAffiliateCode: buyerAffiliateCode || undefined,
    sellerAffiliateCode: analyst.affiliateCode,
    prediction: post.prediction,
    actual: actual || undefined,
    verdict,
    amountUsd: post.priceUsd,
    payment: { quote, invoice, settlement },
    createdAt: now,
    resolvedAt: verdict === "pending" ? undefined : now,
  };

  repo.addPurchase(purchase);

  if (verdict !== "pending") {
    repo.updateAnalyst(analyst.handle, (current) => applyOutcomeToAnalyst(current, purchase));
  }

  console.log(`Purchased intel ${post.id} by @${post.analystHandle}`);
  console.log(`Payment: quote=${quote.id} invoice=${invoice.id} settlement=${settlement.status}`);
  console.log(`Affiliate attribution: buyer=${purchase.buyerAffiliateCode ?? "none"} seller=${purchase.sellerAffiliateCode}`);
  console.log(`Verdict: ${purchase.verdict}`);
}
