import { classifyMarket } from "../classifier.js";
import { buildEntries, renderReport } from "../reporter.js";
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
const fixtureMarkets = [
    {
        pda: "m1",
        question: "Will BTC hit 110k by March 31?",
        closingTime: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
        pool: { total: 31.5 },
        outcomes: [
            { index: 0, label: "Yes", probability: 0.68, pool: 21.4 },
            { index: 1, label: "No", probability: 0.32, pool: 10.1 }
        ]
    },
    {
        pda: "m2",
        question: "Will ETH ETF volume beat BTC ETF volume this week?",
        closingTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        pool: { total: 8.2 },
        outcomes: [
            { index: 0, label: "Yes", probability: 0.53, pool: 4.4 },
            { index: 1, label: "No", probability: 0.47, pool: 3.8 }
        ]
    }
];
function main() {
    const patient = classifyMarket(fixtureMarkets[0]);
    assert(patient.tags.includes("patience"), "long-dated market should be tagged patience");
    assert(patient.tags.includes("profit"), "larger pool should be tagged profit");
    const urgent = classifyMarket(fixtureMarkets[1]);
    assert(urgent.tags.includes("heat"), "near-closing market should be tagged heat");
    assert(urgent.tags.includes("timing"), "near-closing market should be tagged timing");
    const entries = buildEntries(fixtureMarkets);
    assert(entries.length === 2, "expected two report entries");
    assert(entries[0].proverb.zh.length > 0, "expected proverb selection");
    const report = renderReport(fixtureMarkets);
    assert(report.includes("夜厨房"), "report should include bilingual title");
    assert(report.includes("小小一笼，大大缘分"), "report should include brand tagline");
    console.log("4 tests passed, 0 failed");
}
main();
