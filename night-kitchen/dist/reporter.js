import { classifyMarket } from "./classifier.js";
import { selectProverb } from "./proverbs.js";
import { formatPercent, formatPool, sortByPool, truncate } from "./utils.js";
export function buildEntries(markets) {
    return sortByPool(markets).slice(0, 4).map((market) => {
        const signals = classifyMarket(market);
        const proverb = selectProverb(signals.tags);
        return {
            market,
            signals,
            proverb,
            englishLine: buildEnglishLine(market, signals)
        };
    });
}
export function renderReport(markets) {
    const entries = buildEntries(markets);
    const lines = [
        "夜厨房 — night kitchen report",
        new Date().toISOString().slice(0, 10),
        "",
        `${entries.length} markets cooking. keep the lid light.`,
        ""
    ];
    for (const entry of entries) {
        lines.push(`🥟 "${truncate(entry.market.question.toLowerCase(), 72)}"`);
        lines.push(`   ${entry.signals.favoredLabel.toLowerCase()}: ${formatPercent(entry.signals.favoredProbability)} | pool: ${formatPool(entry.market.pool.total)}`);
        lines.push(`   ${entry.englishLine}`);
        lines.push(`   ${entry.proverb.zh}`);
        lines.push(`   "${entry.proverb.en}"`);
        lines.push("");
    }
    lines.push("小小一笼，大大缘分");
    lines.push("baozi.bet | play small, play soft.");
    return lines.join("\n");
}
function buildEnglishLine(market, signals) {
    if (signals.tags.includes("heat")) {
        return "the steam is loud now. if you move, move with a small spoon.";
    }
    if (signals.tags.includes("patience")) {
        return "this one is still simmering. no need to lift the lid early.";
    }
    if (signals.tags.includes("risk")) {
        return `one side is leaning hard toward ${signals.favoredLabel.toLowerCase()}. crowded bamboo can split.`;
    }
    if (signals.tags.includes("profit")) {
        return `real size in this pool. the table is warm, but warm tables still burn fingers.`;
    }
    return `the market is balanced and talking softly. ${truncate(market.question.toLowerCase(), 44)} still needs time.`;
}
