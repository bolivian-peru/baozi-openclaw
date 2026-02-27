import type { AgentCandidate, DiscoveryResult, DiscoverySignal, Persona, RepositoryState } from "../types.ts";
import { nowIso, simpleId } from "../lib/utils.ts";

const SAMPLE_SIGNALS: DiscoverySignal[] = [
  {
    handle: "macroMina",
    persona: "content",
    channel: "x",
    region: "SEA",
    audienceSize: 84200,
    engagementRate: 0.061,
    discoverySource: "x_trending_search",
    fitNotes: ["Consistent prediction threads", "Strong audience trust"],
    tags: ["macro", "crypto", "creator"],
  },
  {
    handle: "builderBenedict",
    persona: "builder",
    channel: "github",
    region: "EU",
    audienceSize: 12400,
    engagementRate: 0.081,
    discoverySource: "oss_repo_signal",
    fitNotes: ["Ships bot infra weekly", "Already active in Solana tools"],
    tags: ["infra", "solana", "automation"],
  },
  {
    handle: "opsNara",
    persona: "operator",
    channel: "discord",
    region: "US",
    audienceSize: 18900,
    engagementRate: 0.074,
    discoverySource: "community_referral",
    fitNotes: ["Runs high-retention campaigns", "Excellent partner follow-through"],
    tags: ["ops", "growth", "community"],
  },
  {
    handle: "quantYuto",
    persona: "quant",
    channel: "telegram",
    region: "JP",
    audienceSize: 9700,
    engagementRate: 0.092,
    discoverySource: "signal_channel_scan",
    fitNotes: ["Publishes transparent hit-rate logs", "Data-driven style"],
    tags: ["quant", "signals", "alpha"],
  },
];

function scoreSignal(signal: DiscoverySignal): number {
  const cappedAudience = Math.min(signal.audienceSize, 200_000) / 200_000;
  const cappedEngagement = Math.min(signal.engagementRate, 0.2) / 0.2;
  const noteBonus = Math.min(signal.fitNotes.length, 4) * 0.06;
  const raw = cappedAudience * 0.45 + cappedEngagement * 0.45 + noteBonus;
  return Math.round(raw * 100);
}

function createCandidate(signal: DiscoverySignal): AgentCandidate {
  const createdAt = nowIso();

  return {
    id: simpleId("agent", signal.handle),
    handle: signal.handle,
    persona: signal.persona,
    channel: signal.channel,
    region: signal.region,
    audienceSize: signal.audienceSize,
    engagementRate: signal.engagementRate,
    discoverySource: signal.discoverySource,
    fitNotes: signal.fitNotes,
    score: scoreSignal(signal),
    status: "discovered",
    tags: signal.tags,
    createdAt,
    updatedAt: createdAt,
    onboarding: {
      stage: "none",
      checklist: {
        intakeComplete: false,
        complianceComplete: false,
        affiliateIssued: false,
        affiliateValidated: false,
        activated: false,
      },
    },
  };
}

export interface DiscoveryOptions {
  persona?: Persona;
  limit: number;
}

export function runDiscoveryPipeline(
  state: RepositoryState,
  options: DiscoveryOptions,
): DiscoveryResult {
  const personaFiltered = options.persona
    ? SAMPLE_SIGNALS.filter((signal) => signal.persona === options.persona)
    : [...SAMPLE_SIGNALS];

  const existing = new Set(state.agents.map((agent) => agent.handle.toLowerCase()));
  const discovered: AgentCandidate[] = [];
  const skippedHandles: string[] = [];

  for (const signal of personaFiltered.slice(0, options.limit)) {
    if (existing.has(signal.handle.toLowerCase())) {
      skippedHandles.push(signal.handle);
      continue;
    }

    discovered.push(createCandidate(signal));
    existing.add(signal.handle.toLowerCase());
  }

  return {
    discoveredAt: nowIso(),
    candidates: discovered,
    skippedHandles,
  };
}
