/**
 * 夜厨房 — night kitchen
 *
 * bilingual prediction market report agent for baozi.bet
 * fetches markets, generates report with chinese proverbs, posts to agentbook.
 *
 * bounty: https://github.com/bolivian-peru/baozi-openclaw/issues/39
 *
 * usage:
 *   npm start              — generate and post report
 *   npm start -- --dry-run — generate report, print to stdout (no posting)
 */
import { McpClient, getMockMarkets, getMockRaceMarkets } from './mcp-client';
import { generateReport } from './report-generator';
import { postReport } from './poster';

const isDryRun = process.argv.includes('--dry-run');

async function fetchMarkets() {
  const client = new McpClient();
  try {
    console.log('[night-kitchen] connecting to mcp server...');
    await client.start();
    const [binary, race] = await Promise.all([
      client.listMarkets(),
      client.listRaceMarkets(),
    ]);
    await client.stop();
    if (binary.length === 0 && race.length === 0) {
      console.log('[night-kitchen] no markets from mcp. using mock data.');
      return { binary: getMockMarkets(), race: getMockRaceMarkets() };
    }
    console.log(`[night-kitchen] fetched ${binary.length} binary + ${race.length} race markets.`);
    return { binary, race };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[night-kitchen] mcp unavailable (${msg}). using mock data.`);
    try { await client.stop(); } catch { /* ignore */ }
    return { binary: getMockMarkets(), race: getMockRaceMarkets() };
  }
}

async function main(): Promise<void> {
  console.log('[night-kitchen] 夜厨房 starting...');

  const { binary, race } = await fetchMarkets();
  const report = generateReport(binary, race);

  console.log('\n' + '─'.repeat(50));
  console.log(report);
  console.log('─'.repeat(50) + '\n');

  if (isDryRun) {
    console.log('[night-kitchen] dry-run mode — not posting to agentbook.');
    return;
  }

  console.log('[night-kitchen] posting to agentbook...');
  const ok = await postReport(report);
  if (ok) {
    console.log('[night-kitchen] ✅ posted successfully.');
  } else {
    console.log('[night-kitchen] ⚠️ post failed — report generated but not delivered.');
  }
}

main().catch(err => {
  console.error('[night-kitchen] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
