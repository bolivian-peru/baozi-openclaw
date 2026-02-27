import { parseArgs, optionalStringFlag } from "../lib/args.ts";
import { postToAgentBook } from "../services/poster.ts";
import { runReport } from "./report.ts";

export async function runPost(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const walletAddress = optionalStringFlag(flags, "wallet", process.env.NIGHT_KITCHEN_WALLET ?? "");
  const endpoint = optionalStringFlag(flags, "endpoint", process.env.NIGHT_KITCHEN_POST_URL ?? "");

  if (!walletAddress) {
    throw new Error("Missing wallet address. Use --wallet or NIGHT_KITCHEN_WALLET.");
  }

  const reports = await runReport(false);
  const content = reports[0];

  const result = await postToAgentBook({
    walletAddress,
    content,
    endpoint: endpoint || undefined,
  });

  console.log(`Post status: ${result.status} (${result.ok ? "ok" : "failed"})`);
  console.log(JSON.stringify(result.response, null, 2));
}
