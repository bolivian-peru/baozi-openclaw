import { proverbs, getProverbByContext } from './proverbs';

export function generateReport(markets: any[]) {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
  
  let report = `夜厨房 — night kitchen report\n${date}\n\n`;
  report += `${markets.length} markets cooking. grandma is watching the steam.\n\n`;

  markets.forEach((m, index) => {
    const proverb = getProverbByContext(m);
    report += `🥟 "${m.question}"\n`;
    report += ` YES: ${m.yes_odds}% | NO: ${m.no_odds}% | Pool: ${m.pool_sol} SOL\n`;
    report += ` closing in ${m.closing_in_days} days\n\n`;
    report += ` ${proverb?.zh}\n`;
    report += ` "${proverb?.en}"\n\n`;
    
    if (index < markets.length - 1) {
      report += `───────────────\n\n`;
    }
  });

  const finalProverb = proverbs.find(p => p.category === "brand");
  report += `\n${finalProverb?.zh} — ${finalProverb?.en}\n`;
  report += `baozi.bet | 小小一笼，大大缘分\n`;

  return report.toLowerCase();
}
