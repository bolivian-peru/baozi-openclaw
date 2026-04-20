import type { MarketSnapshot, Proverb } from "../types.ts";
import { modeFromSnapshot, selectProverb } from "./proverbs.ts";

export interface ReportBuildOptions {
  titleDate: string;
  footer?: string;
}

function renderMarketBlock(snapshot: MarketSnapshot, index: number): string {
  const mode = modeFromSnapshot(snapshot);
  const proverb = selectProverb(mode, index);

  return [
    `🥟 \"${snapshot.question}\"`,
    `   yes: ${snapshot.yesPercent}% | no: ${snapshot.noPercent}% | pool: ${snapshot.poolSol} sol`,
    `   ${snapshot.closingLabel}`,
    "",
    `   ${proverb.zh}`,
    `   \"${proverb.en}\"`,
    "",
  ].join("\n");
}

function selectWarmFooter(proverbFallback?: Proverb): string {
  const proverb = proverbFallback ?? selectProverb("warmth", 0);
  return `${proverb.zh} — ${proverb.en}`;
}

export function buildBilingualReport(snapshots: MarketSnapshot[], options: ReportBuildOptions): string {
  const lines: string[] = [];

  lines.push("夜厨房 — night kitchen report");
  lines.push(options.titleDate.toLowerCase());
  lines.push("");
  lines.push("the steam is soft, but the odds are serious.");
  lines.push("this is still gambling. play small, play soft.");
  lines.push("");

  snapshots.forEach((snapshot, index) => {
    lines.push(renderMarketBlock(snapshot, index));
  });

  const totalPool = snapshots.reduce((sum, item) => sum + item.poolSol, 0);
  lines.push("───────────────");
  lines.push("");
  lines.push(`${snapshots.length} markets cooking. total pool: ${totalPool.toFixed(1)} sol`);
  lines.push(selectWarmFooter());
  lines.push("");
  lines.push(options.footer ?? "baozi.bet | 小小一笼，大大缘分");

  return lines.join("\n");
}
