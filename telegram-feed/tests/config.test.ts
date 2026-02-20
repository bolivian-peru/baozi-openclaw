/**
 * Tests for configuration module.
 * Ensures the correct program ID is used everywhere.
 */
import { jest } from '@jest/globals';

// We need to test the actual config values, so no mocking here
// Just verify the defaults match the correct program ID

describe('config', () => {
  const CORRECT_PROGRAM_ID = 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ';

  it('has the correct default program ID', async () => {
    // Clear any env override
    const savedEnv = process.env.BAOZI_PROGRAM_ID;
    delete process.env.BAOZI_PROGRAM_ID;

    // Re-import to get fresh module
    jest.resetModules();
    const { config } = await import('../src/config');

    expect(config.baoziProgramId).toBe(CORRECT_PROGRAM_ID);

    // Restore
    if (savedEnv) process.env.BAOZI_PROGRAM_ID = savedEnv;
  });

  it('does NOT contain the old wrong program ID', async () => {
    const WRONG_ID = 'BAoZirE2cAXqyjRap2GiGdAFkSB2nQJrPMBb6KMFj2gn';
    jest.resetModules();
    const { config } = await import('../src/config');
    expect(config.baoziProgramId).not.toBe(WRONG_ID);
  });

  it('has a valid Solana RPC URL', async () => {
    jest.resetModules();
    const { config } = await import('../src/config');
    expect(config.solanaRpcUrl).toMatch(/^https?:\/\//);
  });

  it('has a valid baozi base URL', async () => {
    jest.resetModules();
    const { config } = await import('../src/config');
    expect(config.baoziBaseUrl).toBe('https://baozi.bet');
  });

  it('validates missing bot token', async () => {
    jest.resetModules();
    const { validateConfig, config } = await import('../src/config');
    // config.telegramToken should be empty by default
    if (!config.telegramToken) {
      expect(() => validateConfig()).toThrow('TELEGRAM_BOT_TOKEN is required');
    }
  });

  it('matches MCP server program ID', async () => {
    const { PROGRAM_ID } = await import('@baozi.bet/mcp-server/dist/config.js');
    jest.resetModules();
    const { config } = await import('../src/config');
    expect(config.baoziProgramId).toBe(PROGRAM_ID.toBase58());
  });
});
