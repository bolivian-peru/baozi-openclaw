import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RepositoryState } from "./types.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEFAULT_DATA_PATH = join(ROOT, "data", "agents.json");

export interface AppConfig {
  dryRun: boolean;
  dataPath: string;
  affiliateBaseUrl: string;
}

export const config: AppConfig = {
  dryRun: process.env.DRY_RUN === "true",
  dataPath: process.env.AGENT_RECRUITER_DATA_PATH ?? DEFAULT_DATA_PATH,
  affiliateBaseUrl: process.env.AFFILIATE_BASE_URL ?? "https://baozi.bet/agents/ref",
};

export function ensureDataStore(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(path)) {
    const seed: RepositoryState = {
      version: 1,
      updatedAt: new Date(0).toISOString(),
      agents: [],
    };
    writeFileSync(path, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  }
}

export function loadState(path: string): RepositoryState {
  ensureDataStore(path);
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as RepositoryState;
  if (!Array.isArray(parsed.agents)) {
    throw new Error(`Invalid data file at ${path}: agents must be an array`);
  }
  return parsed;
}

export function saveState(path: string, state: RepositoryState): void {
  state.updatedAt = new Date().toISOString();
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
