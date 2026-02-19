/**
 * Duplicate detection module
 * Prevents creating duplicate markets from similar trending topics
 */

import type { MarketProposal, MachineState, TrendingTopic } from "./types/index.js";

/**
 * Normalize a string for comparison (lowercase, remove punctuation, collapse whitespace)
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Simple word-overlap similarity (Jaccard index on word sets)
 */
function wordSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalize(a).split(" ").filter(w => w.length > 2));
  const wordsB = new Set(normalize(b).split(" ").filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

/**
 * Keyword overlap ratio
 */
function keywordOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a.map(k => k.toLowerCase()));
  const setB = new Set(b.map(k => k.toLowerCase()));

  let overlap = 0;
  for (const k of setA) {
    if (setB.has(k)) overlap++;
  }

  return overlap / Math.min(setA.size, setB.size);
}

/**
 * Check if a topic is a duplicate of previously created markets
 */
export function isDuplicateTopic(
  topic: TrendingTopic,
  state: MachineState,
  existingMarketQuestions: string[] = []
): { isDuplicate: boolean; reason?: string } {
  // Check exact topic ID match
  if (state.createdTopicIds.includes(topic.id)) {
    return { isDuplicate: true, reason: `Exact topic ID match: ${topic.id}` };
  }

  // Check question similarity against previously created markets
  for (const existing of state.createdQuestions) {
    const similarity = wordSimilarity(topic.title, existing);
    if (similarity > 0.6) {
      return {
        isDuplicate: true,
        reason: `Similar to existing market question (${(similarity * 100).toFixed(0)}% match): "${existing}"`,
      };
    }
  }

  // Check against existing Baozi markets
  for (const existing of existingMarketQuestions) {
    const similarity = wordSimilarity(topic.title, existing);
    if (similarity > 0.5) {
      return {
        isDuplicate: true,
        reason: `Similar to existing Baozi market (${(similarity * 100).toFixed(0)}% match): "${existing}"`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Check if a proposal's question is too similar to existing ones
 */
export function isDuplicateProposal(
  proposal: MarketProposal,
  state: MachineState,
  existingMarketQuestions: string[] = []
): { isDuplicate: boolean; reason?: string } {
  // Check question similarity
  for (const existing of [...state.createdQuestions, ...existingMarketQuestions]) {
    const similarity = wordSimilarity(proposal.question, existing);
    if (similarity > 0.55) {
      return {
        isDuplicate: true,
        reason: `Question too similar (${(similarity * 100).toFixed(0)}% match): "${existing}"`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Deduplicate a list of topics among themselves
 * Returns topics with duplicates removed (keeps highest trendScore)
 */
export function deduplicateTopics(topics: TrendingTopic[]): TrendingTopic[] {
  const kept: TrendingTopic[] = [];

  for (const topic of topics) {
    let dominated = false;

    for (const existing of kept) {
      // Check title similarity
      const titleSim = wordSimilarity(topic.title, existing.title);
      // Check keyword overlap
      const kwOverlap = keywordOverlap(topic.keywords, existing.keywords);

      if (titleSim > 0.5 || kwOverlap > 0.6) {
        // Keep the one with higher trend score
        if (topic.trendScore > existing.trendScore) {
          const idx = kept.indexOf(existing);
          kept[idx] = topic;
        }
        dominated = true;
        break;
      }
    }

    if (!dominated) {
      kept.push(topic);
    }
  }

  return kept;
}
