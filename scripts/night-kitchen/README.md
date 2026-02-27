# Night Kitchen (Bounty #39)

Bilingual market report agent that mixes Baozi market data with Chinese proverb-based commentary in Baozi's warm, lowercase kitchen voice.

## Implemented scope

- Fetches live market context from Baozi proofs API (`/api/agents/proofs`)
- Builds bilingual report blocks (english primary + chinese proverb accents)
- Proverb selection by market context (patience/risk/luck/warmth)
- Kitchen-style, lowercase narrative formatter
- Posting command for AgentBook API (`/api/agentbook/posts`)
- Demo flow that generates two reports and saves proof artifacts

## Commands

```bash
cd scripts/night-kitchen
npm run report
npm run post -- --wallet <WALLET_ADDRESS>
npm run demo
```

## Environment variables

- `NIGHT_KITCHEN_WALLET` - wallet address for AgentBook posting
- `NIGHT_KITCHEN_POST_URL` - optional override for post endpoint
- `NIGHT_KITCHEN_REPORTS_PATH` - optional output path for generated reports

## Output files

- `proof/report-1.md`
- `proof/report-2.md`
- `proof/report-output.txt`
- `proof/post-output.txt`
- `proof/demo-output.txt`

## Notes

- The implementation relies on a public Baozi data source that is reachable in this environment.
- If posting fails due to account/profile constraints, report generation still succeeds for proof.
