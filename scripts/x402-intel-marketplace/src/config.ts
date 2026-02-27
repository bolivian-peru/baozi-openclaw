import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MarketplaceState } from "./types.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEFAULT_DATA_PATH = join(ROOT, "data", "marketplace.json");

export interface AppConfig {
  dataPath: string;
  dryRun: boolean;
}

export const config: AppConfig = {
  dataPath: process.env.X402_DATA_PATH ?? DEFAULT_DATA_PATH,
  dryRun: process.env.X402_DRY_RUN !== "false",
};

export function ensureDataStore(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(path)) {
    const seed: MarketplaceState = {
      version: 1,
      updatedAt: new Date(0).toISOString(),
      analysts: [],
      posts: [],
      purchases: [],
    };
    writeFileSync(path, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  }
}

export function loadState(path: string): MarketplaceState {
  ensureDataStore(path);
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as MarketplaceState;
  if (!Array.isArray(parsed.analysts) || !Array.isArray(parsed.posts) || !Array.isArray(parsed.purchases)) {
    throw new Error(`Invalid marketplace data shape at ${path}`);
  }
  return parsed;
}

export function saveState(path: string, state: MarketplaceState): void {
  state.updatedAt = new Date().toISOString();
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
