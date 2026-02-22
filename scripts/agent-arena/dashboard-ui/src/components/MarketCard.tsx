import type { MarketArenaView } from "../types";

interface MarketCardProps {
  market: MarketArenaView;
}

function pnlClass(pnl: number): string {
  if (pnl > 0) return "pnl-pos";
  if (pnl < 0) return "pnl-neg";
  return "pnl-zero";
}

function pnlStr(pnl: number): string {
  return pnl > 0 ? `+${pnl.toFixed(4)}` : pnl.toFixed(4);
}

function resultBadge(isWinner: boolean | null): React.ReactNode {
  if (isWinner === true) return <span className="badge-win">✓ WIN</span>;
  if (isWinner === false) return <span className="badge-loss">✗ LOSS</span>;
  return <span className="badge-pending">…</span>;
}

export function MarketCard({ market }: MarketCardProps) {
  const statusClass =
    market.status === "Active" ? "status-active" :
    market.status === "Resolved" ? "status-resolved" :
    market.status === "Closed" ? "status-closed" : "status-voided";

  return (
    <div className="market-card">
      <div className="market-header">
        <span className={`status-badge ${statusClass}`}>{market.status}</span>
        <span className="pool">{market.totalPoolSol.toFixed(2)} SOL</span>
      </div>
      <h3 className="market-question">{market.question}</h3>

      {market.type === "boolean" && (
        <div className="odds-bar">
          <span className="yes-pct">YES {(market.yesPercent ?? 50).toFixed(1)}%</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${market.yesPercent ?? 50}%` }} />
          </div>
          <span className="no-pct">{(market.noPercent ?? 50).toFixed(1)}% NO</span>
          {market.winningOutcome && (
            <div className={`winner-badge winner-${market.winningOutcome.toLowerCase()}`}>
              Winner: {market.winningOutcome}
            </div>
          )}
        </div>
      )}

      {market.type === "race" && market.outcomes && (
        <div className="race-outcomes">
          {market.outcomes.map((o, i) => (
            <div key={o.label} className={market.winnerIndex === i ? "race-outcome race-winner" : "race-outcome"}>
              {market.winnerIndex === i ? "★ " : ""}{o.label} — {o.pool.toFixed(2)} SOL ({o.percent.toFixed(1)}%)
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${o.percent}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      <table className="market-agents">
        <thead>
          <tr><th>Agent</th><th>Side</th><th>Bet (SOL)</th><th>P&L</th><th>Result</th></tr>
        </thead>
        <tbody>
          {market.agents.map((a) => (
            <tr key={`${a.wallet}-${a.side}`}>
              <td className="agent-name" title={a.wallet}>{a.name}</td>
              <td className={`side-${a.side.toLowerCase().replace(/[^a-z]/g, "")}`}>{a.side}</td>
              <td className="num">{a.amountSol.toFixed(4)}</td>
              <td className={`num ${pnlClass(a.pnlSol)}`}>{pnlStr(a.pnlSol)}</td>
              <td>{resultBadge(a.isWinner)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="market-footer">
        <a href={`https://solscan.io/account/${market.pda}`} target="_blank" rel="noopener noreferrer">View on Solscan ↗</a>
        {" │ "}Market #{market.marketId}
      </div>
    </div>
  );
}
