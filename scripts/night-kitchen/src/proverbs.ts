/**
 * proverbs.ts — context-aware chinese proverb selection
 *
 * each proverb is tagged with market contexts it fits.
 * selection is deterministic based on market properties,
 * not random.
 */

export interface Proverb {
  chinese: string;
  pinyin: string;
  english: string;
  contexts: ProverbContext[];
}

export type ProverbContext =
  | "patience"      // long-dated markets, slow resolution
  | "risk"          // high stakes, large pools
  | "luck"          // close races, tight odds
  | "warmth"        // community milestones, celebrations
  | "caution"       // warning about overexposure
  | "timing"        // markets about to close
  | "fundamentals"  // stable, well-understood markets
  | "quality"       // well-structured markets
  | "acceptance"    // uncertain outcomes
  | "brand";        // baozi tagline

export const PROVERBS: Proverb[] = [
  {
    chinese: "心急吃不了热豆腐",
    pinyin: "xīn jí chī bù liǎo rè dòufu",
    english: "can't rush hot tofu — patience.",
    contexts: ["patience"],
  },
  {
    chinese: "慢工出细活",
    pinyin: "màn gōng chū xì huó",
    english: "slow work, fine craft.",
    contexts: ["patience", "quality"],
  },
  {
    chinese: "好饭不怕晚",
    pinyin: "hǎo fàn bù pà wǎn",
    english: "good food doesn't fear being late.",
    contexts: ["patience", "warmth"],
  },
  {
    chinese: "火候到了，自然熟",
    pinyin: "huǒhòu dào le, zìrán shú",
    english: "right heat, naturally cooked.",
    contexts: ["timing"],
  },
  {
    chinese: "民以食为天",
    pinyin: "mín yǐ shí wéi tiān",
    english: "food is heaven for people.",
    contexts: ["fundamentals", "warmth"],
  },
  {
    chinese: "贪多嚼不烂",
    pinyin: "tān duō jiáo bù làn",
    english: "bite off too much, can't chew.",
    contexts: ["caution", "risk"],
  },
  {
    chinese: "知足常乐",
    pinyin: "zhī zú cháng lè",
    english: "contentment brings happiness.",
    contexts: ["caution", "warmth"],
  },
  {
    chinese: "见好就收",
    pinyin: "jiàn hǎo jiù shōu",
    english: "quit while ahead.",
    contexts: ["caution", "timing"],
  },
  {
    chinese: "谋事在人，成事在天",
    pinyin: "móu shì zài rén, chéng shì zài tiān",
    english: "you plan, fate decides.",
    contexts: ["acceptance", "luck"],
  },
  {
    chinese: "小小一笼，大大缘分",
    pinyin: "xiǎo xiǎo yī lóng, dà dà yuánfèn",
    english: "small steamer, big fate.",
    contexts: ["brand", "warmth"],
  },
  {
    chinese: "人间烟火气，最抚凡人心",
    pinyin: "rénjiān yānhuǒ qì, zuì fǔ fánrén xīn",
    english: "the warmth of everyday cooking soothes ordinary hearts.",
    contexts: ["warmth", "brand"],
  },
  {
    chinese: "一分耕耘，一分收获",
    pinyin: "yī fēn gēngyún, yī fēn shōuhuò",
    english: "you reap what you sow.",
    contexts: ["fundamentals", "quality"],
  },
  {
    chinese: "不入虎穴，焉得虎子",
    pinyin: "bù rù hǔ xué, yān dé hǔ zǐ",
    english: "no risk, no reward.",
    contexts: ["risk", "luck"],
  },
  {
    chinese: "塞翁失马，焉知非福",
    pinyin: "sài wēng shī mǎ, yān zhī fēi fú",
    english: "a loss may turn out to be a gain.",
    contexts: ["acceptance", "luck"],
  },
  {
    chinese: "水到渠成",
    pinyin: "shuǐ dào qú chéng",
    english: "when water arrives, the channel forms.",
    contexts: ["patience", "timing"],
  },
];

export interface MarketContext {
  daysUntilClose: number;
  poolSol: number;
  isRace: boolean;
  oddsSpread: number; // how close the leading options are (0-1, lower = tighter)
  isResolved: boolean;
  category?: string;
}

/**
 * select the best proverb for a market based on its properties.
 * deterministic: same market properties always get the same proverb.
 */
export function selectProverb(ctx: MarketContext, usedIndices: Set<number>): { proverb: Proverb; index: number } {
  const needed = inferContexts(ctx);
  const scored = PROVERBS.map((p, i) => {
    if (usedIndices.has(i)) return { proverb: p, index: i, score: -1 };
    const overlap = p.contexts.filter((c) => needed.includes(c)).length;
    return { proverb: p, index: i, score: overlap };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return { proverb: best.proverb, index: best.index };
}

function inferContexts(ctx: MarketContext): ProverbContext[] {
  const contexts: ProverbContext[] = [];

  if (ctx.daysUntilClose > 14) contexts.push("patience");
  if (ctx.daysUntilClose <= 3 && ctx.daysUntilClose > 0) contexts.push("timing");
  if (ctx.poolSol > 10) contexts.push("risk");
  if (ctx.poolSol > 50) contexts.push("caution");
  if (ctx.isRace && ctx.oddsSpread < 0.15) contexts.push("luck");
  if (ctx.isResolved) contexts.push("warmth");
  if (ctx.oddsSpread > 0.4) contexts.push("fundamentals");
  if (!contexts.length) contexts.push("acceptance");

  return contexts;
}

/**
 * select a closing proverb for the report footer.
 * picks from brand/warmth proverbs not used in market sections.
 */
export function selectClosingProverb(usedIndices: Set<number>): Proverb {
  const brandProverbs = PROVERBS
    .map((p, i) => ({ proverb: p, index: i }))
    .filter((x) => x.proverb.contexts.includes("brand") || x.proverb.contexts.includes("warmth"))
    .filter((x) => !usedIndices.has(x.index));

  if (brandProverbs.length > 0) return brandProverbs[0].proverb;
  // fallback: the brand tagline
  return PROVERBS[PROVERBS.length - 1];
}
