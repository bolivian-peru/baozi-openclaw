import { existsSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { GroupStore } from '../src/services/group-store';

// Mock config
jest.mock('../src/config', () => ({
  config: {
    defaultRoundupCron: '0 9 * * *',
    defaultTimezone: 'UTC',
    dataDir: './test-data',
  },
}));

const TEST_DIR = './test-data';
const TEST_FILE = join(TEST_DIR, 'groups.json');

describe('GroupStore', () => {
  afterEach(() => {
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('creates default config for new chat', () => {
    const store = new GroupStore(TEST_DIR);
    const cfg = store.get(12345);

    expect(cfg.chatId).toBe(12345);
    expect(cfg.roundupEnabled).toBe(false);
    expect(cfg.roundupCron).toBe('0 9 * * *');
    expect(cfg.timezone).toBe('UTC');
    expect(cfg.categories).toEqual([]);
  });

  it('updates and persists config', () => {
    const store = new GroupStore(TEST_DIR);
    store.set(12345, { roundupEnabled: true, categories: ['crypto'] });

    // Create new store instance to test persistence
    const store2 = new GroupStore(TEST_DIR);
    const cfg = store2.get(12345);

    expect(cfg.roundupEnabled).toBe(true);
    expect(cfg.categories).toEqual(['crypto']);
  });

  it('returns roundup chats', () => {
    const store = new GroupStore(TEST_DIR);
    store.set(111, { roundupEnabled: true });
    store.set(222, { roundupEnabled: false });
    store.set(333, { roundupEnabled: true });

    const roundupChats = store.getRoundupChats();
    expect(roundupChats).toHaveLength(2);
    expect(roundupChats.map(c => c.chatId).sort()).toEqual([111, 333]);
  });

  it('removes config', () => {
    const store = new GroupStore(TEST_DIR);
    store.set(12345, { roundupEnabled: true });
    store.remove(12345);

    const all = store.getAll();
    expect(all).toHaveLength(0);
  });

  it('handles missing data directory', () => {
    // Should create directory automatically
    const store = new GroupStore(join(TEST_DIR, 'nested', 'dir'));
    const cfg = store.get(12345);
    expect(cfg.chatId).toBe(12345);
  });
});
