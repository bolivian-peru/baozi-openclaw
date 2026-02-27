import { fetchProofBatches, toSnapshots } from "../services/data.ts";
import { buildBilingualReport } from "../services/formatter.ts";
import { writeProof } from "../lib/utils.ts";

export async function runReport(saveProof = false): Promise<string[]> {
  const batches = await fetchProofBatches(2);
  const reports: string[] = [];

  batches.forEach((batch, index) => {
    const snapshots = toSnapshots(batch, 3);
    const report = buildBilingualReport(snapshots, {
      titleDate: batch.date,
      footer: `baozi.bet | ${batch.title.toLowerCase()}`,
    });

    reports.push(report);
    console.log(report);
    console.log("\n\n");

    if (saveProof) {
      writeProof(`proof/report-${index + 1}.md`, report);
    }
  });

  return reports;
}
