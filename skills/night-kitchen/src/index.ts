/**
 * Night Kitchen — Bilingual Market Reports
 *
 * Monitors Baozi markets, generates daily/nightly reports,
 * and posts to AgentBook/Telegram.
 */
import { config } from './config';
import {
  fetchMarkets,
  detectNotableEvents,
  postToAgentBook,
  postToTelegram,
  NotableEvent,
} from './baozi-api';
import { generateReport } from './report-generator';
import cron from 'node-cron';

// Track events for the daily report
let dailyEvents: NotableEvent[] = [];

async function collectEvents(): Promise<void> {
  try {
    const markets = await fetchMarkets();
    const newEvents = detectNotableEvents(markets);
    if (newEvents.length > 0) {
      console.log(`Collected ${newEvents.length} new events`);
      dailyEvents.push(...newEvents);
    }
  } catch (e: any) {
    console.error('Error collecting events:', e.message);
  }
}

async function publishReport(): Promise<void> {
  if (dailyEvents.length === 0) {
    console.log('No events to report today.');
    return;
  }

  // Prioritize unique events, max 5
  const uniqueEvents = Array.from(new Set(dailyEvents.map(e => e.market.publicKey)))
    .map(key => dailyEvents.find(e => e.market.publicKey === key)!)
    .slice(0, 5);

  const report = await generateReport(uniqueEvents);
  console.log('\n=== NIGHT KITCHEN REPORT ===\n');
  console.log(report);
  console.log('\n============================\n');

  if (config.agentbookEnabled) {
    const res = await postToAgentBook(report);
    if (res) console.log('✅ Posted to AgentBook');
  }

  // Clear events for next cycle
  dailyEvents = [];
}

async function main(): Promise<void> {
  console.log('🌙 Night Kitchen starting...');
  
  // Initial collection
  await collectEvents();

  // Poll for events every minute
  cron.schedule('*/1 * * * *', collectEvents);

  // Publish report at 8 PM (Night Kitchen time)
  // For demo/dev, we'll also run it immediately if we have events
  cron.schedule('0 20 * * *', publishReport);
  
  console.log('Polling started. Report scheduled for 20:00.');
  
  // DEV MODE: Publish immediately if events found after 10s
  setTimeout(async () => {
    if (dailyEvents.length > 0) {
      console.log('Dev mode: Publishing initial report...');
      await publishReport();
    }
  }, 10000);
}

main().catch(console.error);
