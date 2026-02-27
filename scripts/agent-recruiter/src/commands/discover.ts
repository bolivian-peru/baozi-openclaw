import { config } from "../config.ts";
import { parseArgs, optionalStringFlag } from "../lib/args.ts";
import { AgentRepository } from "../lib/repository.ts";
import { runDiscoveryPipeline } from "../pipeline/discovery.ts";
import type { Persona } from "../types.ts";

function parsePersona(value: string): Persona | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const allowed: Persona[] = ["builder", "community", "content", "quant", "operator"];
  if (allowed.includes(normalized as Persona)) {
    return normalized as Persona;
  }

  throw new Error(`Unsupported persona: ${value}`);
}

export async function runDiscover(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const repository = new AgentRepository();
  const state = repository.read();

  const persona = parsePersona(optionalStringFlag(flags, ["persona", "p"], ""));
  const requestedLimit = Number(optionalStringFlag(flags, ["limit", "l"], "4"));
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : 4;

  const result = runDiscoveryPipeline(state, { persona, limit });

  if (result.candidates.length === 0) {
    console.log("No new candidates discovered.");
    if (result.skippedHandles.length > 0) {
      console.log(`Skipped existing handles: ${result.skippedHandles.join(", ")}`);
    }
    return;
  }

  repository.upsertAgents(result.candidates);

  console.log(`Discovered ${result.candidates.length} new candidates at ${result.discoveredAt}`);
  console.log(`Mode: ${config.dryRun ? "DRY RUN" : "LIVE"}`);
  for (const candidate of result.candidates) {
    console.log(
      `- ${candidate.handle.padEnd(16)} persona=${candidate.persona.padEnd(9)} score=${candidate.score} source=${candidate.discoverySource}`,
    );
  }

  if (result.skippedHandles.length > 0) {
    console.log(`Skipped existing handles: ${result.skippedHandles.join(", ")}`);
  }
}
