/**
 * Tests for the validator module
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { validateProposalLocally } from "../src/validator.js";
import type { MarketProposal, MachineConfig, TrendingTopic } from "../src/types/index.js";

const defaultConfig: MachineConfig = {
  solanaRpcUrl: "https://api.mainnet-beta.solana.com",
  solanaPrivateKey: "",
  baoziBaseUrl: "https://baozi.bet",
  sources: ["google-trends", "coingecko"],
  minTrendScore: 40,
  maxMarketsPerCycle: 5,
  minHoursUntilClose: 48,
  maxDaysUntilClose: 14,
  creatorFeeBps: 100,
  dryRun: true,
};

function makeTopic(): TrendingTopic {
  return {
    id: "test:1",
    title: "Test topic",
    description: "Test",
    source: "coingecko",
    category: "crypto",
    trendScore: 80,
    detectedAt: new Date(),
    keywords: ["test"],
  };
}

function makeProposal(overrides: Partial<MarketProposal> = {}): MarketProposal {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    topic: makeTopic(),
    question: "Will Bitcoin reach $150K by March 2026?",
    description: "Auto-generated market from trending topic",
    marketType: "B",
    closeTime: future.toISOString(),
    dataSource: "CoinGecko official data",
    resolutionCriteria: "Resolves YES if BTC price on CoinGecko reaches $150,000 before close time.",
    category: "crypto",
    tags: ["crypto", "bitcoin", "trending"],
    isRaceMarket: false,
    ...overrides,
  };
}

describe("validateProposalLocally", () => {
  it("passes valid proposals", () => {
    const result = validateProposalLocally(makeProposal(), defaultConfig);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it("rejects questions that are too short", () => {
    const result = validateProposalLocally(makeProposal({ question: "Yes?" }), defaultConfig);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("short")));
  });

  it("rejects questions without question mark", () => {
    const result = validateProposalLocally(
      makeProposal({ question: "Will Bitcoin reach $150K by March 2026" }),
      defaultConfig
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("question mark")));
  });

  it("rejects subjective terms", () => {
    const result = validateProposalLocally(
      makeProposal({ question: "Will this be the best crypto year ever?" }),
      defaultConfig
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Subjective")));
  });

  it("rejects close time too soon", () => {
    const tooSoon = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12h
    const result = validateProposalLocally(
      makeProposal({ closeTime: tooSoon.toISOString() }),
      defaultConfig
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("too soon")));
  });

  it("rejects close time too far", () => {
    const tooFar = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const result = validateProposalLocally(
      makeProposal({ closeTime: tooFar.toISOString() }),
      defaultConfig
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("too far")));
  });

  it("rejects past-event questions", () => {
    const result = validateProposalLocally(
      makeProposal({ question: "Who won yesterday's Super Bowl game?" }),
      defaultConfig
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("past event")));
  });

  it("rejects missing data source", () => {
    const result = validateProposalLocally(
      makeProposal({ dataSource: "" }),
      defaultConfig
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Data source")));
  });

  it("rejects missing resolution criteria", () => {
    const result = validateProposalLocally(
      makeProposal({ resolutionCriteria: "Yes" }),
      defaultConfig
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Resolution criteria")));
  });

  it("warns about 'other' category", () => {
    const result = validateProposalLocally(
      makeProposal({ category: "other" }),
      defaultConfig
    );
    assert.ok(result.warnings.some(w => w.includes("other")));
  });
});
