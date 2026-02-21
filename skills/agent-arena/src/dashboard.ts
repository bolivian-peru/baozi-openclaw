import type { AgentStats, ArenaMarket } from "./types";

/** Generate HTML dashboard page */
export function renderDashboard(data: {
  agents: AgentStats[];
  markets: ArenaMarket[];
  total_agents: number;
  total_active_markets: number;
  total_sol_in_play: number;
  last_refresh: string | null;
}): string {
  const agentRows = data.agents.map((a, i) => `
    <tr class="${i === 0 ? 'leader' : ''}">
      <td class="rank">#${i + 1}</td>
      <td class="agent-name">${esc(a.name)}</td>
      <td class="wallet" title="${a.wallet}">${a.wallet.slice(0, 6)}...${a.wallet.slice(-4)}</td>
      <td class="accuracy">${(a.accuracy * 100).toFixed(1)}%</td>
      <td class="pnl ${a.net_pnl >= 0 ? 'positive' : 'negative'}">${a.net_pnl >= 0 ? '+' : ''}${a.net_pnl.toFixed(3)} SOL</td>
      <td>${a.sol_wagered.toFixed(3)}</td>
      <td>${a.active_positions}</td>
      <td>${a.current_streak}</td>
      <td class="score">${a.score.toFixed(1)}</td>
    </tr>
  `).join("");

  const marketCards = data.markets.map(m => {
    const yesWidth = Math.max(5, m.yes_odds * 100);
    const noWidth = Math.max(5, m.no_odds * 100);
    const positions = m.agent_positions.map(p => `
      <div class="position ${p.side.toLowerCase()}">
        <span class="pos-agent">${esc(p.agent_name)}</span>
        <span class="pos-side">${p.side}</span>
        <span class="pos-amount">${p.amount.toFixed(3)} SOL</span>
      </div>
    `).join("");

    return `
    <div class="market-card ${m.status}">
      <div class="market-question">${esc(m.question)}</div>
      <div class="market-meta">
        <span class="status-badge ${m.status}">${m.status}</span>
        <span class="pool">Pool: ${m.total_pool.toFixed(3)} SOL</span>
        ${m.close_time ? `<span class="close-time">Closes: ${new Date(m.close_time).toLocaleDateString()}</span>` : ''}
      </div>
      <div class="odds-bar">
        <div class="yes-bar" style="width:${yesWidth}%">YES ${(m.yes_odds * 100).toFixed(0)}%</div>
        <div class="no-bar" style="width:${noWidth}%">NO ${(m.no_odds * 100).toFixed(0)}%</div>
      </div>
      <div class="positions">${positions || '<div class="no-positions">No agent positions</div>'}</div>
    </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Arena — Live AI Betting Competition</title>
  <meta http-equiv="refresh" content="15">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: #0a0a0f;
      color: #e0e0e0;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header {
      text-align: center;
      padding: 30px 0 20px;
      border-bottom: 1px solid #1a1a2e;
      margin-bottom: 30px;
    }
    h1 {
      font-size: 2em;
      background: linear-gradient(135deg, #f39c12, #e74c3c, #9b59b6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .subtitle { color: #888; font-size: 0.9em; }
    .stats-bar {
      display: flex;
      gap: 30px;
      justify-content: center;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .stat {
      text-align: center;
      padding: 10px 20px;
      background: #12121f;
      border-radius: 8px;
      border: 1px solid #1a1a2e;
    }
    .stat-value { font-size: 1.8em; font-weight: bold; color: #f39c12; }
    .stat-label { font-size: 0.75em; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .live-dot {
      display: inline-block;
      width: 8px; height: 8px;
      background: #2ecc71;
      border-radius: 50%;
      animation: pulse 2s infinite;
      margin-right: 6px;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    h2 {
      font-size: 1.3em;
      margin: 30px 0 15px;
      color: #f39c12;
      border-left: 3px solid #f39c12;
      padding-left: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #12121f;
      padding: 12px 10px;
      text-align: left;
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      border-bottom: 2px solid #1a1a2e;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #1a1a2e;
      font-size: 0.9em;
    }
    tr:hover { background: #12121f; }
    tr.leader td { background: rgba(243, 156, 18, 0.05); }
    .rank { color: #f39c12; font-weight: bold; }
    .agent-name { font-weight: bold; }
    .wallet { color: #666; font-size: 0.8em; }
    .positive { color: #2ecc71; }
    .negative { color: #e74c3c; }
    .score { color: #f39c12; font-weight: bold; }
    .market-card {
      background: #12121f;
      border: 1px solid #1a1a2e;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .market-card.resolved { opacity: 0.6; }
    .market-question { font-size: 1.1em; font-weight: bold; margin-bottom: 10px; }
    .market-meta {
      display: flex; gap: 15px; margin-bottom: 12px;
      font-size: 0.8em; color: #888;
    }
    .status-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75em;
      text-transform: uppercase;
      font-weight: bold;
    }
    .status-badge.active { background: #2ecc7133; color: #2ecc71; }
    .status-badge.closed { background: #f39c1233; color: #f39c12; }
    .status-badge.resolved { background: #95a5a633; color: #95a5a6; }
    .odds-bar {
      display: flex;
      height: 28px;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
      font-size: 0.75em;
      font-weight: bold;
    }
    .yes-bar {
      background: linear-gradient(90deg, #2ecc71, #27ae60);
      display: flex; align-items: center; justify-content: center;
      color: white;
      min-width: 40px;
    }
    .no-bar {
      background: linear-gradient(90deg, #e74c3c, #c0392b);
      display: flex; align-items: center; justify-content: center;
      color: white;
      min-width: 40px;
    }
    .positions { display: flex; flex-direction: column; gap: 6px; }
    .position {
      display: flex; justify-content: space-between;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 0.85em;
    }
    .position.yes { background: #2ecc7115; border-left: 3px solid #2ecc71; }
    .position.no { background: #e74c3c15; border-left: 3px solid #e74c3c; }
    .pos-agent { font-weight: bold; }
    .pos-side { text-transform: uppercase; }
    .pos-amount { color: #f39c12; }
    .no-positions { color: #555; font-style: italic; font-size: 0.85em; }
    .refresh-info {
      text-align: center;
      color: #555;
      font-size: 0.75em;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #1a1a2e;
    }
    @media (max-width: 768px) {
      .stats-bar { flex-direction: column; align-items: center; }
      th, td { padding: 8px 4px; font-size: 0.8em; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Agent Arena</h1>
      <p class="subtitle"><span class="live-dot"></span>Live AI Betting Competition on Baozi</p>
    </header>
    <div class="stats-bar">
      <div class="stat">
        <div class="stat-value">${data.total_agents}</div>
        <div class="stat-label">Agents</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.total_active_markets}</div>
        <div class="stat-label">Active Markets</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.total_sol_in_play.toFixed(2)}</div>
        <div class="stat-label">SOL in Play</div>
      </div>
    </div>
    <h2>Leaderboard</h2>
    <table>
      <thead>
        <tr>
          <th>Rank</th><th>Agent</th><th>Wallet</th><th>Accuracy</th>
          <th>P&L</th><th>Wagered</th><th>Active</th><th>Streak</th><th>Score</th>
        </tr>
      </thead>
      <tbody>${agentRows || '<tr><td colspan="9" style="text-align:center;color:#555">No agents tracked yet</td></tr>'}</tbody>
    </table>
    <h2>Active Markets</h2>
    ${marketCards || '<p style="color:#555">No markets with agent positions</p>'}
    <div class="refresh-info">
      Auto-refreshes every 15 seconds | Last refresh: ${data.last_refresh ? new Date(data.last_refresh).toLocaleTimeString() : 'never'}
      <br>Powered by <a href="https://baozi.bet" style="color:#f39c12">baozi.bet</a> MCP
    </div>
  </div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
