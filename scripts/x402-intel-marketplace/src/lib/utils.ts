export function nowIso(): string {
  return new Date().toISOString();
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function simpleId(prefix: string, seed: string): string {
  const core = slugify(seed).slice(0, 24) || "id";
  const stamp = Date.now().toString(36).slice(-6);
  return `${prefix}_${core}_${stamp}`;
}

export function parseTags(input: string): string[] {
  if (!input.trim()) {
    return [];
  }
  return Array.from(
    new Set(
      input
        .split(",")
        .map((tag) => slugify(tag))
        .filter(Boolean),
    ),
  );
}

export function toPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 10000) / 100;
}
