/**
 * Chinese proverb library with contextual matching.
 *
 * Each proverb is tagged with contexts it fits:
 *   patience  — long-dated markets, slow resolution
 *   risk      — high-stakes pools, volatile odds
 *   luck      — close races, near-even odds
 *   warmth    — community milestones, resolved markets
 *   profit    — taking gains, resolved with high payoff
 *   closing   — markets about to close
 */

export interface Proverb {
  chinese: string;
  pinyin: string;
  english: string;
  kitchen: string; // baozi-voice interpretation
  contexts: string[];
}

export const PROVERBS: Proverb[] = [
  {
    chinese: "心急吃不了热豆腐",
    pinyin: "xīnjí chī bùliǎo rè dòufu",
    english: "can't rush hot tofu",
    kitchen: "patience.",
    contexts: ["patience", "closing"],
  },
  {
    chinese: "慢工出细活",
    pinyin: "màn gōng chū xì huó",
    english: "slow work, fine craft",
    kitchen: "quality takes time.",
    contexts: ["patience"],
  },
  {
    chinese: "好饭不怕晚",
    pinyin: "hǎo fàn bùpà wǎn",
    english: "good food doesn't fear being late",
    kitchen: "worth waiting.",
    contexts: ["patience", "warmth"],
  },
  {
    chinese: "火候到了，自然熟",
    pinyin: "huǒhòu dào le, zìrán shú",
    english: "right heat, naturally cooked",
    kitchen: "timing is everything.",
    contexts: ["patience", "closing"],
  },
  {
    chinese: "民以食为天",
    pinyin: "mín yǐ shí wéi tiān",
    english: "food is heaven for people",
    kitchen: "fundamentals matter.",
    contexts: ["warmth", "risk"],
  },
  {
    chinese: "贪多嚼不烂",
    pinyin: "tān duō jiáo bù làn",
    english: "bite off too much, can't chew",
    kitchen: "don't overbet.",
    contexts: ["risk"],
  },
  {
    chinese: "知足常乐",
    pinyin: "zhīzú cháng lè",
    english: "contentment brings happiness",
    kitchen: "take profits.",
    contexts: ["profit"],
  },
  {
    chinese: "见好就收",
    pinyin: "jiàn hǎo jiù shōu",
    english: "quit while ahead",
    kitchen: "smart exits.",
    contexts: ["profit"],
  },
  {
    chinese: "谋事在人，成事在天",
    pinyin: "móu shì zài rén, chéng shì zài tiān",
    english: "you plan, fate decides",
    kitchen: "you make your bet, the market decides.",
    contexts: ["luck", "risk"],
  },
  {
    chinese: "小小一笼，大大缘分",
    pinyin: "xiǎo xiǎo yī lóng, dà dà yuánfèn",
    english: "small steamer, big fate",
    kitchen: "every bet connects us.",
    contexts: ["warmth", "luck"],
  },
  {
    chinese: "人间烟火气，最抚凡人心",
    pinyin: "rénjiān yānhuǒ qì, zuì fǔ fánrén xīn",
    english: "the warmth of everyday cooking soothes ordinary hearts",
    kitchen: "markets are for everyone.",
    contexts: ["warmth"],
  },
  {
    chinese: "不入虎穴，焉得虎子",
    pinyin: "bù rù hǔ xué, yān dé hǔ zǐ",
    english: "nothing ventured, nothing gained",
    kitchen: "can't win if you don't sit down.",
    contexts: ["risk", "luck"],
  },
];

/**
 * Select a proverb matching the given context.
 * Returns a random match from the matching set.
 */
export function selectProverb(context: string): Proverb {
  const matches = PROVERBS.filter((p) => p.contexts.includes(context));
  if (matches.length === 0) {
    return PROVERBS[Math.floor(Math.random() * PROVERBS.length)];
  }
  return matches[Math.floor(Math.random() * matches.length)];
}

/**
 * Pick N unique proverbs for a set of contexts.
 * Avoids duplicates across the returned list.
 */
export function selectProverbs(contexts: string[], count: number): Proverb[] {
  const used = new Set<string>();
  const result: Proverb[] = [];

  for (const ctx of contexts) {
    if (result.length >= count) break;
    const candidates = PROVERBS.filter(
      (p) => p.contexts.includes(ctx) && !used.has(p.chinese)
    );
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      used.add(pick.chinese);
      result.push(pick);
    }
  }

  // fill remaining with random unused proverbs
  while (result.length < count) {
    const remaining = PROVERBS.filter((p) => !used.has(p.chinese));
    if (remaining.length === 0) break;
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    used.add(pick.chinese);
    result.push(pick);
  }

  return result;
}
