/**
 * Share Card Viral Engine — every bet becomes a billboard
 *
 * Monitors Baozi markets for notable events, generates share cards,
 * posts to AgentBook/Telegram with captions + affiliate links.
 */
import { config } from './config';
import {
  fetchMarkets,
  detectNotableEvents,
  getShareCardUrl,
  postToAgentBook,
  postToTelegram,
  NotableEvent,
} from './baozi-api';
import { generateCaption } from './caption-generator';

/** Track posted events to avoid duplicates */
const postedEvents = new Set<string>();
/** AgentBook cooldown: 30 min between posts */
const AGENTBOOK_COOLDOWN_MS = 30 * 60 * 1000;
let lastAgentBookPost = 0;

/** Priority: resolved > odds_shift > closing_soon > large_bet > new_market */
const EVENT_PRIORITY: Record<string, number> = {
  resolved: 5,
  odds_shift: 4,
  closing_soon: 3,
  large_bet: 2,
  new_market: 1,
};

function eventKey(event: NotableEvent): string {
  return `${event.type}:${event.market.publicKey}`;
}

function prioritize(events: NotableEvent[]): NotableEvent[] {
  return events
    .filter(e => !postedEvents.has(eventKey(e)))
    .sort((a, b) => (EVENT_PRIORITY[b.type] || 0) - (EVENT_PRIORITY[a.type] || 0));
}

async function processEvent(event: NotableEvent): Promise<void> {
  const key = eventKey(event);
  const m = event.market;
  const cardUrl = getShareCardUrl(m.publicKey);

  console.log(`\n🎴 [${event.type}] ${m.question}`);
  console.log(`   ${event.detail}`);
  console.log(`   Card: ${cardUrl}`);

  const caption = await generateCaption(event);
  console.log(`   Caption: ${caption.slice(0, 100)}...`);

  let posted = false;

  // Post to AgentBook (respect cooldown)
  if (config.agentbookEnabled && config.walletAddress) {
    const now = Date.now();
    if (now - lastAgentBookPost >= AGENTBOOK_COOLDOWN_MS) {
      const result = await postToAgentBook(caption, cardUrl);
      if (result) {
        console.log(`   ✅ AgentBook post #${result.id}`);
        lastAgentBookPost = now;
        posted = true;
      }
    } else {
      const waitMin = Math.round((AGENTBOOK_COOLDOWN_MS - (now - lastAgentBookPost)) / 60000);
      console.log(`   ⏳ AgentBook cooldown (${waitMin}min remaining)`);
    }
  }

  // Post to Telegram
  if (config.telegramBotToken && config.telegramChatId) {
    const ok = await postToTelegram(caption, cardUrl);
    if (ok) {
      console.log(`   ✅ Telegram posted`);
      posted = true;
    }
  }

  if (posted) {
    postedEvents.add(key);
    // Clean old events (keep last 500)
    if (postedEvents.size > 500) {
      const entries = [...postedEvents];
      entries.slice(0, entries.length - 500).forEach(k => postedEvents.delete(k));
    }
  }
}

async function pollCycle(): Promise<void> {
  try {
    const markets = await fetchMarkets();
    const events = detectNotableEvents(markets);
    const prioritized = prioritize(events);

    if (prioritized.length === 0) {
      process.stdout.write('.');
      return;
    }

    console.log(`\n📡 Detected ${prioritized.length} notable events`);

    // Process top 3 events per cycle to avoid spam
    for (const event of prioritized.slice(0, 3)) {
      try {
        await processEvent(event);
      } catch (err: any) {
        console.error(`   ❌ Error processing ${event.type}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error(`Poll error: ${err.message}`);
  }
}

async function main(): Promise<void> {
  console.log('🥟 Share Card Viral Engine starting...');
  console.log(`   API: ${config.baoziApiUrl}`);
  console.log(`   Wallet: ${config.walletAddress || '(not set)'}`);
  console.log(`   Affiliate: ${config.affiliateCode || '(not set)'}`);
  console.log(`   AgentBook: ${config.agentbookEnabled ? 'enabled' : 'disabled'}`);
  console.log(`   Telegram: ${config.telegramBotToken ? 'enabled' : 'disabled'}`);
  console.log(`   LLM: ${config.openaiApiKey ? 'GPT-4o-mini' : 'template fallback'}`);
  console.log(`   Poll interval: ${config.pollIntervalSec}s`);
  console.log('');

  // Initial poll
  await pollCycle();

  // Continuous polling
  setInterval(pollCycle, config.pollIntervalSec * 1000);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
