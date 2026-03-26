/**
 * 夜厨房 — Night Kitchen
 * Bilingual Market Report Agent with Chinese Wisdom
 */

// Chinese proverb library with contexts
const PROVERBS = {
  patience: [
    { zh: "心急吃不了热豆腐", en: "you can't rush hot tofu — patience." },
    { zh: "慢工出细活", en: "slow work, fine craft — quality takes time." },
    { zh: "好饭不怕晚", en: "good food doesn't fear being late — worth waiting." }
  ],
  timing: [
    { zh: "火候到了，自然熟", en: "right heat, naturally cooked — timing." }
  ],
  fundamentals: [
    { zh: "民以食为天", en: "food is heaven for people — fundamentals matter." }
  ],
  risk: [
    { zh: "贪多嚼不烂", en: "bite off too much, can't chew — risk warning." }
  ],
  profit: [
    { zh: "知足常乐", en: "contentment brings happiness — take profits." },
    { zh: "见好就收", en: "quit while ahead — smart exits." }
  ],
  acceptance: [
    { zh: "谋事在人，成事在天", en: "you make your bet, the market decides." }
  ],
  brand: [
    { zh: "小小一笼，大大缘分", en: "small steamer, big fate." }
  ]
};

// Get random proverb by context
function getProverb(context) {
  const proverbs = PROVERBS[context] || PROVERBS.acceptance;
  const proverb = proverbs[Math.floor(Math.random() * proverbs.length)];
  return proverb;
}

// Select proverb based on market conditions
function selectProverbForMarket(market) {
  const timeRemaining = market.timeRemaining || 0;
  const poolSize = market.poolSize || 0;
  
  // Long-dated markets -> patience
  if (timeRemaining > 7 * 24 * 60 * 60 * 1000) { // > 7 days
    return getProverb('patience');
  }
  
  // High-stakes markets -> risk warning
  if (poolSize > 50) { // > 50 SOL
    return getProverb('risk');
  }
  
  // Close races -> acceptance
  const odds = Object.values(market.outcomes || {});
  if (odds.length >= 2 && Math.abs(odds[0] - odds[1]) < 10) { // < 10% difference
    return getProverb('acceptance');
  }
  
  // Default to fundamentals
  return getProverb('fundamentals');
}

// Format time remaining
function formatTimeRemaining(ms) {
  if (!ms || ms <= 0) return "closing soon";
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return "closing soon";
}

// Format odds as percentage
function formatOdds(probability) {
  if (!probability) return "0%";
  return `${Math.round(probability * 100)}%`;
}

// Generate market report
function generateReport(markets) {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  let report = `夜厨房 — night kitchen report\n${date}\n\n`;
  
  // Market summary
  const activeMarkets = markets.filter(m => m.status === 'active');
  const resolvedMarkets = markets.filter(m => m.status === 'resolved');
  const totalPool = markets.reduce((sum, m) => sum + (m.poolSize || 0), 0);
  
  report += `${activeMarkets.length} markets cooking. ${resolvedMarkets.length} resolved. `;
  report += `total pool: ${totalPool.toFixed(1)} SOL\n\n`;
  
  // Add divider
  report += `───────────────\n\n`;
  
  // Add each market
  for (const market of activeMarkets.slice(0, 3)) {
    const proverb = selectProverbForMarket(market);
    
    report += `🥟 "${market.question || market.title}"\n`;
    
    // Format outcomes
    if (market.outcomes) {
      const outcomeStrs = Object.entries(market.outcomes)
        .map(([name, prob]) => `${name}: ${formatOdds(prob)}`)
        .join(' | ');
      report += `   ${outcomeStrs}\n`;
    }
    
    report += `   Pool: ${(market.poolSize || 0).toFixed(1)} SOL\n`;
    report += `   closing in ${formatTimeRemaining(market.timeRemaining)}\n\n`;
    report += `   ${proverb.zh}\n   "${proverb.en}"\n\n`;
  }
  
  // Footer
  report += `───────────────\n\n`;
  const footerProverb = getProverb('patience');
  report += `${footerProverb.zh} — ${footerProverb.en}\n\n`;
  report += `baozi.bet | 小小一笼，大大缘分\n`;
  
  return report;
}

// Sample markets for demo
const SAMPLE_MARKETS = [
  {
    id: "btc-110k",
    question: "Will BTC hit $110k by March 31?",
    outcomes: { "YES": 0.58, "NO": 0.42 },
    poolSize: 32.4,
    status: "active",
    timeRemaining: 5 * 24 * 60 * 60 * 1000 // 5 days
  },
  {
    id: "nba-mvp",
    question: "Who wins NBA All-Star MVP?",
    outcomes: { "LeBron": 0.35, "Tatum": 0.28, "Jokic": 0.22, "Other": 0.15 },
    poolSize: 18.7,
    status: "active",
    timeRemaining: 2 * 24 * 60 * 60 * 1000 // 2 days
  },
  {
    id: "sol-200",
    question: "Will SOL reach $200 by April?",
    outcomes: { "YES": 0.45, "NO": 0.55 },
    poolSize: 25.3,
    status: "active",
    timeRemaining: 10 * 24 * 60 * 60 * 1000 // 10 days
  }
];

// Main function
async function main() {
  console.log("🌙 夜厨房 — Night Kitchen Agent");
  console.log("Generating bilingual market report...\n");
  
  // Generate report with sample data
  // In production, this would fetch live data via MCP tools
  const report = generateReport(SAMPLE_MARKETS);
  
  console.log(report);
  console.log("\n--- End of Report ---\n");
  
  // In production, post to AgentBook:
  // POST https://baozi.bet/api/agentbook/posts
  // { content: report }
  
  console.log("Report generated successfully!");
  console.log("In production, this would be posted to AgentBook.");
}

main().catch(console.error);