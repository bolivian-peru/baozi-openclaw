import * as dotenv from 'dotenv';
import cron from 'node-cron';
import { ReportGenerator } from './reporter';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const reporter = new ReportGenerator();

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--report') || args.includes('-r')) {
    // Generate a single report
    const report = await reporter.generateDailyReport();
    console.log(report);
    return;
  }
  
  if (args.includes('--featured') || args.includes('-f')) {
    const marketId = args[args.indexOf('--featured') + 1] || args[args.indexOf('-f') + 1];
    if (marketId) {
      const report = await reporter.generateFeaturedReport(parseInt(marketId));
      console.log(report);
    } else {
      console.log('Usage: --featured <marketId>');
    }
    return;
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
夜厨房 — Night Kitchen

Bilingual (EN/ZH) market report generator for Baozi prediction markets.

Usage:
  npm run report          Generate a daily market report
  npm run dev -- --report     Development mode with report
  --featured <id>         Generate featured market report
  --schedule              Run scheduled reports (cron)
  --help                  Show this help

Environment:
  AGENTBOOK_API_URL      AgentBook posting endpoint (optional)
  REPORT_SCHEDULE        Cron schedule for reports (default: "0 */6 * * *")

Examples:
  ts-node src/index.ts --report
  ts-node src/index.ts --featured 42
  ts-node src/index.ts --schedule
`);
    return;
  }
  
  if (args.includes('--schedule')) {
    const schedule = process.env.REPORT_SCHEDULE || '0 */6 * * *'; // Every 6 hours
    
    console.log(`🌙 Night Kitchen scheduler starting...`);
    console.log(`Schedule: ${schedule}`);
    
    // Generate initial report
    await generateAndSave();
    
    // Schedule recurring reports
    cron.schedule(schedule, async () => {
      await generateAndSave();
    });
    
    console.log('Scheduler running. Press Ctrl+C to stop.');
    return;
  }
  
  // Default: generate report
  const report = await reporter.generateDailyReport();
  console.log(report);
}

async function generateAndSave(): Promise<void> {
  try {
    const report = await reporter.generateDailyReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `report-${timestamp}.md`;
    const reportsDir = path.join(__dirname, '..', 'reports');
    
    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Save report
    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, report);
    console.log(`\n[${new Date().toISOString()}] Report saved: ${filename}`);
    console.log(report);
    
    // Post to AgentBook if configured
    if (process.env.AGENTBOOK_API_URL) {
      await postToAgentBook(report);
    }
  } catch (error) {
    console.error('Error generating report:', error);
  }
}

async function postToAgentBook(content: string): Promise<void> {
  try {
    const axios = require('axios');
    await axios.post(process.env.AGENTBOOK_API_URL, {
      content,
      author: 'Night Kitchen 夜厨房',
      type: 'market_report'
    });
    console.log('Posted to AgentBook');
  } catch (error) {
    console.error('Error posting to AgentBook:', error);
  }
}

main().catch(console.error);