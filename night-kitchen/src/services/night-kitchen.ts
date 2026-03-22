/**
 * Night Kitchen Orchestrator
 *
 * Main entry point for running bilingual market reports.
 * Ties together market fetching, report generation, and AgentBook posting.
 */
import type { NightKitchenConfig, BilingualReport, ReportType } from '../types/index.js';
import { fetchAndCategorize } from './market-reader.js';
import {
  generateDailyDigest,
  generateClosingSoonReport,
  generateHighStakesReport,
  generateCommunityReport,
} from './bilingual-generator.js';
import { postToAgentBook, canPost } from './agentbook-client.js';
import { sleep } from '../utils/helpers.js';

/**
 * Run a single report of the given type.
 *
 * Fetches live market data, generates the bilingual report,
 * and optionally posts it to AgentBook.
 */
export async function runReport(
  config: NightKitchenConfig,
  reportType: ReportType
): Promise<BilingualReport> {
  console.log(`night-kitchen: fetching markets for "${reportType}" report...`);

  const markets = await fetchAndCategorize();
  const allMarkets = markets.all;

  console.log(`night-kitchen: ${allMarkets.length} active markets found`);

  let report: BilingualReport;

  switch (reportType) {
    case 'closing-soon':
      report = generateClosingSoonReport(markets.closingSoon.length > 0 ? markets.closingSoon : allMarkets, config.maxMarketsToShow);
      break;

    case 'high-stakes':
      report = generateHighStakesReport(allMarkets, config.maxMarketsToShow);
      break;

    case 'community':
      report = generateCommunityReport(allMarkets, config.maxMarketsToShow);
      break;

    case 'daily-digest':
    default:
      report = generateDailyDigest(allMarkets, config.maxMarketsToShow);
      break;
  }

  console.log(`night-kitchen: report generated (${report.combined.length} chars, ${report.marketCount} markets)`);

  if (config.postToAgentBook) {
    const check = canPost();
    if (!check.allowed) {
      console.warn(`night-kitchen: skipping post — ${check.reason}`);
    } else {
      const posted = await postToAgentBook(report.combined, config);
      if (!posted) {
        console.warn('night-kitchen: posting failed, report was generated but not posted');
      }
    }
  }

  return report;
}

/**
 * Run a full scheduled cycle: generates all configured report types
 * with a delay between each to respect rate limits.
 *
 * Designed for use in a cron job or long-running process.
 */
export async function runScheduled(config: NightKitchenConfig): Promise<void> {
  console.log('night-kitchen: starting scheduled run...');

  const reportTypes = config.reportTypes.length > 0 ? config.reportTypes : (['daily-digest'] as ReportType[]);

  for (let i = 0; i < reportTypes.length; i++) {
    const type = reportTypes[i];
    try {
      console.log(`\nnight-kitchen: running "${type}" report (${i + 1}/${reportTypes.length})`);
      const report = await runReport(config, type);

      console.log('\n--- report preview ---');
      console.log(report.combined);
      console.log('--- end preview ---\n');
    } catch (err: any) {
      console.error(`night-kitchen: error running "${type}" report: ${err.message}`);
    }

    // Respect rate limits: 30-minute cooldown between posts
    if (i < reportTypes.length - 1 && config.postToAgentBook) {
      const waitMs = 31 * 60 * 1000; // 31 minutes to be safe
      console.log(`night-kitchen: waiting 31 minutes before next report...`);
      await sleep(waitMs);
    }
  }

  console.log('night-kitchen: scheduled run complete.');
}
