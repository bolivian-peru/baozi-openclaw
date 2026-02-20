/**
 * Tests for config utilities
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, DEFAULT_OPTIONS, buildMarketUrl, mergeConfig, mergeOptions } from '../utils/config.js';

describe('DEFAULT_CONFIG', () => {
  it('has correct base URL', () => {
    expect(DEFAULT_CONFIG.baseUrl).toBe('https://baozi.bet');
  });

  it('has all required color keys', () => {
    expect(DEFAULT_CONFIG.colors).toHaveProperty('yes');
    expect(DEFAULT_CONFIG.colors).toHaveProperty('no');
    expect(DEFAULT_CONFIG.colors).toHaveProperty('background');
    expect(DEFAULT_CONFIG.colors).toHaveProperty('text');
    expect(DEFAULT_CONFIG.colors).toHaveProperty('accent');
  });

  it('has footer text', () => {
    expect(DEFAULT_CONFIG.footerText).toContain('Baozi');
  });
});

describe('DEFAULT_OPTIONS', () => {
  it('has correct defaults', () => {
    expect(DEFAULT_OPTIONS.style).toBe('default');
    expect(DEFAULT_OPTIONS.platform).toBe('generic');
    expect(DEFAULT_OPTIONS.showCountdown).toBe(true);
    expect(DEFAULT_OPTIONS.showVolume).toBe(true);
    expect(DEFAULT_OPTIONS.showOddsBar).toBe(true);
  });
});

describe('buildMarketUrl', () => {
  const testKey = 'ABC123pubkey';

  it('builds URL without affiliate code', () => {
    const url = buildMarketUrl(testKey);
    expect(url).toBe('https://baozi.bet/market/ABC123pubkey');
  });

  it('builds URL with affiliate code parameter', () => {
    const url = buildMarketUrl(testKey, DEFAULT_CONFIG, 'myref');
    expect(url).toBe('https://baozi.bet/market/ABC123pubkey?ref=myref');
  });

  it('uses affiliate code from config', () => {
    const config = { ...DEFAULT_CONFIG, affiliateCode: 'configref' };
    const url = buildMarketUrl(testKey, config);
    expect(url).toBe('https://baozi.bet/market/ABC123pubkey?ref=configref');
  });

  it('prefers parameter affiliate over config', () => {
    const config = { ...DEFAULT_CONFIG, affiliateCode: 'configref' };
    const url = buildMarketUrl(testKey, config, 'paramref');
    expect(url).toBe('https://baozi.bet/market/ABC123pubkey?ref=paramref');
  });
});

describe('mergeConfig', () => {
  it('returns defaults when no override', () => {
    const result = mergeConfig();
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it('merges partial config', () => {
    const result = mergeConfig({ baseUrl: 'https://custom.bet' });
    expect(result.baseUrl).toBe('https://custom.bet');
    expect(result.colors).toEqual(DEFAULT_CONFIG.colors);
  });

  it('merges partial colors', () => {
    const result = mergeConfig({ colors: { yes: '#00ff00' } as any });
    expect(result.colors.yes).toBe('#00ff00');
    expect(result.colors.no).toBe(DEFAULT_CONFIG.colors.no);
  });
});

describe('mergeOptions', () => {
  it('returns defaults when no override', () => {
    const result = mergeOptions();
    expect(result).toEqual(DEFAULT_OPTIONS);
  });

  it('merges partial options', () => {
    const result = mergeOptions({ style: 'compact', platform: 'twitter' });
    expect(result.style).toBe('compact');
    expect(result.platform).toBe('twitter');
    expect(result.showCountdown).toBe(true);
  });
});
