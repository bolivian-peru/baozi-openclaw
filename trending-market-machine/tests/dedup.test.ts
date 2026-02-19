/**
 * Tests for the dedup module
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { isDuplicateTopic, isDuplicateProposal, deduplicateTopics } from "../src/dedup.js";
import type { TrendingTopic, MachineState, MarketProposal } from "../src/types/index.js";

const emptyState: MachineState = {
  createdTopicIds: [],
  createdQuestions: [],
  markets: [],
  lastRunAt: new Date().toISOString(),
  totalCreated: 0,
};

function makeTopic(overrides: Partial<TrendingTopic> = {}): TrendingTopic {
  return {
    id: `test:${Math.random().toString(36).slice(2)}`,
    title: "Bitcoin hits new record",
    description: "BTC reaches all-time high",
    source: "coingecko",
    category: "crypto",
    trendScore: 80,
    detectedAt: new Date(),
    keywords: ["bitcoin", "crypto", "record"],
    ...overrides,
  };
}

describe("isDuplicateTopic", () => {
  it("detects exact ID matches", () => {
    const topic = makeTopic({ id: "test:btc-record" });
    const state = { ...emptyState, createdTopicIds: ["test:btc-record"] };
    const result = isDuplicateTopic(topic, state);
    assert.equal(result.isDuplicate, true);
    assert.ok(result.reason?.includes("Exact topic ID"));
  });

  it("detects similar titles", () => {
    const topic = makeTopic({ title: "Bitcoin hits new all-time high record" });
    const state = { ...emptyState, createdQuestions: ["Bitcoin hits new all-time record high"] };
    const result = isDuplicateTopic(topic, state);
    assert.equal(result.isDuplicate, true);
  });

  it("passes for unique topics", () => {
    const topic = makeTopic({ title: "SpaceX launches Starship successfully" });
    const state = {
      ...emptyState,
      createdQuestions: ["Will Bitcoin reach $100K this week?"],
    };
    const result = isDuplicateTopic(topic, state);
    assert.equal(result.isDuplicate, false);
  });

  it("checks against existing Baozi markets", () => {
    const topic = makeTopic({ title: "Ethereum price prediction market update trending" });
    const existingMarkets = ["Ethereum price prediction market update trending now"];
    const result = isDuplicateTopic(topic, emptyState, existingMarkets);
    assert.equal(result.isDuplicate, true);
  });
});

describe("deduplicateTopics", () => {
  it("removes duplicates, keeping higher score", () => {
    const topics = [
      makeTopic({ id: "a", title: "Bitcoin new record high", trendScore: 90 }),
      makeTopic({ id: "b", title: "Bitcoin reaches record high", trendScore: 70 }),
    ];
    const result = deduplicateTopics(topics);
    assert.equal(result.length, 1);
    assert.equal(result[0].trendScore, 90);
  });

  it("keeps distinct topics", () => {
    const topics = [
      makeTopic({ id: "a", title: "Bitcoin new record high", keywords: ["bitcoin"] }),
      makeTopic({ id: "b", title: "SpaceX launches Starship", keywords: ["spacex", "starship"] }),
    ];
    const result = deduplicateTopics(topics);
    assert.equal(result.length, 2);
  });

  it("handles empty input", () => {
    const result = deduplicateTopics([]);
    assert.equal(result.length, 0);
  });
});
