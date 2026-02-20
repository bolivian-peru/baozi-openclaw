/**
 * Tests for StateStore
 */

import { test, assert, assertEqual } from './run.js';
import { StateStore } from '../services/state-store.js';

// --- Test: Basic state operations ---

await test('stores and retrieves odds snapshots', async () => {
  const store = new StateStore('/tmp/test-ss-1.json');

  store.setOddsSnapshot({
    marketId: 'M1',
    probabilities: { 0: 0.6, 1: 0.4 },
    timestamp: '2024-01-01T00:00:00Z',
  });

  const snapshot = store.getOddsSnapshot('M1');
  assert(snapshot !== undefined);
  assertEqual(snapshot!.probabilities[0], 0.6);
  assertEqual(snapshot!.probabilities[1], 0.4);
});

await test('returns undefined for unknown market snapshot', async () => {
  const store = new StateStore('/tmp/test-ss-2.json');
  const snapshot = store.getOddsSnapshot('UNKNOWN');
  assertEqual(snapshot, undefined);
});

await test('tracks sent alerts', async () => {
  const store = new StateStore('/tmp/test-ss-3.json');

  assert(!store.wasAlertSent('test-key'));
  store.markAlertSent('test-key');
  assert(store.wasAlertSent('test-key'));
});

await test('tracks known market IDs', async () => {
  const store = new StateStore('/tmp/test-ss-4.json');

  assertEqual(store.getKnownMarketIds().length, 0);
  store.setKnownMarketIds(['M1', 'M2', 'M3']);
  assertEqual(store.getKnownMarketIds().length, 3);
});

await test('prunes old alerts', async () => {
  const store = new StateStore('/tmp/test-ss-5.json');

  // Add an alert from 10 days ago
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 10);

  store.setData({
    oddsSnapshots: {},
    sentAlerts: {
      'old-alert': { key: 'old-alert', timestamp: oldDate.toISOString() },
      'new-alert': { key: 'new-alert', timestamp: new Date().toISOString() },
    },
    knownMarketIds: [],
  });

  const pruned = store.pruneOldAlerts(7);
  assertEqual(pruned, 1);
  assert(!store.wasAlertSent('old-alert'));
  assert(store.wasAlertSent('new-alert'));
});

await test('saves and loads state from file', async () => {
  const path = '/tmp/test-ss-persist.json';
  const store1 = new StateStore(path);

  store1.setOddsSnapshot({
    marketId: 'M1',
    probabilities: { 0: 0.7 },
    timestamp: '2024-01-01',
  });
  store1.markAlertSent('key1');
  store1.setLastPollTime('2024-01-01T12:00:00Z');
  await store1.save();

  // Load in a new instance
  const store2 = new StateStore(path);
  await store2.load();

  const snapshot = store2.getOddsSnapshot('M1');
  assert(snapshot !== undefined);
  assertEqual(snapshot!.probabilities[0], 0.7);
  assert(store2.wasAlertSent('key1'));
  assertEqual(store2.getLastPollTime(), '2024-01-01T12:00:00Z');
});

await test('handles missing state file gracefully', async () => {
  const store = new StateStore('/tmp/nonexistent-state-file-xyz.json');
  await store.load(); // Should not throw
  assertEqual(store.getKnownMarketIds().length, 0);
});
