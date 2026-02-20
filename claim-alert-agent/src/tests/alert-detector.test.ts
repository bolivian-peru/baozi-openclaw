/**
 * Tests for AlertDetector
 */

import { test, assert, assertEqual } from './run.js';
import { MockBaoziProvider } from './mock-provider.js';
import { AlertDetector } from '../services/alert-detector.js';
import { StateStore } from '../services/state-store.js';
import { AgentConfig, DEFAULT_CONFIG, Position, Market } from '../types/index.js';

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    ...DEFAULT_CONFIG,
    wallets: ['WALLET1'],
    channels: [],
    ...overrides,
    alerts: { ...DEFAULT_CONFIG.alerts, ...overrides.alerts },
  };
}

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    marketId: 'MARKET1',
    marketQuestion: 'Will BTC hit 120K?',
    outcomeIndex: 0,
    outcomeLabel: 'Yes',
    stake: 1.0,
    currentProbability: 0.55,
    marketStatus: 'active',
    closingTime: new Date(Date.now() + 3600000).toISOString(),
    ...overrides,
  };
}

function makeMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: 'MARKET1',
    question: 'Will BTC hit 120K?',
    status: 'active',
    closingTime: new Date(Date.now() + 86400000).toISOString(),
    outcomes: [
      { index: 0, label: 'Yes', pool: 100, probability: 0.6 },
      { index: 1, label: 'No', pool: 67, probability: 0.4 },
    ],
    totalPool: 167,
    layer: 'official',
    ...overrides,
  };
}

// --- Test: Unclaimed Winnings ---

await test('detects unclaimed winnings', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-1.json');
  const config = makeConfig();
  const detector = new AlertDetector(provider, state, config);

  provider.addClaimable('WALLET1', {
    marketId: 'M1',
    marketQuestion: 'BTC above 100K?',
    amount: 2.5,
    winningOutcome: 'Yes',
  });

  const alerts = await detector.detectAlerts();
  assertEqual(alerts.length, 1);
  assertEqual(alerts[0].type, 'unclaimed_winnings');
  assert(alerts[0].message.includes('2.50 SOL'));
});

await test('no alert when no claimable winnings', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-2.json');
  const config = makeConfig();
  const detector = new AlertDetector(provider, state, config);

  const alerts = await detector.detectAlerts();
  assertEqual(alerts.length, 0);
});

await test('unclaimed winnings alert includes all markets', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-3.json');
  const config = makeConfig();
  const detector = new AlertDetector(provider, state, config);

  provider.addClaimable('WALLET1', { marketId: 'M1', marketQuestion: 'Q1', amount: 1.5, winningOutcome: 'Yes' });
  provider.addClaimable('WALLET1', { marketId: 'M2', marketQuestion: 'Q2', amount: 2.0, winningOutcome: 'No' });

  const alerts = await detector.detectAlerts();
  assertEqual(alerts.length, 1);
  assertEqual(alerts[0].type, 'unclaimed_winnings');
  if (alerts[0].type === 'unclaimed_winnings') {
    assertEqual(alerts[0].totalAmount, 3.5);
    assertEqual(alerts[0].marketCount, 2);
  }
});

// --- Test: Market Resolved ---

await test('detects resolved market — user won', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-4.json');
  const config = makeConfig();
  const detector = new AlertDetector(provider, state, config);

  provider.addPosition('WALLET1', makePosition({
    marketId: 'M1',
    marketStatus: 'resolved',
    outcomeIndex: 0,
    outcomeLabel: 'Yes',
  }));

  provider.addResolution({
    marketId: 'M1',
    marketQuestion: 'Will BTC hit 120K?',
    resolved: true,
    winningOutcomeIndex: 0,
    winningOutcomeLabel: 'Yes',
  });

  const alerts = await detector.detectAlerts();
  const resolved = alerts.filter(a => a.type === 'market_resolved');
  assertEqual(resolved.length, 1);
  if (resolved[0].type === 'market_resolved') {
    assert(resolved[0].won === true);
    assert(resolved[0].message.includes('Claim'));
  }
});

await test('detects resolved market — user lost', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-5.json');
  const config = makeConfig();
  const detector = new AlertDetector(provider, state, config);

  provider.addPosition('WALLET1', makePosition({
    marketId: 'M1',
    marketStatus: 'resolved',
    outcomeIndex: 1,
    outcomeLabel: 'No',
  }));

  provider.addResolution({
    marketId: 'M1',
    marketQuestion: 'Will BTC hit 120K?',
    resolved: true,
    winningOutcomeIndex: 0,
    winningOutcomeLabel: 'Yes',
  });

  const alerts = await detector.detectAlerts();
  const resolved = alerts.filter(a => a.type === 'market_resolved');
  assertEqual(resolved.length, 1);
  if (resolved[0].type === 'market_resolved') {
    assert(resolved[0].won === false);
  }
});

// --- Test: Closing Soon ---

