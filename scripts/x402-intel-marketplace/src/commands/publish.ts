import { parseArgs, optionalStringFlag, requireStringFlag } from "../lib/args.ts";
import { MarketplaceRepository } from "../lib/repository.ts";
import { nowIso, parseTags, simpleId } from "../lib/utils.ts";
import type { IntelPost } from "../types.ts";

export async function runPublish(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const handle = requireStringFlag(flags, ["handle", "h"], "analyst handle");
  const title = requireStringFlag(flags, ["title", "t"], "post title");
  const summary = requireStringFlag(flags, ["summary"], "post summary");
  const content = requireStringFlag(flags, ["content"], "paywalled content");
  const prediction = optionalStringFlag(flags, ["prediction"], "neutral") || "neutral";
  const eventKey = optionalStringFlag(flags, ["event", "event-key"], `event-${Date.now()}`);
  const confidenceRaw = Number(optionalStringFlag(flags, ["confidence"], "0.55"));
  const confidence = Number.isFinite(confidenceRaw) ? Math.min(Math.max(confidenceRaw, 0), 1) : 0.55;
  const priceRaw = Number(optionalStringFlag(flags, ["price"], "10"));
  const priceUsd = Number.isFinite(priceRaw) && priceRaw > 0 ? Math.round(priceRaw * 100) / 100 : 10;
  const tags = parseTags(optionalStringFlag(flags, ["tags"], "intel"));

  const repo = new MarketplaceRepository();
  const analyst = repo.findAnalyst(handle);
  if (!analyst) {
    throw new Error(`Analyst not found: ${handle}. Please run register first.`);
  }

  const now = nowIso();
  const post: IntelPost = {
    id: simpleId("intel", `${handle}-${title}`),
    analystHandle: analyst.handle,
    title,
    summary,
    content,
    prediction,
    confidence,
    eventKey,
    tags,
    priceUsd,
    status: "listed",
    listedAt: now,
    updatedAt: now,
    purchaseCount: 0,
  };

  repo.addPost(post);
  repo.updateAnalyst(analyst.handle, (current) => {
    const next = structuredClone(current);
    next.stats.postsPublished += 1;
    next.updatedAt = now;
    return next;
  });

  console.log(`Intel post published: ${post.id}`);
  console.log(`Analyst: @${post.analystHandle} | Price: $${post.priceUsd.toFixed(2)} | Event: ${post.eventKey}`);
  console.log(`Summary: ${post.summary}`);
}
