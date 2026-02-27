# Proof Artifacts

This folder contains minimal execution artifacts for bounty #41 Agent Recruiter.

Commands executed (using Node's TS strip mode due missing Bun binary in this environment):

```bash
AGENT_RECRUITER_DATA_PATH=./proof/agents-proof.json DRY_RUN=true node --experimental-strip-types src/index.ts discover --limit 4
AGENT_RECRUITER_DATA_PATH=./proof/agents-proof.json DRY_RUN=true node --experimental-strip-types src/index.ts pitch --persona content --channel telegram
AGENT_RECRUITER_DATA_PATH=./proof/agents-proof.json DRY_RUN=true node --experimental-strip-types src/index.ts onboard --handle macroMina --campaign b41_launch
AGENT_RECRUITER_DATA_PATH=./proof/agents-proof.json DRY_RUN=true node --experimental-strip-types src/index.ts report
```

Artifacts:
- `01-discover.txt`
- `02-pitch.txt`
- `03-onboard.txt`
- `04-report.txt`
- `agents-proof.json`
