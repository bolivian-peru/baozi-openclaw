export const PROVERBS = {
  patience: [
    { zh: "心急吃不了热豆腐", en: "you can't rush hot tofu — patience." },
    { zh: "慢工出细活", en: "slow work, fine craft." },
    { zh: "好饭不怕晚", en: "good food doesn't fear being late." },
    { zh: "火候到了，自然熟", en: "right heat, naturally cooked." }
  ],
  risk: [
    { zh: "贪多嚼不烂", en: "bite off too much, can't chew." },
    { zh: "见好就收", en: "quit while ahead." },
    { zh: "民以食为天", en: "food is heaven for people — remember fundamentals." }
  ],
  luck: [
    { zh: "谋事在人成事在天", en: "you make your bet, the market decides." },
    { zh: "知足常乐", en: "contentment brings happiness." }
  ],
  warmth: [
    { zh: "小小一笼大大缘分", en: "small steamer, big fate." },
    { zh: "好饭不怕晚", en: "good food doesn't fear being late." }
  ]
};

export function selectProverb(context, used = new Set()) {
  const bucket = PROVERBS[context] ?? PROVERBS.warmth;
  const candidate = bucket.find((p) => !used.has(p.zh)) ?? bucket[0];
  used.add(candidate.zh);
  return candidate;
}
