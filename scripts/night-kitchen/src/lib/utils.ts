import { writeFileSync } from "node:fs";

export function nowIso(): string {
  return new Date().toISOString();
}

export function toLowerTitle(input: string): string {
  return input.trim().toLowerCase();
}

export function pseudoOdds(question: string): { yes: number; no: number; pool: number } {
  const chars = Array.from(question);
  const seed = chars.reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const yes = 30 + (seed % 41);
  const no = 100 - yes;
  const pool = 8 + (seed % 55) / 2;
  return {
    yes,
    no,
    pool: Math.round(pool * 10) / 10,
  };
}

export function inferClosingLabel(date: string): string {
  const base = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(base)) {
    return "closing soon";
  }

  const days = Math.max(1, Math.floor((Date.now() - base) / (24 * 3600 * 1000)) + 1);
  return `resolved ${days} day${days > 1 ? "s" : ""} ago`;
}

export function writeProof(path: string, content: string): void {
  writeFileSync(path, content, "utf8");
}
