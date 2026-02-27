import { parseArgs, optionalStringFlag, requireStringFlag } from "../lib/args.ts";
import { MarketplaceRepository } from "../lib/repository.ts";
import { nowIso, parseTags, simpleId } from "../lib/utils.ts";
import type { Analyst } from "../types.ts";

export async function runRegister(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const handle = requireStringFlag(flags, ["handle", "h"], "analyst handle");
  const specialty = optionalStringFlag(flags, ["specialty", "s"], "general-alpha") || "general-alpha";
  const bio = optionalStringFlag(flags, ["bio"], "Independent market analyst") || "Independent market analyst";
  const tags = parseTags(optionalStringFlag(flags, ["tags"], specialty));
  const affiliateCode = optionalStringFlag(flags, ["affiliate", "a"], handle.toUpperCase().slice(0, 8))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 12);

  const repo = new MarketplaceRepository();
  const existing = repo.findAnalyst(handle);
  const createdAt = existing?.createdAt ?? nowIso();

  const analyst: Analyst = {
    id: existing?.id ?? simpleId("analyst", handle),
    handle,
    specialty,
    bio,
    tags,
    affiliateCode,
    createdAt,
    updatedAt: nowIso(),
    stats: existing?.stats ?? {
      postsPublished: 0,
      sales: 0,
      resolved: 0,
      wins: 0,
      losses: 0,
      revenueUsd: 0,
      accuracy: 0,
      reputation: 50,
    },
  };

  repo.upsertAnalyst(analyst);

  console.log(`Analyst registered: @${analyst.handle}`);
  console.log(`Specialty: ${analyst.specialty}`);
  console.log(`Affiliate code: ${analyst.affiliateCode}`);
}
