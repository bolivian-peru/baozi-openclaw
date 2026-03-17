import * as fs from 'fs';
import { NightKitchen, ReportData } from './index';
import { ProverbSelector } from './proverbs';
import { MarketWithOdds } from './baozi-api';

function formatTime(closingTime: string): string {
  const diffMs = new Date(closingTime).getTime() - Date.now();
  if (diffMs <= 0) return 'closed';
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

const mockActive: MarketWithOdds[] = [
  {
    publicKey: 'mock_1', marketId: 101,
    question: 'Will BTC hit $110k by April 1?',
    status: 'Active', layer: 'Lab', outcome: null,
    yesPercent: 62, noPercent: 38, totalPoolSol: 45.2,
    closingTime: new Date(Date.now() + 10 * 86400000).toISOString(),
    isBettingOpen: true, category: 'crypto', creator: 'mock',
    oddsLabel: 'yes: 62% | no: 38%',
    poolLabel: '45.2 SOL', timeLabel: formatTime(new Date(Date.now() + 10 * 86400000).toISOString()),
  },
  {
    publicKey: 'mock_2', marketId: 102,
    question: 'Will ETH flip SOL market cap?',
    status: 'Active', layer: 'Lab', outcome: null,
    yesPercent: 28, noPercent: 72, totalPoolSol: 12.8,
    closingTime: new Date(Date.now() + 3 * 86400000).toISOString(),
    isBettingOpen: true, category: 'crypto', creator: 'mock',
    oddsLabel: 'yes: 28% | no: 72%',
    poolLabel: '12.8 SOL', timeLabel: formatTime(new Date(Date.now() + 3 * 86400000).toISOString()),
  },
  {
    publicKey: 'mock_3', marketId: 103,
    question: 'Will AI agents replace manual trading by 2027?',
    status: 'Active', layer: 'Lab', outcome: null,
    yesPercent: 51, noPercent: 49, totalPoolSol: 8.3,
    closingTime: new Date(Date.now() + 25 * 86400000).toISOString(),
    isBettingOpen: true, category: 'technology', creator: 'mock',
    oddsLabel: 'yes: 51% | no: 49%',
    poolLabel: '8.3 SOL', timeLabel: formatTime(new Date(Date.now() + 25 * 86400000).toISOString()),
  },
];

const mockResolved: MarketWithOdds[] = [
  {
    publicKey: 'mock_r1', marketId: 99,
    question: 'Will SOL stay above $150 on March 15?',
    status: 'Resolved', layer: 'Lab', outcome: 'Yes',
    yesPercent: 73, noPercent: 27, totalPoolSol: 22.1,
    closingTime: new Date(Date.now() - 2 * 86400000).toISOString(),
    isBettingOpen: false, category: 'crypto', creator: 'mock',
    oddsLabel: 'yes: 73% | no: 27%',
    poolLabel: '22.1 SOL', timeLabel: 'closed',
  },
];

function run() {
  const kitchen = new NightKitchen();

  const data1: ReportData = {
    date: new Date().toISOString().split('T')[0],
    activeMarkets: mockActive,
    resolvedMarkets: mockResolved,
    totalPoolSol: mockActive.reduce((s, m) => s + m.totalPoolSol, 0),
    proverbs: new ProverbSelector().selectPair({ highStakes: true, longTerm: true, closeRace: true }),
  };

  const data2: ReportData = {
    ...data1,
    proverbs: new ProverbSelector().selectPair({ highStakes: true, longTerm: false, closeRace: false, community: true }),
  };

  const report1 = kitchen.generateReport(data1);
  const report2 = kitchen.generateReport(data2);

  fs.mkdirSync('./reports', { recursive: true });
  fs.writeFileSync('./reports/sample-1.md', report1);
  fs.writeFileSync('./reports/sample-2.md', report2);

  console.log('=== Report 1 ===\n');
  console.log(report1);
  console.log('\n\n=== Report 2 ===\n');
  console.log(report2);
  console.log('\n\n✅ Reports saved to reports/');
}

run();
