import { config, loadState, saveState } from "../config.ts";
import type { AgentCandidate, RepositoryState } from "../types.ts";

export class AgentRepository {
  private readonly path: string;

  constructor(path: string = config.dataPath) {
    this.path = path;
  }

  read(): RepositoryState {
    return loadState(this.path);
  }

  write(state: RepositoryState): void {
    saveState(this.path, state);
  }

  upsertAgents(newAgents: AgentCandidate[]): RepositoryState {
    const state = this.read();
    const byHandle = new Map<string, AgentCandidate>();

    for (const agent of state.agents) {
      byHandle.set(agent.handle.toLowerCase(), agent);
    }

    for (const agent of newAgents) {
      byHandle.set(agent.handle.toLowerCase(), agent);
    }

    state.agents = Array.from(byHandle.values()).sort((a, b) => a.handle.localeCompare(b.handle));
    this.write(state);
    return state;
  }

  updateAgent(handle: string, updater: (agent: AgentCandidate) => AgentCandidate): AgentCandidate {
    const state = this.read();
    const normalized = handle.trim().toLowerCase();
    const index = state.agents.findIndex((agent) => agent.handle.toLowerCase() === normalized);
    if (index === -1) {
      throw new Error(`Agent not found for handle: ${handle}`);
    }

    const updated = updater(state.agents[index]);
    state.agents[index] = updated;
    this.write(state);
    return updated;
  }

  findAgent(handle: string): AgentCandidate | undefined {
    const normalized = handle.trim().toLowerCase();
    return this.read().agents.find((agent) => agent.handle.toLowerCase() === normalized);
  }
}
