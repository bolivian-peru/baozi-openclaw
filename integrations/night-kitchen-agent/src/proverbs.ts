export const proverbs = [
  {
    zh: "心急吃不了热豆腐",
    en: "you can't rush hot tofu — patience.",
    category: "patience"
  },
  {
    zh: "慢工出细活",
    en: "slow work, fine craft — quality takes time.",
    category: "patience"
  },
  {
    zh: "好饭不怕晚",
    en: "good food doesn't fear being late — worth waiting.",
    category: "patience"
  },
  {
    zh: "火候到了，自然熟",
    en: "right heat, naturally cooked — timing is everything.",
    category: "timing"
  },
  {
    zh: "民以食为天",
    en: "food is heaven for people — fundamentals first.",
    category: "fundamentals"
  },
  {
    zh: "贪多嚼不烂",
    en: "bite off too much, can't chew — caution with risk.",
    category: "risk"
  },
  {
    zh: "知足常乐",
    en: "contentment brings happiness — take profits.",
    category: "profits"
  },
  {
    zh: "见好就收",
    en: "quit while ahead — smart exits.",
    category: "profits"
  },
  {
    zh: "谋事在人，成事在天",
    en: "you make your bet, the market decides.",
    category: "acceptance"
  },
  {
    zh: "小小一笼，大大缘分",
    en: "small steamer, big fate.",
    category: "brand"
  }
];

export function getProverbByContext(market: any) {
  const timeLeft = market.closing_in_days || 0;
  const poolSize = market.pool_sol || 0;

  if (timeLeft > 7) return proverbs.find(p => p.category === "patience");
  if (timeLeft < 2) return proverbs.find(p => p.category === "timing");
  if (poolSize > 50) return proverbs.find(p => p.category === "risk");
  
  return proverbs.find(p => p.category === "acceptance") || proverbs[proverbs.length - 1];
}
