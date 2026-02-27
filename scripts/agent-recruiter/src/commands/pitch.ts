import { parseArgs, optionalStringFlag } from "../lib/args.ts";
import { AgentRepository } from "../lib/repository.ts";
import { getTemplateForPersona, renderTemplate } from "../lib/templates.ts";
import type { AgentCandidate, Persona } from "../types.ts";

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

function pickTargets(
  agents: AgentCandidate[],
  handle: string,
  persona: Persona | undefined,
  limit: number,
): AgentCandidate[] {
  if (handle) {
    return agents.filter((agent) => agent.handle.toLowerCase() === handle.toLowerCase());
  }

  return agents
    .filter((agent) => agent.status === "discovered")
    .filter((agent) => (persona ? agent.persona === persona : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function runPitch(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const repository = new AgentRepository();
  const state = repository.read();

  const handle = optionalStringFlag(flags, ["handle", "h"], "");
  const persona = parsePersona(optionalStringFlag(flags, ["persona", "p"], ""));
  const channel = optionalStringFlag(flags, ["channel", "c"], "telegram") || "telegram";
  const requestedLimit = Number(optionalStringFlag(flags, ["limit", "l"], "3"));
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : 3;

  const targets = pickTargets(state.agents, handle, persona, limit);

  if (targets.length === 0) {
    console.log("No matching candidates to pitch.");
    return;
  }

  const next = structuredClone(state);
  const updates = new Map(targets.map((agent) => [agent.id, agent]));
  const now = new Date().toISOString();

  for (const agent of next.agents) {
    const target = updates.get(agent.id);
    if (!target) {
      continue;
    }

    const template = getTemplateForPersona(agent.persona);
    const rendered = renderTemplate(template, {
      handle: agent.handle,
      region: agent.region,
      channel: agent.channel,
    });

    agent.status = "pitched";
    agent.updatedAt = now;
    agent.outreach = {
      templateId: rendered.id,
      channel,
      generatedAt: now,
      response: "none",
    };

    console.log(`--- Pitch for @${agent.handle} (${agent.persona}) ---`);
    console.log(`Subject: ${rendered.subject}`);
    console.log(rendered.body);
    console.log();
  }

  repository.write(next);
  console.log(`Generated ${targets.length} outreach messages and updated pipeline status.`);
}
