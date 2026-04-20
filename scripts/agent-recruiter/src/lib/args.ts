export interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positional: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const [rawKey, inlineValue] = token.slice(2).split("=", 2);
      const key = rawKey.trim();
      if (!key) {
        continue;
      }

      if (inlineValue !== undefined) {
        flags[key] = inlineValue;
        continue;
      }

      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }

    if (token.startsWith("-") && token.length > 1) {
      const key = token.slice(1);
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }

    positional.push(token);
  }

  return { flags, positional };
}

export function requireStringFlag(
  flags: Record<string, string | boolean>,
  keys: string[],
  description: string,
): string {
  for (const key of keys) {
    const value = flags[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  throw new Error(`Missing ${description}. Expected one of: ${keys.map((key) => `--${key}`).join(", ")}`);
}

export function optionalStringFlag(
  flags: Record<string, string | boolean>,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = flags[key];
    if (typeof value === "string") {
      return value.trim();
    }
  }
  return fallback;
}

export function hasFlag(flags: Record<string, string | boolean>, keys: string[]): boolean {
  return keys.some((key) => Boolean(flags[key]));
}
