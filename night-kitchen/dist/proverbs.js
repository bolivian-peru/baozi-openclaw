export const PROVERBS = [
    { zh: "心急吃不了热豆腐", en: "you can't rush hot tofu.", tags: ["patience", "calm"] },
    { zh: "慢工出细活", en: "slow work makes fine craft.", tags: ["patience", "calm"] },
    { zh: "好饭不怕晚", en: "good food does not fear being late.", tags: ["patience", "profit"] },
    { zh: "火候到了，自然熟", en: "when the heat is right, it cooks itself.", tags: ["timing", "heat"] },
    { zh: "见好就收", en: "take the good hand and step back.", tags: ["profit", "timing"] },
    { zh: "贪多嚼不烂", en: "bite off too much and you cannot chew it.", tags: ["risk", "heat"] },
    { zh: "谋事在人，成事在天", en: "you make the move, the market decides.", tags: ["luck", "risk"] },
    { zh: "知足常乐", en: "contentment keeps the table warm.", tags: ["profit", "calm"] }
];
export function selectProverb(tags) {
    const ranked = PROVERBS
        .map((proverb) => ({
        proverb,
        score: proverb.tags.filter((tag) => tags.includes(tag)).length
    }))
        .sort((a, b) => b.score - a.score);
    return ranked[0]?.proverb ?? PROVERBS[0];
}