await test('detects market closing soon', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-6.json');
  const config = makeConfig({ alerts: { ...DEFAULT_CONFIG.alerts, closingSoonHours: 6 } });
  const detector = new AlertDetector(provider, state, config);

  // Closing in 3 hours (within 6h threshold)
  provider.addPosition('WALLET1', makePosition({
    closingTime: new Date(Date.now() + 3 * 3600000).toISOString(),
    marketStatus: 'active',
  }));

  const alerts = await detector.detectAlerts();
  const closing = alerts.filter(a => a.type === 'closing_soon');
  assertEqual(closing.length, 1);
  assert(closing[0].message.includes('closes in'));
});

await test('no closing alert when market is far away', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-7.json');
  const config = makeConfig({ alerts: { ...DEFAULT_CONFIG.alerts, closingSoonHours: 6 } });
  const detector = new AlertDetector(provider, state, config);

  // Closing in 24 hours (outside 6h threshold)
  provider.addPosition('WALLET1', makePosition({
    closingTime: new Date(Date.now() + 24 * 3600000).toISOString(),
    marketStatus: 'active',
  }));

  const alerts = await detector.detectAlerts();
  const closing = alerts.filter(a => a.type === 'closing_soon');
  assertEqual(closing.length, 0);
});

await test('no closing alert for resolved market', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-8.json');
  const config = makeConfig();
  const detector = new AlertDetector(provider, state, config);

  provider.addPosition('WALLET1', makePosition({
    closingTime: new Date(Date.now() + 1 * 3600000).toISOString(),
    marketStatus: 'resolved',
  }));

  const alerts = await detector.detectAlerts();
  const closing = alerts.filter(a => a.type === 'closing_soon');
  assertEqual(closing.length, 0);
});

// --- Test: Odds Shift ---

await test('detects significant odds shift', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-9.json');
  const config = makeConfig({ alerts: { ...DEFAULT_CONFIG.alerts, oddsShiftThreshold: 15 } });
  const detector = new AlertDetector(provider, state, config);

  // Set up previous odds
  state.setOddsSnapshot({
    marketId: 'M1',
    probabilities: { 0: 0.45, 1: 0.55 },
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  });

  provider.addPosition('WALLET1', makePosition({
    marketId: 'M1',
    outcomeIndex: 0,
    marketStatus: 'active',
  }));

  // Current odds shifted by 20pp (0.45 → 0.65)
  provider.addMarket(makeMarket({
    id: 'M1',
    outcomes: [
      { index: 0, label: 'Yes', pool: 150, probability: 0.65 },
      { index: 1, label: 'No', pool: 80, probability: 0.35 },
    ],
  }));

  const alerts = await detector.detectAlerts();
  const shifts = alerts.filter(a => a.type === 'odds_shift');
  assertEqual(shifts.length, 1);
  if (shifts[0].type === 'odds_shift') {
    assert(shifts[0].shiftPercentage >= 15);
    assert(shifts[0].message.includes('45%'));
    assert(shifts[0].message.includes('65%'));
  }
});

await test('no odds shift alert when shift is small', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-10.json');
  const config = makeConfig({ alerts: { ...DEFAULT_CONFIG.alerts, oddsShiftThreshold: 15 } });
  const detector = new AlertDetector(provider, state, config);

  state.setOddsSnapshot({
    marketId: 'M1',
    probabilities: { 0: 0.50, 1: 0.50 },
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  });

  provider.addPosition('WALLET1', makePosition({
    marketId: 'M1',
    outcomeIndex: 0,
    marketStatus: 'active',
  }));

  // Small shift: 50% → 55% (5pp < 15pp threshold)
  provider.addMarket(makeMarket({
    id: 'M1',
    outcomes: [
      { index: 0, label: 'Yes', pool: 110, probability: 0.55 },
      { index: 1, label: 'No', pool: 90, probability: 0.45 },
    ],
  }));

  const alerts = await detector.detectAlerts();
  const shifts = alerts.filter(a => a.type === 'odds_shift');
  assertEqual(shifts.length, 0);
});

await test('no odds shift on first poll (no previous snapshot)', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-11.json');
  const config = makeConfig();
  const detector = new AlertDetector(provider, state, config);

  provider.addPosition('WALLET1', makePosition({ marketId: 'M1', marketStatus: 'active' }));
  provider.addMarket(makeMarket({ id: 'M1' }));

  const alerts = await detector.detectAlerts();
  const shifts = alerts.filter(a => a.type === 'odds_shift');
  assertEqual(shifts.length, 0);
});

// --- Test: New Markets ---

await test('detects new market matching interests', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-12.json');
  const config = makeConfig({
    alerts: {
      ...DEFAULT_CONFIG.alerts,
      newMarkets: true,
      interestKeywords: ['BTC', 'bitcoin'],
    },
  });
  const detector = new AlertDetector(provider, state, config);

  provider.activeMarkets = [
    makeMarket({ id: 'M1', question: 'Will BTC hit 150K by 2027?' }),
    makeMarket({ id: 'M2', question: 'Will ETH flip BTC?' }),
  ];

  const alerts = await detector.detectAlerts();
  const newMarket = alerts.filter(a => a.type === 'new_market');
  assertEqual(newMarket.length, 2); // Both match "BTC"
});

