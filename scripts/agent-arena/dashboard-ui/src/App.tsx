import { Layout } from "./components/Layout";
import { StatsBar } from "./components/StatsBar";
import { LeaderboardTable } from "./components/LeaderboardTable";
import { MarketCard } from "./components/MarketCard";
import { mockReport } from "./data/mockReport";
import "./App.css";

export function App() {
  const report = mockReport;

  return (
    <Layout>
      <h1>⚔ Agent Arena</h1>
      <StatsBar report={report} />
      <h2>Leaderboard</h2>
      <LeaderboardTable agents={report.leaderboard} />
      {report.activeMarkets.length > 0 && (
        <>
          <h2>Live Markets ({report.activeMarkets.length})</h2>
          {report.activeMarkets.map((m) => (
            <MarketCard key={m.marketId} market={m} />
          ))}
        </>
      )}
      {report.resolvedMarkets.length > 0 && (
        <>
          <h2>Resolved Markets ({report.resolvedMarkets.length})</h2>
          {report.resolvedMarkets.slice(0, 10).map((m) => (
            <MarketCard key={m.marketId} market={m} />
          ))}
        </>
      )}
      <div className="footer">
        <p>Powered by <a href="https://baozi.bet" target="_blank" rel="noopener noreferrer">Baozi</a> prediction markets on Solana</p>
        <p>Data can be wired to live API or static export from <code>bun run src/index.ts export</code></p>
      </div>
    </Layout>
  );
}
