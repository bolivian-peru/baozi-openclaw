/**
 * Tests for the market question generator
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  generateMarketProposal,
  classifyMarketType,
  calculateCloseTime,
  validateQuestion,
} from "../src/generator.js";
import type { TrendingTopic } from "../src/types/index.js";

function makeTopic(overrides: Partial<TrendingTopic> = {}): TrendingTopic {
  return {
    id: "test:1",
    title: "Bitcoin hits new all-time high",
    description: "Bitcoin reaches $100K for the first time",
    source: "coingecko",
    category: "crypto",
    trendScore: 90,
    detectedAt: new Date(),
    keywords: ["bitcoin", "crypto", "price", "record"],
    ...overrides,
  };
}

describe("classifyMarketType", () => {
  it("classifies event-based topics as Type A", () => {
    const topic = makeTopic({ title: "Apple announces new AI product at WWDC" });
    assert.equal(classifyMarketType(topic), "A");
  });

  it("classifies launch/announcement as Type A", () => {
    const topic = makeTopic({ title: "SpaceX launches Starship to orbit" });
    assert.equal(classifyMarketType(topic), "A");
  });

  it("classifies price/measurement topics as Type B", () => {
    const topic = makeTopic({ title: "Bitcoin price could reach $150K" });
    assert.equal(classifyMarketType(topic), "B");
  });

  it("classifies milestone/record topics as Type B", () => {
    const topic = makeTopic({ title: "Ethereum hits record TVL milestone" });
    assert.equal(classifyMarketType(topic), "B");
  });
});

describe("validateQuestion", () => {
  it("accepts valid questions", () => {
    const result = validateQuestion("Will Bitcoin reach $100K by March 2026?");
    assert.equal(result.valid, true);
  });

  it("rejects questions without question mark", () => {
    const result = validateQuestion("Bitcoin will reach $100K by March 2026");
    assert.equal(result.valid, false);
    assert.ok(result.reason?.includes("question mark"));
  });

  it("rejects too-short questions", () => {
    const result = validateQuestion("Will it?");
    assert.equal(result.valid, false);
    assert.ok(result.reason?.includes("short"));
  });

  it("rejects subjective terms", () => {
    const result = validateQuestion("Will Bitcoin be the best investment this year?");
    assert.equal(result.valid, false);
    assert.ok(result.reason?.includes("subjective"));
  });

  it("rejects 'exciting' as subjective", () => {
    const result = validateQuestion("Will the exciting new launch succeed?");
    assert.equal(result.valid, false);
  });
});

describe("calculateCloseTime", () => {
  it("returns a future date", () => {
    const closeTime = calculateCloseTime("A", "crypto");
    const closeDate = new Date(closeTime);
    assert.ok(closeDate > new Date());
  });

  it("is at least 48 hours in the future", () => {
    const closeTime = calculateCloseTime("A", "crypto");
    const closeDate = new Date(closeTime);
    const hoursDiff = (closeDate.getTime() - Date.now()) / (1000 * 60 * 60);
    assert.ok(hoursDiff >= 48, `Expected >= 48h, got ${hoursDiff.toFixed(1)}h`);
  });

  it("is at most 14 days in the future", () => {
    const closeTime = calculateCloseTime("B", "politics");
    const closeDate = new Date(closeTime);
    const daysDiff = (closeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    assert.ok(daysDiff <= 15, `Expected <= 15 days, got ${daysDiff.toFixed(1)} days`);
  });
});

describe("generateMarketProposal", () => {
  it("generates a proposal for a crypto trend", () => {
    const topic = makeTopic({
      title: "Solana (SOL) trending",
      category: "crypto",
    });
    const proposal = generateMarketProposal(topic);
    assert.ok(proposal !== null);
    assert.ok(proposal!.question.length >= 10);
    assert.ok(proposal!.question.endsWith("?"));
    assert.equal(proposal!.category, "crypto");
    assert.ok(proposal!.dataSource.length > 0);
    assert.ok(proposal!.tags.length > 0);
  });

  it("generates a proposal for a tech announcement", () => {
    const topic = makeTopic({
      title: "Google announces Gemini 3 AI model launch",
      description: "Google unveils next-gen AI model",
      category: "technology",
      source: "hackernews",
      keywords: ["google", "gemini", "ai", "launch"],
    });
    const proposal = generateMarketProposal(topic);
    assert.ok(proposal !== null);
    assert.equal(proposal!.category, "technology");
    assert.equal(proposal!.marketType, "A");
  });

  it("includes resolution criteria", () => {
    const topic = makeTopic();
    const proposal = generateMarketProposal(topic);
    assert.ok(proposal !== null);
    assert.ok(proposal!.resolutionCriteria.length > 20);
  });

  it("sets correct close time constraints", () => {
    const topic = makeTopic();
    const proposal = generateMarketProposal(topic);
    assert.ok(proposal !== null);
    const closeDate = new Date(proposal!.closeTime);
    const hoursDiff = (closeDate.getTime() - Date.now()) / (1000 * 60 * 60);
    assert.ok(hoursDiff >= 48);
    assert.ok(hoursDiff <= 14 * 24 + 24); // 15 days max with rounding
  });
});
