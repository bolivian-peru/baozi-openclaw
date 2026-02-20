"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Share Card Viral Engine — every bet becomes a billboard
 *
 * Monitors Baozi markets for notable events, generates share cards,
 * posts to AgentBook/Telegram with captions + affiliate links.
 */
const config_1 = require("./config");
const baozi_api_1 = require("./baozi-api");
const caption_generator_1 = require("./caption-generator");
/** Track posted events to avoid duplicates */
const postedEvents = new Set();
/** AgentBook cooldown: 30 min between posts */
const AGENTBOOK_COOLDOWN_MS = 30 * 60 * 1000;
let lastAgentBookPost = 0;
/** Priority: resolved > odds_shift > closing_soon > large_bet > new_market */
const EVENT_PRIORITY = {
    resolved: 5,
    odds_shift: 4,
    closing_soon: 3,
    large_bet: 2,
    new_market: 1,
};
function eventKey(event) {
    return `${event.type}:${event.market.publicKey}`;
}
function prioritize(events) {
    return events
        .filter(e => !postedEvents.has(eventKey(e)))
        .sort((a, b) => (EVENT_PRIORITY[b.type] || 0) - (EVENT_PRIORITY[a.type] || 0));
}
async function processEvent(event) {
    const key = eventKey(event);
    const m = event.market;
    const cardUrl = (0, baozi_api_1.getShareCardUrl)(m.publicKey);
    console.log(`\n🎴 [${event.type}] ${m.question}`);
    console.log(`   ${event.detail}`);
    console.log(`   Card: ${cardUrl}`);
    const caption = await (0, caption_generator_1.generateCaption)(event);
    console.log(`   Caption: ${caption.slice(0, 100)}...`);
    let posted = false;
    // Post to AgentBook (respect cooldown)
    if (config_1.config.agentbookEnabled && config_1.config.walletAddress) {
        const now = Date.now();
        if (now - lastAgentBookPost >= AGENTBOOK_COOLDOWN_MS) {
            const result = await (0, baozi_api_1.postToAgentBook)(caption, cardUrl);
            if (result) {
                console.log(`   ✅ AgentBook post #${result.id}`);
                lastAgentBookPost = now;
                posted = true;
            }
        }
        else {
            const waitMin = Math.round((AGENTBOOK_COOLDOWN_MS - (now - lastAgentBookPost)) / 60000);
            console.log(`   ⏳ AgentBook cooldown (${waitMin}min remaining)`);
        }
    }
    // Post to Telegram
    if (config_1.config.telegramBotToken && config_1.config.telegramChatId) {
        const ok = await (0, baozi_api_1.postToTelegram)(caption, cardUrl);
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
async function pollCycle() {
    try {
        const markets = await (0, baozi_api_1.fetchMarkets)();
        const events = (0, baozi_api_1.detectNotableEvents)(markets);
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
            }
            catch (err) {
                console.error(`   ❌ Error processing ${event.type}: ${err.message}`);
            }
        }
    }
    catch (err) {
        console.error(`Poll error: ${err.message}`);
    }
}
async function main() {
    console.log('🥟 Share Card Viral Engine starting...');
    console.log(`   API: ${config_1.config.baoziApiUrl}`);
    console.log(`   Wallet: ${config_1.config.walletAddress || '(not set)'}`);
    console.log(`   Affiliate: ${config_1.config.affiliateCode || '(not set)'}`);
    console.log(`   AgentBook: ${config_1.config.agentbookEnabled ? 'enabled' : 'disabled'}`);
    console.log(`   Telegram: ${config_1.config.telegramBotToken ? 'enabled' : 'disabled'}`);
    console.log(`   LLM: ${config_1.config.openaiApiKey ? 'GPT-4o-mini' : 'template fallback'}`);
    console.log(`   Poll interval: ${config_1.config.pollIntervalSec}s`);
    console.log('');
    // Initial poll
    await pollCycle();
    // Continuous polling
    setInterval(pollCycle, config_1.config.pollIntervalSec * 1000);
}
main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
