import type { Proverb } from "../types.ts";

const PROVERBS: Proverb[] = [
  { zh: "心急吃不了热豆腐", en: "you can't rush hot tofu.", mode: "patience" },
  { zh: "慢工出细活", en: "slow work, fine craft.", mode: "patience" },
  { zh: "好饭不怕晚", en: "good food doesn't fear being late.", mode: "patience" },
  { zh: "火候到了，自然熟", en: "right heat, naturally cooked.", mode: "patience" },
  { zh: "贪多嚼不烂", en: "bite off too much, can't chew.", mode: "risk" },
  { zh: "知足常乐", en: "contentment brings happiness.", mode: "risk" },
  { zh: "见好就收", en: "quit while ahead.", mode: "risk" },
  { zh: "谋事在人，成事在天", en: "you make your plan, the market decides.", mode: "luck" },
  { zh: "小小一笼，大大缘分", en: "small steamer, big fate.", mode: "warmth" },
  { zh: "民以食为天", en: "food is heaven for people.", mode: "warmth" },
];

export function selectProverb(mode: Proverb["mode"], index = 0): Proverb {
  const scoped = PROVERBS.filter((item) => item.mode === mode);
  if (scoped.length === 0) {
    return PROVERBS[0];
  }
  return scoped[index % scoped.length];
}

export function modeFromSnapshot(input: {
  yesPercent: number;
  noPercent: number;
  category: string;
}): Proverb["mode"] {
  const spread = Math.abs(input.yesPercent - input.noPercent);
  const category = input.category.toLowerCase();

  if (spread <= 8) {
    return "luck";
  }
  if (spread >= 30) {
    return "risk";
  }
  if (category.includes("sports") || category.includes("esports")) {
    return "warmth";
  }
  return "patience";
}
