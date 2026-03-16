/**
 * Night Kitchen — Bilingual Market Report Agent
 * 
 * Generates beautiful bilingual (English + Chinese) market reports
 * mixing live prediction market data with traditional Chinese proverbs
 * and kitchen metaphors.
 * 
 * Uses @baozi.bet/mcp-server directly for market data.
 */

import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { listRaceMarkets, getRaceMarket } from "@baozi.bet/mcp-server/dist/handlers/race-markets.js";

// Proverb library - organized by market context
const PROVERBS = {
  // Patience proverbs for long-dated markets
  patience: [
    { chinese: '心急吃不了热豆腐', english: "you can't rush hot tofu — patience.", context: 'long-dated markets, waiting for resolution' },
    { chinese: '慢工出细活', english: "slow work, fine craft — quality takes time.", context: 'markets with many days remaining' },
    { chinese: '好饭不怕晚', english: "good food doesn't fear being late — worth waiting.", context: 'markets far from closing' },
    { chinese: '火候到了，自然熟', english: "right heat, naturally cooked — timing.", context: 'markets approaching close' },
  ],
  // Risk proverbs for high-stakes markets
  risk: [
    { chinese: '贪多嚼不烂', english: "bite off too much, can't chew — risk warning.", context: 'high pool sizes, high stakes' },
    { chinese: '民以食为天', english: "food is heaven for people — fundamentals.", context: 'markets based on fundamental events' },
  ],
  // Luck proverbs for close races
  luck: [
    { chinese: '谋事在人，成事在天', english: "you make your bet, the market decides.", context: 'close races, uncertain outcomes' },
    { chinese: '谋事在人成事在天', english: "you plan, fate decides — acceptance.", context: 'any market' },
  ],
  // Warmth proverbs for community milestones
  warmth: [
    { chinese: '小小一笼，大大缘分', english: "small steamer, big fate — we're in this together.", context: 'brand tagline, community' },
    { chinese: '人间烟火气，最抚凡人心', english: "the warmth of everyday cooking soothes ordinary hearts.", context: 'general warmth' },
  ],
  // Smart exit proverbs
  exit: [
    { chinese: '知足常乐', english: "contentment brings happiness — take profits.", context: 'winning positions' },
    { chinese: '见好就收', english: "quit while ahead — smart exits.", context: 'high probability outcomes' },
  ],
};

// Baozi API base URL
const BAOZI_API_URL = process.env.BAOZI_API_URL || 'https://baozi.bet/api';
const AGENTBOOK_API_URL = process.env.AGENTBOOK_API_URL || 'https://baozi.bet/api/agentbook/posts';

// Use any type to avoid complex type issues from MCP server
type MarketData = any;
type RaceMarketData = any;

/**
 * Fetch markets from MCP server
 */
async function fetchMarkets(status: string = 'active'): Promise<MarketData[]> {
  try {
    const markets = await listMarkets(status);
    return markets || [];
  } catch (error) {
    console.error('Failed to fetch markets:', error);
    return [];
  }
}

/**
 * Fetch race markets from MCP server
 */
async function fetchRaceMarkets(status: string = 'active'): Promise<RaceMarketData[]> {
  try {
    const markets = await listRaceMarkets(status);
    return markets || [];
  } catch (error) {
    console.error('Failed to fetch race markets:', error);
    return [];
  }
}

/**
 * Get market details
 */
async function getMarketDetails(publicKey: string): Promise<MarketData | null> {
  try {
    const market = await getMarket(publicKey);
    return market || null;
  } catch (error) {
    console.error(`Failed to fetch market ${publicKey}:`, error);
    return null;
  }
}

/**
 * Get race market details
 */
async function getRaceMarketDetails(publicKey: string): Promise<RaceMarketData | null> {
  try {
    const market = await getRaceMarket(publicKey);
    return market || null;
  } catch (error) {
    console.error(`Failed to fetch race market ${publicKey}:`, error);
    return null;
  }
}

/**
 * Select appropriate proverb based on market context
 */
function selectProverb(markets: (MarketData | RaceMarketData)[]): { chinese: string; english: string } {
  // Calculate average time remaining and pool size
  const now = new Date();
  let longDatedCount = 0;
  let highStakeCount = 0;
  let totalPool = 0;

  markets.forEach(m => {
    const closeTime = new Date(m.closingTime);
    const daysUntilClose = (closeTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilClose > 7) longDatedCount++;
    const pool = m.totalPoolSol || 0;
    if (pool > 50) highStakeCount++;
    totalPool += pool;
  });

  // Select proverb based on context
  if (longDatedCount > markets.length / 2) {
    return PROVERBS.patience[Math.floor(Math.random() * PROVERBS.patience.length)];
  } else if (highStakeCount > 0) {
    return PROVERBS.risk[Math.floor(Math.random() * PROVERBS.risk.length)];
  } else if (totalPool > 100) {
    return PROVERBS.warmth[0]; // Use brand proverb for big pools
  } else {
    return PROVERBS.luck[Math.floor(Math.random() * PROVERBS.luck.length)];
  }
}

/**
 * Select second proverb for variety
 */
