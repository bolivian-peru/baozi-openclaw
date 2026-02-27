import { parseArgs, hasFlag } from "../lib/args.ts";
import { AgentRepository } from "../lib/repository.ts";
import { createReportSnapshot } from "../report/metrics.ts";

export async function runReport(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const asJson = hasFlag(flags, ["json"]);

  const repository = new AgentRepository();
  const state = repository.read();
  const snapshot = createReportSnapshot(state);

  if (asJson) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  console.log(`Agent Recruiter report at ${snapshot.generatedAt}`);
  console.log(`Total agents: ${snapshot.metrics.totalAgents}`);
  console.log(
    `Pipeline: discovered=${snapshot.metrics.discovered} pitched=${snapshot.metrics.pitched} onboarding=${snapshot.metrics.onboarding} active=${snapshot.metrics.active} inactive=${snapshot.metrics.inactive}`,
  );
  console.log(
    `Rates: pitch=${snapshot.metrics.pitchRate}% onboarding=${snapshot.metrics.onboardingRate}% activation=${snapshot.metrics.activationRate}%`,
  );

  console.log("Persona rollup:");
  for (const row of snapshot.personaRollup) {
    console.log(`- ${row.persona.padEnd(9)} total=${row.total} active=${row.active}`);
  }

  if (snapshot.topAgents.length > 0) {
    console.log("Top recruited candidates:");
    for (const agent of snapshot.topAgents) {
      console.log(
        `- @${agent.handle.padEnd(15)} persona=${agent.persona.padEnd(9)} score=${agent.score} status=${agent.status}`,
      );
    }
  }
}
