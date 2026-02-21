import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { TrackingStore } from '../src/tracking/store.js';
import { formatDashboard } from '../src/tracking/dashboard.js';
import type { RecruitedAgent } from '../src/types.js';

describe('Tracking', () => {
  let tmpDir: string;
  let store: TrackingStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baozi-test-'));
    store = new TrackingStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeAgent(overrides: Partial<RecruitedAgent> = {}): RecruitedAgent {
    return {
      id: `test-${Date.now()}-${Math.random()}`,
      name: 'TestAgent',
      description: 'A test agent',
      type: 'trading-bot',
      source: 'manual',
      discoveredAt: new Date().toISOString(),
      metadata: {},
      status: 'discovered',
      totalBets: 0,
      totalVolume: 0,
      estimatedEarnings: 0,
      notes: [],
      ...overrides,
    };
  }

  describe('TrackingStore', () => {
    it('starts empty', () => {
      expect(store.count).toBe(0);
      expect(store.getAll()).toEqual([]);
    });

    it('upserts and retrieves agents', () => {
      const agent = makeAgent({ id: 'agent-1', name: 'Alpha' });
      store.upsert(agent);

      expect(store.count).toBe(1);
      expect(store.get('agent-1')?.name).toBe('Alpha');
    });

    it('checks if an agent is known', () => {
      const agent = makeAgent({ id: 'agent-2' });
      store.upsert(agent);

      expect(store.isKnown('agent-2')).toBe(true);
      expect(store.isKnown('agent-3')).toBe(false);
    });

    it('updates agent status', () => {
      const agent = makeAgent({ id: 'agent-4' });
      store.upsert(agent);

      store.updateStatus('agent-4', 'active', 'Activated!');
      const updated = store.get('agent-4');

      expect(updated?.status).toBe('active');
      expect(updated?.notes).toContain('Activated!');
    });

    it('records bets', () => {
      const agent = makeAgent({ id: 'agent-5' });
      store.upsert(agent);

      store.recordBet('agent-5', 2.5, 'tx123');
      store.recordBet('agent-5', 1.0);

      const updated = store.get('agent-5');
      expect(updated?.totalBets).toBe(2);
      expect(updated?.totalVolume).toBeCloseTo(3.5);
      expect(updated?.estimatedEarnings).toBeCloseTo(0.035); // 1% of 3.5
    });

    it('persists to disk and reloads', () => {
      const agent = makeAgent({ id: 'persist-1', name: 'Persistent' });
      store.upsert(agent);
      store.recordBet('persist-1', 5.0);

      // Create new store from same directory
      const store2 = new TrackingStore(tmpDir);
      expect(store2.count).toBe(1);
      expect(store2.get('persist-1')?.name).toBe('Persistent');
      expect(store2.get('persist-1')?.totalVolume).toBeCloseTo(5.0);
    });

    it('filters by status', () => {
      store.upsert(makeAgent({ id: 'a1', status: 'active' }));
      store.upsert(makeAgent({ id: 'a2', status: 'active' }));
      store.upsert(makeAgent({ id: 'a3', status: 'discovered' }));

      expect(store.getByStatus('active').length).toBe(2);
      expect(store.getByStatus('discovered').length).toBe(1);
    });

    it('computes stats correctly', () => {
      store.upsert(makeAgent({ id: 's1', status: 'active', source: 'github', totalVolume: 10, estimatedEarnings: 0.1 }));
      store.upsert(makeAgent({ id: 's2', status: 'active', source: 'agentbook', totalVolume: 5, estimatedEarnings: 0.05 }));
      store.upsert(makeAgent({ id: 's3', status: 'discovered', source: 'github', totalVolume: 0, estimatedEarnings: 0 }));

      const stats = store.getStats();
      expect(stats.totalDiscovered).toBe(3);
      expect(stats.totalActive).toBe(2);
      expect(stats.combinedVolume).toBeCloseTo(15);
      expect(stats.estimatedEarnings).toBeCloseTo(0.15);
      expect(stats.bySource.github).toBe(2);
      expect(stats.bySource.agentbook).toBe(1);
    });
  });

  describe('Dashboard', () => {
    it('renders without errors', () => {
      const stats = store.getStats();
      const dashboard = formatDashboard(stats);

      expect(dashboard).toContain('BAOZI AGENT RECRUITER DASHBOARD');
      expect(dashboard).toContain('OVERVIEW');
      expect(dashboard).toContain('一笼包子');
    });

    it('shows data when agents exist', () => {
      store.upsert(makeAgent({ id: 'd1', status: 'active', totalVolume: 10, estimatedEarnings: 0.1, source: 'github' }));

      const stats = store.getStats();
      const dashboard = formatDashboard(stats);

      expect(dashboard).toContain('EARNINGS');
      expect(dashboard).toContain('github');
    });
  });
});
