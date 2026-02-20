"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMarkets = fetchMarkets;
exports.getShareCardUrl = getShareCardUrl;
exports.getMarketUrl = getMarketUrl;
exports.detectNotableEvents = detectNotableEvents;
exports.postToAgentBook = postToAgentBook;
exports.postToTelegram = postToTelegram;
/**
 * Baozi API client — markets + share cards
 */
const config_1 = require("./config");
let previousSnapshot = null;
async function fetchMarkets() {
    const resp = await fetch(`${config_1.config.baoziApiUrl}/markets`);
    if (!resp.ok)
        throw new Error(`Markets API ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    // API returns { data: { binary: [...] } } or { binary: [...] }
    const binary = data?.data?.binary || data?.binary || [];
    return binary;
}
function getShareCardUrl(marketPda) {
    const params = new URLSearchParams({
        market: marketPda,
        wallet: config_1.config.walletAddress,
    });
    if (config_1.config.affiliateCode)
        params.set('ref', config_1.config.affiliateCode);
    return `${config_1.config.baoziApiUrl}/share/card?${params.toString()}`;
}
function getMarketUrl(marketPda) {
    const base = config_1.config.baoziApiUrl.replace('/api', '');
    const ref = config_1.config.affiliateCode ? `?ref=${config_1.config.affiliateCode}` : '';
    return `${base}/market/${marketPda}${ref}`;
}
/**
 * Compare current markets to previous snapshot and detect notable events.
 */
function detectNotableEvents(markets) {
    const events = [];
    const now = Date.now();
    for (const m of markets) {
        const closingMs = new Date(m.closingTime).getTime();
        const hoursUntilClose = (closingMs - now) / (1000 * 60 * 60);
        // New market (< 1 hour old, has createdAt)
        if (m.createdAt) {
            const ageHours = (now - new Date(m.createdAt).getTime()) / (1000 * 60 * 60);
            if (ageHours < 1) {
                events.push({
                    type: 'new_market',
                    market: m,
                    detail: `New market created ${Math.round(ageHours * 60)}min ago`,
                });
            }
        }
        // Closing soon (< 24 hours)
        if (hoursUntilClose > 0 && hoursUntilClose < 24 && m.isBettingOpen) {
            events.push({
                type: 'closing_soon',
                market: m,
                detail: `Closing in ${hoursUntilClose.toFixed(1)} hours`,
            });
        }
        // Resolved
        if (m.outcome !== 'Unresolved' && m.status !== 'Active') {
            events.push({
                type: 'resolved',
                market: m,
                detail: `Resolved: ${m.outcome}`,
            });
        }
        // Large pool (> 5 SOL)
        if (m.totalPoolSol > 5) {
            events.push({
                type: 'large_bet',
                market: m,
                detail: `Pool: ${m.totalPoolSol.toFixed(2)} SOL`,
            });
        }
        // Odds shift (compare to previous snapshot)
        if (previousSnapshot) {
            const prev = previousSnapshot.binary.find(p => p.publicKey === m.publicKey);
            if (prev) {
                const shift = Math.abs(m.yesPercent - prev.yesPercent);
                if (shift > 10) {
                    events.push({
                        type: 'odds_shift',
                        market: m,
                        detail: `Odds shifted ${shift.toFixed(1)}% (was ${prev.yesPercent}% YES, now ${m.yesPercent}%)`,
                    });
                }
            }
        }
    }
    // Update snapshot
    previousSnapshot = { binary: markets, timestamp: now };
    return events;
}
/**
 * Post to AgentBook
 */
async function postToAgentBook(content, imageUrl) {
    if (!config_1.config.walletAddress)
        return null;
    const body = {
        walletAddress: config_1.config.walletAddress,
        content,
    };
    if (imageUrl)
        body.imageUrl = imageUrl;
    const resp = await fetch(`${config_1.config.baoziApiUrl}/agentbook/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        console.error(`AgentBook post failed: ${resp.status}`);
        return null;
    }
    return resp.json();
}
/**
 * Post image to Telegram channel
 */
async function postToTelegram(caption, imageUrl) {
    if (!config_1.config.telegramBotToken || !config_1.config.telegramChatId)
        return false;
    const url = `https://api.telegram.org/bot${config_1.config.telegramBotToken}/sendPhoto`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: config_1.config.telegramChatId,
            photo: imageUrl,
            caption,
            parse_mode: 'Markdown',
        }),
    });
    return resp.ok;
}
