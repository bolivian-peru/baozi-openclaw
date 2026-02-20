/**
 * Tests for configuration and defaults
 */

import { test, assert, assertEqual } from './run.js';
import { DEFAULT_CONFIG, AgentConfig } from '../types/index.js';

await test('DEFAULT_CONFIG has correct defaults', async () => {
  assertEqual(DEFAULT_CONFIG.wallets.length, 0);
  assertEqual(DEFAULT_CONFIG.pollIntervalMinutes, 15);
  assertEqual(DEFAULT_CONFIG.alerts.claimable, true);
  assertEqual(DEFAULT_CONFIG.alerts.closingSoon, true);
  assertEqual(DEFAULT_CONFIG.alerts.closingSoonHours, 6);
  assertEqual(DEFAULT_CONFIG.alerts.oddsShift, true);
  assertEqual(DEFAULT_CONFIG.alerts.oddsShiftThreshold, 15);
  assertEqual(DEFAULT_CONFIG.alerts.newMarkets, false);
  assertEqual(DEFAULT_CONFIG.alerts.interestKeywords.length, 0);
});

await test('config can be extended with overrides', async () => {
  const config: AgentConfig = {
    ...DEFAULT_CONFIG,
    wallets: ['W1'],
    alerts: {
      ...DEFAULT_CONFIG.alerts,
      closingSoonHours: 12,
      oddsShiftThreshold: 10,
    },
  };

  assertEqual(config.wallets.length, 1);
  assertEqual(config.alerts.closingSoonHours, 12);
  assertEqual(config.alerts.oddsShiftThreshold, 10);
  // Defaults preserved
  assertEqual(config.alerts.claimable, true);
  assertEqual(config.pollIntervalMinutes, 15);
});
