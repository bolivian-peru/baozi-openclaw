import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { BaoziMcpClient, Market } from '../lib/baozi-client.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const LLM_API_KEY = process.env.OPENCLAW_LLM_API_KEY;
const LLM_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function generateBilingualReport(market: Market): Promise<string> {
    if (!LLM_API_KEY) {
        console.warn("No OPENCLAW_LLM_API_KEY provided. Using mock report.");
        return `[MOCK REPORT]
market: ${market.question}
pool: ${market.totalPool} sol

the steamer is hot tonight.
many hands reach for the same bun.
${market.totalPool > 100 ? 'fire is high / 灶火正旺' : 'slow cooking / 小火慢炖'}

greedy chewers choke.
贪多嚼不烂.

play small. sleep well.
small steamer, big fate / 小蒸一笼, 大大缘分`;
    }

    const prompt = `
You are the "Night Kitchen" (夜厨房) agent.
Your goal is to write a bilingual market report (English + Chinese) for a prediction market.

IDENTITY & TONE:
- Name: Night Kitchen (夜厨房)
- Vibe: A warm kitchen at night. Steam, bamboo, fire, cooking.
- Philosophy: "Wind at night, light in the steamer" (夜里有风，蒸笼有光).
- Voice: LOWERCASE ALWAYS. Short lines. Poetic but sharp.
- Risk: Be honest. Warn that this is gambling. "Play small, play soft."

MANDATORY INSTRUCTIONS:
1. LOWERCASE ONLY for English.
2. Use KITCHEN METAPHORS (steaming, boiling, chopping, bamboo, tofu).
3. Include at least 2 CHINESE PROVERBS from this list or similar context:
   - "Can't rush hot tofu" (心急吃不了热豆腐) - for patience/long markets.
   - "Bite off too much, can't chew" (贪多嚼不烂) - for high risk/greed.
   - "Man plans, heaven decides" (谋事在人, 成事在天) - for close outcomes.
   - "Human smoke soothes hearts" (人间烟火气，最抚凡人心) - for community.
4. End with the tagline: "small steamer, big fate / 小蒸一笼, 大大缘分"

MARKET DATA:
Question: ${market.question}
Total Pool: ${market.totalPool} SOL
Outcomes: ${market.outcomes.join(', ')}
Closing Time: ${market.closingTime}

OUTPUT FORMAT:
- Short social media post (under 280 chars preferred).
- Use clear line breaks.
- Use emojis like 🥟, 🥢, 🍵, 🌙.
`;

    try {
        const response = await axios.post(LLM_API_URL, {
            model: 'anthropic/claude-3-haiku',
            messages: [
                { role: 'system', content: 'You are Night Kitchen. Lowercase. Bilingual. Kitchen metaphors.' },
                { role: 'user', content: prompt }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${LLM_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://baozi.bet',
            }
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("LLM Generation failed:", error);
        return `report generation failed context: ${market.question}`;
    }
}

async function main() {
    console.log("Starting Night Kitchen Agent...");
    console.log("Using MCP server for market data...");
    
    const client = new BaoziMcpClient();

    try {
        const markets = await client.listMarkets();
        console.log(`Found ${markets.length} active markets.`);

        if (markets.length === 0) {
            console.log("No markets found. Exiting.");
            return;
        }

        const market = markets[0];
        console.log(`Selected market: ${market.question}`);

        console.log("Generating report...");
        const report = await generateBilingualReport(market);

        console.log("\n--- Generated Report ---\n");
        console.log(report);
        console.log("\n------------------------\n");

        await client.postToAgentBook(report, market.id);
        console.log("Done.");
    } finally {
        await client.close();
    }
}

main().catch(console.error);
