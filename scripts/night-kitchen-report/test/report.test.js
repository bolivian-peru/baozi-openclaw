import test from "node:test";
import assert from "node:assert/strict";
import { selectProverb } from "../src/proverbs.js";
import { renderNightKitchenReport } from "../src/report.js";

test("selectProverb reuses category but avoids immediate duplicates", () => {
  const used = new Set();
  const p1 = selectProverb("patience", used);
  const p2 = selectProverb("patience", used);
  assert.notEqual(p1.zh, p2.zh);
});

test("renderNightKitchenReport outputs bilingual format and disclaimers", () => {
  const report = renderNightKitchenReport([
    { question: "will btc hit $110k?", yes: 0.58, no: 0.42, poolSol: 32.4, closesInHours: 240 },
    { question: "will sol close above $220?", yes: 0.51, no: 0.49, poolSol: 61.2, closesInHours: 8 }
  ], new Date("2026-02-19T00:00:00Z"));

  assert.match(report, /夜厨房 — night kitchen report/);
  assert.match(report, /心急吃不了热豆腐|慢工出细活|好饭不怕晚|火候到了，自然熟/);
  assert.match(report, /this is still gambling\. play small, play soft\./);
  assert.match(report, /baozi\.bet \| 小小一笼，大大缘分/);
});