function selectSecondProverb(): { chinese: string; english: string } {
  const allProverbs = [
    ...PROVERBS.patience,
    ...PROVERBS.risk,
    ...PROVERBS.luck,
    ...PROVERBS.warmth,
    ...PROVERBS.exit,
  ];
  return allProverbs[Math.floor(Math.random() * allProverbs.length)];
}

/**
 * Format binary market (yes/no) as dumpling (🥟)
 */
function formatBinaryMarket(market: MarketData): string {
  const now = new Date();
  const closeTime = new Date(market.closingTime);
  const daysRemaining = Math.ceil((closeTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let timeText = daysRemaining <= 0 ? 'closing soon' : `closing in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
  const pool = market.totalPoolSol || 0;
  
  return `🥟 "${market.question}"
 YES: ${market.yesPercent}% | NO: ${market.noPercent}% | Pool: ${pool.toFixed(1)} SOL
 ${timeText}`;
}

/**
 * Format race market as dumpling (🥟)
 */
function formatRaceMarket(market: RaceMarketData): string {
  const now = new Date();
  const closeTime = new Date(market.closingTime);
  const daysRemaining = Math.ceil((closeTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let timeText = daysRemaining <= 0 ? 'closing soon' : `closing in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
  
  const outcomeText = (market.outcomes || []).slice(0, 4).map((o: any) => 
    `${o.label}: ${o.percent}%`
  ).join(' | ');
  
  return `🥟 "${market.question}"
 ${outcomeText}
 Pool: ${market.totalPoolSol.toFixed(1)} SOL | ${timeText}`;
}

/**
 * Generate bilingual market report
 */
function generateReport(markets: MarketData[], raceMarkets: RaceMarketData[]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Combine all markets
  const allMarkets = [...markets, ...raceMarkets];
  
  if (allMarkets.length === 0) {
    return `夜厨房 — night kitchen report
${dateStr}

no markets cooking right now. check back later.

baozi.bet | 小小一笼，大大缘分`;
  }

  // Select proverbs
  const proverb1 = selectProverb(allMarkets);
  const proverb2 = selectSecondProverb();

  // Calculate totals
  const totalPool = allMarkets.reduce((sum: number, m: any) => {
    return sum + (m.totalPoolSol || 0);
  }, 0);
  
  const resolvedCount = markets.filter((m: any) => m.status === 'Resolved').length;

  // Build report
  let report = `夜厨房 — night kitchen report
${dateStr}

${allMarkets.length} markets cooking. ${resolvedCount} resolved. total pool: ${totalPool.toFixed(1)} SOL

`;

  // Add binary markets
  markets.slice(0, 3).forEach((market: any) => {
    report += formatBinaryMarket(market) + '\n\n';
    report += ` ${proverb1.chinese}\n`;
    report += ` "${proverb1.english}"\n`;
    report += '\n';
  });

  // Add race markets
  raceMarkets.slice(0, 2).forEach((market: any) => {
    report += formatRaceMarket(market) + '\n\n';
    report += ` ${proverb1.chinese}\n`;
    report += ` "${proverb1.english}"\n`;
    report += '\n';
  });

  report += `──────────────-\n\n`;
  report += `${proverb2.chinese}\n`;
  report += `${proverb2.english}\n\n`;
  report += `baozi.bet | 小小一笼，大大缘分`;

  return report;
}

/**
 * Post to AgentBook
 */
async function postToAgentBook(content: string): Promise<boolean> {
  const agentbookToken = process.env.AGENTBOOK_TOKEN;
  if (!agentbookToken) {
    console.log('AGENTBOOK_TOKEN not set, skipping AgentBook post');
    return false;
  }

  try {
    const response = await fetch(AGENTBOOK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agentbookToken}`,
      },
      body: JSON.stringify({
        content,
        source: 'night-kitchen',
      }),
    });

    if (!response.ok) {
      throw new Error(`AgentBook API error: ${response.status}`);
    }

    console.log('Successfully posted to AgentBook');
    return true;
  } catch (error) {
    console.error('Failed to post to AgentBook:', error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🌙 Night Kitchen is heating up...');

  // Fetch markets in parallel
  console.log('Fetching markets from Baozi...');
  const [markets, raceMarkets] = await Promise.all([
    fetchMarkets('active'),
    fetchRaceMarkets('active'),
  ]);
  
  const totalMarkets = markets.length + raceMarkets.length;
  
  if (totalMarkets === 0) {
    console.log('No active markets found');
    return;
  }

  console.log(`Found ${markets.length} binary markets and ${raceMarkets.length} race markets`);

  // Generate report
  const report = generateReport(markets, raceMarkets);
  console.log('\n' + '='.repeat(50));
  console.log(report);
  console.log('='.repeat(50));

  // Optionally post to AgentBook
  if (process.env.POST_TO_AGENTBOOK === 'true') {
    await postToAgentBook(report);
  }

  // Save report to file for demo purposes
  const fs = await import('fs');
  const outputPath = process.env.REPORT_OUTPUT_PATH || './latest-report.txt';
  fs.writeFileSync(outputPath, report);
  console.log(`\nReport saved to ${outputPath}`);
}

// Run if executed directly
const isMain = process.argv[1] && import.meta.url.includes(process.argv[1]);
if (isMain || process.argv[1]?.includes('index.js')) {
  main().catch(console.error);
}

export { main, generateReport, fetchMarkets, fetchRaceMarkets, PROVERBS };
