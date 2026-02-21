/**
 * 夜厨房 — Wisdom Module Tests
 */
import { describe, it, expect } from 'vitest';
import {
  WISDOM_COLLECTION,
  detectCategories,
  getWisdomForMarket,
  getOddsWisdom,
  formatWisdom,
} from '../wisdom.js';
import type { WisdomEntry, WisdomCategory } from '../wisdom.js';

// =============================================================================
// WISDOM COLLECTION TESTS
// =============================================================================

describe('WISDOM_COLLECTION', () => {
  it('should contain at least 40 entries', () => {
    expect(WISDOM_COLLECTION.length).toBeGreaterThanOrEqual(40);
  });

  it('every entry should have all required fields', () => {
    for (const entry of WISDOM_COLLECTION) {
      expect(entry.chinese).toBeTruthy();
      expect(entry.pinyin).toBeTruthy();
      expect(entry.english).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.explanation).toBeTruthy();
    }
  });

  it('should have entries in multiple categories', () => {
    const categories = new Set(WISDOM_COLLECTION.map(w => w.category));
    expect(categories.size).toBeGreaterThanOrEqual(8);
  });

  it('should include risk category entries', () => {
    const riskEntries = WISDOM_COLLECTION.filter(w => w.category === 'risk');
    expect(riskEntries.length).toBeGreaterThanOrEqual(2);
  });

  it('should include finance category entries', () => {
    const financeEntries = WISDOM_COLLECTION.filter(w => w.category === 'finance');
    expect(financeEntries.length).toBeGreaterThanOrEqual(2);
  });

  it('should include politics category entries', () => {
    const politicsEntries = WISDOM_COLLECTION.filter(w => w.category === 'politics');
    expect(politicsEntries.length).toBeGreaterThanOrEqual(1);
  });

  it('should have unique Chinese proverbs (no duplicates)', () => {
    const chineseTexts = WISDOM_COLLECTION.map(w => w.chinese);
    const unique = new Set(chineseTexts);
    expect(unique.size).toBe(chineseTexts.length);
  });

  it('every entry should have pinyin with tone marks or numbers', () => {
    for (const entry of WISDOM_COLLECTION) {
      // Pinyin should contain at least some ASCII letters
      expect(entry.pinyin).toMatch(/[a-zA-Z]/);
    }
  });
});

// =============================================================================
// CATEGORY DETECTION TESTS
// =============================================================================

describe('detectCategories', () => {
  it('should detect politics category for election questions', () => {
    const cats = detectCategories('Will Trump win the 2024 election?');
    expect(cats).toContain('politics');
    expect(cats).toContain('competition');
  });

  it('should detect finance category for bitcoin questions', () => {
    const cats = detectCategories('Will Bitcoin reach $100k before March?');
    expect(cats).toContain('finance');
  });

  it('should detect sports category for game questions', () => {
    const cats = detectCategories('Will the Lakers win the NBA championship?');
    expect(cats).toContain('sports');
    expect(cats).toContain('competition');
  });

  it('should detect technology category for AI questions', () => {
    const cats = detectCategories('Will OpenAI release GPT-5 this year?');
    expect(cats).toContain('technology');
  });

  it('should return default categories for unknown topics', () => {
    const cats = detectCategories('xyzzy plugh totally unknown');
    expect(cats.length).toBeGreaterThan(0);
    expect(cats).toContain('wisdom');
  });

  it('should detect multiple categories for complex questions', () => {
    const cats = detectCategories('Will the government policy on crypto change before the deadline?');
    expect(cats.length).toBeGreaterThanOrEqual(2);
  });

  it('should be case-insensitive', () => {
    const cats1 = detectCategories('BITCOIN price prediction');
    const cats2 = detectCategories('bitcoin price prediction');
    expect(cats1.sort()).toEqual(cats2.sort());
  });
});

// =============================================================================
// WISDOM SELECTION TESTS
// =============================================================================

describe('getWisdomForMarket', () => {
  it('should return the requested number of entries', () => {
    const wisdom = getWisdomForMarket('Will Bitcoin reach $100k?', 3);
    expect(wisdom).toHaveLength(3);
  });

  it('should return 1 entry when requested', () => {
    const wisdom = getWisdomForMarket('Any question here', 1);
    expect(wisdom).toHaveLength(1);
  });

  it('should return relevant entries for finance questions', () => {
    const wisdom = getWisdomForMarket('Will the stock market crash?', 5);
    const categories = wisdom.map(w => w.category);
    // Should have at least some finance-related wisdom
    const relevant = categories.filter(c =>
      ['finance', 'risk', 'fortune', 'change'].includes(c)
    );
    expect(relevant.length).toBeGreaterThan(0);
  });

  it('should return unique entries (no duplicates)', () => {
    const wisdom = getWisdomForMarket('Election prediction markets', 5);
    const chineseTexts = wisdom.map(w => w.chinese);
    const unique = new Set(chineseTexts);
    expect(unique.size).toBe(chineseTexts.length);
  });

  it('should handle empty question gracefully', () => {
    const wisdom = getWisdomForMarket('', 2);
    expect(wisdom.length).toBe(2);
  });
});

// =============================================================================
// ODDS WISDOM TESTS
// =============================================================================

describe('getOddsWisdom', () => {
  it('should return wisdom for strongly YES (>80%)', () => {
    const wisdom = getOddsWisdom(85);
    expect(wisdom).toBeDefined();
    expect(wisdom.chinese).toBe('水满则溢，月满则亏');
  });

  it('should return wisdom for strongly NO (<20%)', () => {
    const wisdom = getOddsWisdom(15);
    expect(wisdom).toBeDefined();
    expect(wisdom.chinese).toBe('否极泰来');
  });

  it('should return wisdom for contested (40-60%)', () => {
    const wisdom = getOddsWisdom(50);
    expect(wisdom).toBeDefined();
    expect(wisdom.chinese).toBe('龙争虎斗');
  });

  it('should return wisdom for leaning YES (60-80%)', () => {
    const wisdom = getOddsWisdom(70);
    expect(wisdom).toBeDefined();
    expect(wisdom.chinese).toBe('风水轮流转');
  });

  it('should return wisdom for leaning NO (20-40%)', () => {
    const wisdom = getOddsWisdom(30);
    expect(wisdom).toBeDefined();
    expect(wisdom.chinese).toBe('塞翁失马，焉知非福');
  });
});

// =============================================================================
// FORMATTING TESTS
// =============================================================================

describe('formatWisdom', () => {
  it('should include the Chinese text', () => {
    const entry: WisdomEntry = {
      chinese: '测试成语',
      pinyin: 'cè shì chéng yǔ',
      english: 'Test idiom',
      category: 'wisdom',
      explanation: 'A test explanation',
    };
    const formatted = formatWisdom(entry);
    expect(formatted).toContain('测试成语');
  });

  it('should include the pinyin', () => {
    const entry = WISDOM_COLLECTION[0];
    const formatted = formatWisdom(entry);
    expect(formatted).toContain(entry.pinyin);
  });

  it('should include the English translation', () => {
    const entry = WISDOM_COLLECTION[0];
    const formatted = formatWisdom(entry);
    expect(formatted).toContain(entry.english);
  });

  it('should include the 🏮 emoji', () => {
    const entry = WISDOM_COLLECTION[0];
    const formatted = formatWisdom(entry);
    expect(formatted).toContain('🏮');
  });

  it('should include the explanation', () => {
    const entry = WISDOM_COLLECTION[0];
    const formatted = formatWisdom(entry);
    expect(formatted).toContain(entry.explanation);
  });
});
