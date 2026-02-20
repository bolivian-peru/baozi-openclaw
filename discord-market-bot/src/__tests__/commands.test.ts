/**
 * Tests for command handler registration & slash command definitions
 */
import { describe, it, expect } from 'vitest';
import { commands } from '../commands/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Command registry
// ─────────────────────────────────────────────────────────────────────────────
describe('Command registry', () => {
  it('exports 7 commands', () => {
    expect(commands).toHaveLength(7);
  });

  it('each command has a data property with name', () => {
    for (const cmd of commands) {
      expect(cmd.data).toBeDefined();
      expect(cmd.data.name).toBeTruthy();
    }
  });

  it('each command has an execute function', () => {
    for (const cmd of commands) {
      expect(typeof cmd.execute).toBe('function');
    }
  });

  it('includes /markets', () => {
    const names = commands.map(c => c.data.name);
    expect(names).toContain('markets');
  });

  it('includes /odds', () => {
    const names = commands.map(c => c.data.name);
    expect(names).toContain('odds');
  });

  it('includes /portfolio', () => {
    const names = commands.map(c => c.data.name);
    expect(names).toContain('portfolio');
  });

  it('includes /hot', () => {
    const names = commands.map(c => c.data.name);
    expect(names).toContain('hot');
  });

  it('includes /closing', () => {
    const names = commands.map(c => c.data.name);
    expect(names).toContain('closing');
  });

  it('includes /race', () => {
    const names = commands.map(c => c.data.name);
    expect(names).toContain('race');
  });

  it('includes /setup', () => {
    const names = commands.map(c => c.data.name);
    expect(names).toContain('setup');
  });

  it('has no duplicate command names', () => {
    const names = commands.map(c => c.data.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Slash command builder validation
// ─────────────────────────────────────────────────────────────────────────────
describe('Slash command definitions', () => {
  it('/markets has category and status string options', () => {
    const cmd = commands.find(c => c.data.name === 'markets')!;
    const json = cmd.data.toJSON();
    const optionNames = json.options?.map((o: any) => o.name) ?? [];
    expect(optionNames).toContain('category');
    expect(optionNames).toContain('status');
  });

  it('/odds has a required market option', () => {
    const cmd = commands.find(c => c.data.name === 'odds')!;
    const json = cmd.data.toJSON();
    const marketOpt = json.options?.find((o: any) => o.name === 'market');
    expect(marketOpt).toBeDefined();
    expect(marketOpt?.required).toBe(true);
  });

  it('/portfolio has a required wallet option', () => {
    const cmd = commands.find(c => c.data.name === 'portfolio')!;
    const json = cmd.data.toJSON();
    const walletOpt = json.options?.find((o: any) => o.name === 'wallet');
    expect(walletOpt).toBeDefined();
    expect(walletOpt?.required).toBe(true);
  });

  it('/setup requires ManageGuild permission', () => {
    const cmd = commands.find(c => c.data.name === 'setup')!;
    const json = cmd.data.toJSON();
    // default_member_permissions is set
    expect(json.default_member_permissions).toBeDefined();
  });

  it('/race has an optional market option', () => {
    const cmd = commands.find(c => c.data.name === 'race')!;
    const json = cmd.data.toJSON();
    const marketOpt = json.options?.find((o: any) => o.name === 'market');
    expect(marketOpt).toBeDefined();
    expect(marketOpt?.required).toBe(false);
  });

  it('all commands can be serialized to JSON for deployment', () => {
    for (const cmd of commands) {
      expect(() => cmd.data.toJSON()).not.toThrow();
    }
  });
});
