import dotenv from "dotenv";
dotenv.config();

export interface Config {
  solanaRpcUrl: string;
  solanaPrivateKey: string;
  geminiApiKey: string;

  pollIntervalMinutes: number;
  cronSchedules: string[];
  agentBookCooldownMs: number;
  commentCooldownMs: number;
  baoziBaseUrl: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    solanaRpcUrl: requireEnv("SOLANA_RPC_URL"),
    solanaPrivateKey: requireEnv("SOLANA_PRIVATE_KEY"),
    geminiApiKey: requireEnv("GEMINI_API_KEY"),

    pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || "30", 10),
    cronSchedules: [
      "0 8 * * *",  // 8:00 UTC — Morning roundup
      "0 14 * * *", // 14:00 UTC — Midday odds alert
      "0 20 * * *", // 20:00 UTC — Evening closing soon
    ],
    agentBookCooldownMs: 30 * 60 * 1000, // 30 minutes
    commentCooldownMs: 5 * 60 * 1000,    // 5 minutes
    baoziBaseUrl: "https://baozi.bet",
  };
}
