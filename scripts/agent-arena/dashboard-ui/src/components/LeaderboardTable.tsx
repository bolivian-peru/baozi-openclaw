import type { AgentStats } from "../types";

interface LeaderboardTableProps {
  agents: AgentStats[];
}

function pnlClass(pnl: number): string {
  if (pnl > 0) return "pnl-pos";
  if (pnl < 0) return "pnl-neg";
  return "pnl-zero";
}

function pnlStr(pnl: number): string {
  return pnl > 0 ? `+${pnl.toFixed(4)}` : pnl.toFixed(4);
}

function streakEl(streak: number): React.ReactNode {
  if (streak > 0) return <span className="streak-win">{streak}W</span>;
  if (streak < 0) return <span className="streak-loss">{Math.abs(streak)}L</span>;
  return <span className="streak-none">—</span>;
}

export function LeaderboardTable({ agents }: LeaderboardTableProps) {
  return (
    <table className="leaderboard">
      <thead>
        <tr>
          <th>#</th>
          <th>Agent</th>
          <th>Wagered (SOL)</th>
          <th>P&L (SOL)</th>
          <th>Accuracy</th>
          <th>W/L</th>
          <th>Streak</th>
          <th>Open</th>
        </tr>
      </thead>
      <tbody>
        {agents.map((a, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
          return (
            <tr key={a.wallet}>
              <td className="rank">{medal}</td>
              <td className="agent-name" title={a.wallet}>{a.name}</td>
              <td className="num">{a.totalWagered.toFixed(2)}</td>
              <td className={`num ${pnlClass(a.pnl)}`}>{pnlStr(a.pnl)}</td>
              <td className="num">{a.accuracy.toFixed(0)}%</td>
              <td className="num">{a.wins}/{a.losses}</td>
              <td>{streakEl(a.streak)}</td>
              <td className="num">{a.openPositions}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
