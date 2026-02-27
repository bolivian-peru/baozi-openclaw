import type { AgentCandidate, FunnelMetrics, RepositoryState } from "../types.ts";
import { toPercent } from "../lib/utils.ts";

export interface PersonaRollup {
  persona: AgentCandidate["persona"];
  total: number;
  active: number;
}

export interface ReportSnapshot {
  generatedAt: string;
  metrics: FunnelMetrics;
  personaRollup: PersonaRollup[];
  topAgents: AgentCandidate[];
}

export function computeFunnelMetrics(state: RepositoryState): FunnelMetrics {
  const totalAgents = state.agents.length;
  const discovered = state.agents.filter((agent) => agent.status === "discovered").length;
  const pitched = state.agents.filter((agent) => agent.status === "pitched").length;
  const onboarding = state.agents.filter((agent) => agent.status === "onboarding").length;
  const active = state.agents.filter((agent) => agent.status === "active").length;
  const inactive = state.agents.filter((agent) => agent.status === "inactive").length;

  const pitchRate = totalAgents > 0 ? toPercent((pitched + onboarding + active + inactive) / totalAgents) : 0;
  const onboardingRate = totalAgents > 0 ? toPercent((onboarding + active) / totalAgents) : 0;
  const activationRate = totalAgents > 0 ? toPercent(active / totalAgents) : 0;

  return {
    totalAgents,
    discovered,
    pitched,
    onboarding,
    active,
    inactive,
    pitchRate,
    onboardingRate,
    activationRate,
  };
}

export function createReportSnapshot(state: RepositoryState): ReportSnapshot {
  const metrics = computeFunnelMetrics(state);
  const personas: PersonaRollup["persona"][] = ["builder", "community", "content", "quant", "operator"];

  const personaRollup = personas.map((persona) => {
    const scoped = state.agents.filter((agent) => agent.persona === persona);
    return {
      persona,
      total: scoped.length,
      active: scoped.filter((agent) => agent.status === "active").length,
    };
  });

  const topAgents = [...state.agents]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    personaRollup,
    topAgents,
  };
}
