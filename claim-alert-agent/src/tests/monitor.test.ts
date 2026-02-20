/**
 * Tests for Monitor
 */

import { test, assert, assertEqual } from './run.js';
import { MockBaoziProvider } from './mock-provider.js';
import { Monitor } from '../services/monitor.js';
import { AgentConfig, DEFAULT_CONFIG } from '../types/index.js';

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    ...DEFAULT_CONFIG,
    wallets: ['WALLET1'],
    channels: [{ type: 'webhook', url: 'https://test.example.com/hook' }],
    ...overrides,
    alerts: { ...DEFAULT_CONFIG.alerts, ...overrides.alerts },
  };
}

await test('monitor poll returns result', async () => {
  const provider = new MockBaoziProvider();
  const config = makeConfig();
  const logs: string[] = [];

  const monitor = new Monitor(config, provider, {
    once: true,
    dryRun: true,
    statePath: `/tmp/test-mon-${Date.now()}-1.json`,
    log: (msg) => logs.push(msg),
  });

  const result = await monitor.poll();
  assert(result.timestamp !== undefined);
  assertEqual(result.alertsDetected, 0);
});

await test('monitor detects alerts in poll', async () => {
  const provider = new MockBaoziProvider();
  const config = makeConfig();
  const logs: string[] = [];

  provider.addClaimable('WALLET1', {
    marketId: 'M1',
    marketQuestion: 'Test',
    amount: 3.0,
    winningOutcome: 'Yes',
  });

  // Verify data is in provider
  const claimCheck = await provider.getClaimable('WALLET1');
  assert(claimCheck.length === 1, `Expected 1 claimable, got ${claimCheck.length}`);

  const statePath = `/tmp/test-mon-${Date.now()}.json`;
  const monitor = new Monitor(config, provider, {
    once: true,
    dryRun: true,
    statePath,
    log: (msg) => logs.push(msg),
  });

  const result = await monitor.poll();
  assertEqual(result.alertsDetected, 1);
  assert(logs.some(l => l.includes('unclaimed_winnings')));
});

await test('monitor exposes detector and state', async () => {
  const provider = new MockBaoziProvider();
  const config = makeConfig();

  const monitor = new Monitor(config, provider, {
    statePath: `/tmp/test-mon-${Date.now()}-3.json`,
    log: () => {},
  });

  assert(monitor.getDetector() !== null);
  assert(monitor.getState() !== null);
  assert(monitor.getNotifiers().length === 1);
});
