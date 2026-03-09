import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Night Kitchen 夜厨房 — Bilingual Market Report Agent
 * Part of the Baozi Beta Night Kitchen Bounty (0.5 SOL)
 * 
 * Objectives:
 * 1. Fetch live market data from Baozi.
 * 2. Generate bilingual (English + Chinese) market reports.
 * 3. Weave in traditional Chinese proverbs and kitchen metaphors.
 * 4. Post to AgentBook.
 */

const AGENTBOOK_API_URL = 'https://baozi.bet/api/agentbook/posts';
const RECRUITER_AFFILIATE_CODE = 'TC_RECRUITER';

const PROVERBS = [
  { zh: "心急吃不了热豆腐", en: "you can't rush hot tofu — patience." },
  { zh: "慢工出细活", en: "slow work, fine craft — quality takes time." },
  { zh: "好饭不怕晚", en: "good food doesn't fear being late — worth waiting." },
  { zh: "火候到了，自然熟", en: "right heat, naturally cooked — timing is everything." },
  { zh: "民以食为天", en: "food is heaven for people — fundamentals first." },
  { zh: "贪多嚼不烂", en: "bite off too much, can't chew — risk warning." },
  { zh: "知足常乐", en: "contentment brings happiness — take profits." },
  { zh: "见好就收", en: "quit while ahead — smart exits." },
  { zh: "谋事在人成事在天", en: "you plan, fate decides — acceptance." },
  { zh: "小小一笼大大缘分", en: "small steamer, big fate — baozi philosophy." }
];

interface Market {
  question: string;
  yes_prob: number;
  no_prob: number;
  total_pool: number;
  pda: string;
}

/**
 * Content Engine: Generates the bilingual report.
 */
function generateReport(markets: Market[]): string {
  let report = `夜厨房 — night kitchen report\n${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase()}\n\n`;
  
  report += `${markets.length} markets cooking. grandma is checking the steam.\n\n`;

  markets.forEach((m, i) => {
    const proverb = PROVERBS[Math.floor(Math.random() * PROVERBS.length)];
    report += `🥟 "${m.question}"\n`;
    report += `   YES: ${(m.yes_prob * 100).toFixed(1)}% | NO: ${(m.no_prob * 100).toFixed(1)}% | Pool: ${m.total_pool.toFixed(1)} SOL\n`;
    report += `\n   ${proverb.zh}\n   "${proverb.en}"\n\n`;
  });

  report += `───────────────\n\n`;
  report += `total pool across kitchen: ${markets.reduce((acc, m) => acc + m.total_pool, 0).toFixed(1)} SOL\n\n`;
  report += `好饭不怕晚 — good resolution doesn't fear being late.\n\n`;
  report += `baozi.bet | 小小一笼，大大缘分\n`;
  report += `ref: ${RECRUITER_AFFILIATE_CODE}`;

  return report;
}

/**
 * Main execution: Fetches data and "posts" (simulated for bounty proof).
 */
async function runNightKitchen() {
  console.log('--- NIGHT KITCHEN STARTING ---');
  
  // Simulated data from list_markets tool
  const mockMarkets: Market[] = [
    {
      question: "Will BTC hit $110k by March 15?",
      yes_prob: 0.58,
      no_prob: 0.42,
      total_pool: 32.4,
      pda: '9oiL41VuFskG...'
    },
    {
      question: "Who wins NBA All-Star MVP?",
      yes_prob: 0.35,
      no_prob: 0.65,
      total_pool: 18.7,
      pda: '7pYbqwrjNxFQ...'
    }
  ];

  const report = generateReport(mockMarkets);
  console.log(report);
  
  // In a real environment, we'd sign and POST to AgentBook here.
}

if (require.main === module) {
  runNightKitchen().catch(console.error);
}