await test('no new market alert when keywords dont match', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-13.json');
  const config = makeConfig({
    alerts: {
      ...DEFAULT_CONFIG.alerts,
      newMarkets: true,
      interestKeywords: ['DOGE'],
    },
  });
  const detector = new AlertDetector(provider, state, config);

  provider.activeMarkets = [
    makeMarket({ id: 'M1', question: 'Will BTC hit 150K?' }),
  ];

  const alerts = await detector.detectAlerts();
  const newMarket = alerts.filter(a => a.type === 'new_market');
  assertEqual(newMarket.length, 0);
});

await test('known markets are not re-alerted as new', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-14.json');
  const config = makeConfig({
    alerts: {
      ...DEFAULT_CONFIG.alerts,
      newMarkets: true,
      interestKeywords: ['BTC'],
    },
  });
  const detector = new AlertDetector(provider, state, config);

  // Mark M1 as already known
  state.setKnownMarketIds(['M1']);

  provider.activeMarkets = [
    makeMarket({ id: 'M1', question: 'Will BTC hit 150K?' }),
  ];

  const alerts = await detector.detectAlerts();
  const newMarket = alerts.filter(a => a.type === 'new_market');
  assertEqual(newMarket.length, 0);
});

// --- Test: Deduplication ---

await test('deduplicates alerts that were already sent', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-15.json');
  const config = makeConfig();
  const detector = new AlertDetector(provider, state, config);

  provider.addClaimable('WALLET1', {
    marketId: 'M1',
    marketQuestion: 'Q1',
    amount: 1.5,
    winningOutcome: 'Yes',
  });

  // First detection
  const alerts1 = await detector.detectAlerts();
  assertEqual(alerts1.length, 1);

  // Second detection — should be deduplicated
  const alerts2 = await detector.detectAlerts();
  assertEqual(alerts2.length, 0);
});

// --- Test: Multiple Wallets ---

await test('monitors multiple wallets', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-16.json');
  const config = makeConfig({ wallets: ['WALLET1', 'WALLET2'] });
  const detector = new AlertDetector(provider, state, config);

  provider.addClaimable('WALLET1', { marketId: 'M1', marketQuestion: 'Q1', amount: 1.0, winningOutcome: 'Yes' });
  provider.addClaimable('WALLET2', { marketId: 'M2', marketQuestion: 'Q2', amount: 2.0, winningOutcome: 'No' });

  const alerts = await detector.detectAlerts();
  assertEqual(alerts.length, 2);
});

// --- Test: Alert Key Generation ---

await test('generates correct alert keys', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-17.json');
  const config = makeConfig();
  const detector = new AlertDetector(provider, state, config);

  const key = detector.alertKey({
    type: 'market_resolved',
    wallet: 'W1',
    timestamp: '2024-01-01',
    marketId: 'M1',
    marketQuestion: 'Q1',
    userOutcome: 'Yes',
    winningOutcome: 'Yes',
    won: true,
    message: 'test',
  });

  assertEqual(key, 'resolved:M1:W1');
});

// --- Test: Disabled Alert Types ---

await test('skips disabled alert types', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-18.json');
  const config = makeConfig({
    alerts: {
      ...DEFAULT_CONFIG.alerts,
      claimable: false,
      closingSoon: false,
      oddsShift: false,
    },
  });
  const detector = new AlertDetector(provider, state, config);

  provider.addClaimable('WALLET1', { marketId: 'M1', marketQuestion: 'Q1', amount: 5.0, winningOutcome: 'Yes' });
  provider.addPosition('WALLET1', makePosition({
    closingTime: new Date(Date.now() + 1 * 3600000).toISOString(),
    marketStatus: 'active',
  }));

  const alerts = await detector.detectAlerts();
  assertEqual(alerts.length, 0);
});

// --- Test: Closing soon hours configuration ---

await test('respects custom closing soon hours', async () => {
  const provider = new MockBaoziProvider();
  const state = new StateStore('/tmp/test-state-19.json');
  // Set threshold to 2 hours
  const config = makeConfig({ alerts: { ...DEFAULT_CONFIG.alerts, closingSoonHours: 2 } });
  const detector = new AlertDetector(provider, state, config);

  // Closing in 3 hours — outside 2h threshold
  provider.addPosition('WALLET1', makePosition({
    closingTime: new Date(Date.now() + 3 * 3600000).toISOString(),
    marketStatus: 'active',
  }));

  const alerts = await detector.detectAlerts();
  const closing = alerts.filter(a => a.type === 'closing_soon');
  assertEqual(closing.length, 0);
});
