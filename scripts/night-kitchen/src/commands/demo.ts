import { runReport } from "./report.ts";
import { parseArgs, optionalStringFlag } from "../lib/args.ts";
import { postToAgentBook } from "../services/poster.ts";
import { writeProof } from "../lib/utils.ts";

export async function runDemo(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const walletAddress = optionalStringFlag(flags, "wallet", process.env.NIGHT_KITCHEN_WALLET ?? "");

  const reports = await runReport(true);
  writeProof("proof/report-output.txt", reports.join("\n\n---\n\n"));

  if (!walletAddress) {
    const note = "Skip posting: provide --wallet or NIGHT_KITCHEN_WALLET to publish to AgentBook.";
    console.log(note);
    writeProof("proof/post-output.txt", note + "\n");
    return;
  }

  const result = await postToAgentBook({
    walletAddress,
    content: reports[0],
  });

  const summary = `status=${result.status} ok=${result.ok}\n${JSON.stringify(result.response, null, 2)}\n`;
  console.log(summary);
  writeProof("proof/post-output.txt", summary);
}
