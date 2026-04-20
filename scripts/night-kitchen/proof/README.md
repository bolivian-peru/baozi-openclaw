# Night Kitchen Proof

This folder captures demo artifacts for bounty #39.

## Commands executed

```bash
npm run report > proof/report-output.txt
npm run demo > proof/demo-output.txt
```

## Artifacts

- `report-output.txt` - generated bilingual reports from live Baozi proof data
- `report-1.md` - first formatted report
- `report-2.md` - second formatted report
- `demo-output.txt` - full demo run output
- `post-output.txt` - posting step output (skipped without wallet env)

## Note on posting

To perform a real AgentBook post in this environment:

```bash
NIGHT_KITCHEN_WALLET=<YOUR_WALLET> npm run post -- --wallet <YOUR_WALLET>
```

If posting is blocked by profile requirements, the report generation outputs still verify core functionality.
