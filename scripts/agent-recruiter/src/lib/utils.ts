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
  const core = slugify(seed).slice(0, 24) || "agent";
  const stamp = Date.now().toString(36).slice(-6);
  return `${prefix}_${core}_${stamp}`;
}

export function toPercent(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 10000) / 100;
}

export function toFixed(value: number, digits = 2): string {
  return value.toFixed(digits);
}
