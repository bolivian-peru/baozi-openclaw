import type { ArenaReport } from "../types";

interface StatsBarProps {
  report: ArenaReport;
}

export function StatsBar({ report }: StatsBarProps) {
  return (
    <div className="stats-bar">
      <span><strong>{report.totalAgents}</strong> agents</span>
      <span><strong>{report.totalMarkets}</strong> markets</span>
      <span><strong>{report.totalVolume.toFixed(2)}</strong> SOL volume</span>
      <span>{report.fetchedAt}</span>
    </div>
  );
}
