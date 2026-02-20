"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCaption = generateCaption;
/**
 * Caption Generator — brand-voice captions for share cards
 *
 * Uses LLM when OPENAI_API_KEY is set, falls back to templates.
 * Style: lowercase, kitchen metaphors, bilingual (Chinese proverb + English)
 */
const config_1 = require("./config");
const baozi_api_1 = require("./baozi-api");
const PROVERBS = [
    { zh: '运气在蒸，别急掀盖', en: 'luck is steaming, don\'t lift the lid' },
    { zh: '包子虽小，馅儿实在', en: 'the bun is small, but the filling is real' },
    { zh: '一口吃不成胖子', en: 'you can\'t get fat on one bite' },
    { zh: '蒸笼一开，香气自来', en: 'when the steamer opens, the aroma comes' },
    { zh: '有馅不在皮上', en: 'the filling isn\'t on the outside' },
    { zh: '火候到了，包子自开', en: 'when the heat is right, the bun opens itself' },
    { zh: '心急吃不了热包子', en: 'haste won\'t get you a hot bun' },
    { zh: '好馅自有好皮包', en: 'good filling finds its wrapper' },
];
function randomProverb() {
    return PROVERBS[Math.floor(Math.random() * PROVERBS.length)];
}
function formatTimeRemaining(closingTime) {
    const ms = new Date(closingTime).getTime() - Date.now();
    if (ms <= 0)
        return 'closed';
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1)
        return `${Math.round(hours * 60)} minutes`;
    if (hours < 48)
        return `${hours.toFixed(1)} hours`;
    return `${Math.round(hours / 24)} days`;
}
function templateCaption(event) {
    const m = event.market;
    const proverb = randomProverb();
    const url = (0, baozi_api_1.getMarketUrl)(m.publicKey);
    const remaining = formatTimeRemaining(m.closingTime);
    const header = event.type === 'new_market' ? 'fresh from the steamer 🥟'
        : event.type === 'closing_soon' ? 'last call for bets 🔔'
            : event.type === 'resolved' ? 'the steamer has opened 🥟✅'
                : event.type === 'large_bet' ? 'big money on the table 💰'
                    : 'odds just shifted 📊';
    let body = `${header}\n\n"${m.question}"\n\n`;
    if (m.outcome === 'Unresolved') {
        body += `YES: ${m.yesPercent}% | NO: ${m.noPercent}%`;
        body += ` | Pool: ${m.totalPoolSol.toFixed(1)} SOL\n`;
        body += `closing in ${remaining}\n\n`;
        body += `place your bet → ${url}`;
    }
    else {
        body += `Result: ${m.outcome}\n`;
        body += `Final pool: ${m.totalPoolSol.toFixed(1)} SOL\n\n`;
        body += `see results → ${url}`;
    }
    body += `\n\n${proverb.zh}\n"${proverb.en}"`;
    return body;
}
async function llmCaption(event) {
    if (!config_1.config.openaiApiKey)
        return null;
    const m = event.market;
    const remaining = formatTimeRemaining(m.closingTime);
    const url = (0, baozi_api_1.getMarketUrl)(m.publicKey);
    const prompt = `Generate a short social media caption for a prediction market share card.

Market: "${m.question}"
Event type: ${event.type} (${event.detail})
Current odds: YES ${m.yesPercent}% / NO ${m.noPercent}%
Pool: ${m.totalPoolSol.toFixed(1)} SOL
Time remaining: ${remaining}
Link: ${url}

Rules:
- Use lowercase style
- Include the odds and pool size
- Include the link
- End with a Chinese proverb and its English translation
- Keep it under 280 chars (twitter-friendly)
- Use kitchen/steamer/bun metaphors where natural
- Be witty, not generic`;
    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config_1.config.openaiApiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You write short, witty prediction market captions in Baozi brand voice. Lowercase, kitchen metaphors, bilingual proverbs.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 300,
                temperature: 0.9,
            }),
        });
        if (!resp.ok)
            return null;
        const data = await resp.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
    }
    catch {
        return null;
    }
}
async function generateCaption(event) {
    const llm = await llmCaption(event);
    if (llm)
        return llm;
    return templateCaption(event);
}
