import { parseArgs, optionalStringFlag } from "../lib/args.ts";
import { MarketplaceRepository } from "../lib/repository.ts";
import { parseTags } from "../lib/utils.ts";
import { rankDiscovery } from "../services/discovery.ts";

export async function runList(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const buyer = optionalStringFlag(flags, ["buyer", "b"], "anonymous");
  const interests = parseTags(optionalStringFlag(flags, ["interests", "i"], ""));
  const maxPriceRaw = optionalStringFlag(flags, ["max-price"], "");
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined;

  const repo = new MarketplaceRepository();
  const ranked = rankDiscovery(repo.listPosts(), repo.listAnalysts(), {
    buyer,
    interests,
    maxPrice: Number.isFinite(maxPrice as number) ? maxPrice : undefined,
  });

  if (ranked.length === 0) {
    console.log("No matching intel posts.");
    return;
  }

  console.log(`Discovery list for ${buyer} (${ranked.length} results)`);
  for (const item of ranked) {
    console.log(
      `- ${item.post.id} | @${item.post.analystHandle} | $${item.post.priceUsd.toFixed(2)} | score=${item.score} | tags=${item.post.tags.join(",")}`,
    );
    console.log(`  ${item.post.title}`);
    if (item.overlapTags.length > 0) {
      console.log(`  overlap: ${item.overlapTags.join(",")}`);
    }
  }
}
