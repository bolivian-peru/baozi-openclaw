/**
 * Market question generator
 * Converts trending topics into properly-structured prediction market proposals
 */

import type { TrendingTopic, MarketProposal, MarketType, MarketCategory } from "./types/index.js";

/** Data source mapping by category */
const DATA_SOURCES: Record<MarketCategory, string> = {
  crypto: "CoinGecko / CoinMarketCap official data",
  sports: "ESPN / Official league results",
  technology: "Official company announcements / press releases",
  entertainment: "Official ceremony / platform results",
  finance: "Bureau of Labor Statistics / Federal Reserve / SEC filings",
  politics: "Official government / election results",
  science: "NASA / peer-reviewed publications",
  other: "Official public records / verified news sources",
};

/** Tag suggestions by category */
const CATEGORY_TAGS: Record<MarketCategory, string[]> = {
  crypto: ["crypto", "blockchain", "defi"],
  sports: ["sports", "competition"],
  technology: ["tech", "innovation"],
  entertainment: ["entertainment", "culture"],
  finance: ["finance", "economy", "markets"],
  politics: ["politics", "government"],
  science: ["science", "research"],
  other: ["trending"],
};

/**
 * Determine market type based on the topic
 * Type A: Event-based (will X happen?)
 * Type B: Measurement-period (will X reach Y by date?)
 */
function classifyMarketType(topic: TrendingTopic): MarketType {
  const text = `${topic.title} ${topic.description}`.toLowerCase();

  // Type A indicators: specific events, announcements, launches
  const typeAPatterns = [
    /\b(announce|launch|release|unveil|reveal|introduce|ship)\b/,
    /\b(win|lose|beat|defeat|championship|final|playoff)\b/,
    /\b(approve|reject|ban|regulate|vote|sign|pass)\b/,
    /\b(award|oscar|grammy|emmy|nominee|winner)\b/,
    /\b(ipo|acquisition|merger|acquire|buy)\b/,
    /\b(elect|inaugurat)\b/,
  ];

  // Type B indicators: measurements, thresholds, milestones
  const typeBPatterns = [
    /\b(price|reach|hit|surpass|exceed|cross|above|below)\b/,
    /\b(market cap|volume|tvl|apy|rate|percentage)\b/,
    /\b(grow|decline|increase|decrease|rise|fall|drop)\b/,
    /\b(record|all.time.high|ath|milestone)\b/,
    /\b(inflation|unemployment|gdp|index)\b/,
  ];

  const typeAScore = typeAPatterns.filter(p => p.test(text)).length;
  const typeBScore = typeBPatterns.filter(p => p.test(text)).length;

  return typeBScore > typeAScore ? "B" : "A";
}

/**
 * Calculate appropriate close time based on market type and category
 * - Minimum 48h from now
 * - Maximum 14 days from now
 * - Type A: close before the event
 * - Type B: close at end of measurement period
 */
function calculateCloseTime(marketType: MarketType, category: MarketCategory): string {
  const now = new Date();

  // Default durations by category (in days)
  const durations: Record<MarketCategory, number> = {
    crypto: 7,      // Crypto moves fast
    sports: 5,      // Usually tied to upcoming games
    technology: 10,  // Product launches need lead time
    entertainment: 7,
    finance: 10,     // Economic data releases
    politics: 14,    // Political events need more time
    science: 14,
    other: 7,
  };

  let days = durations[category] || 7;

  // Ensure minimum 48h (2 days) and maximum 14 days
  days = Math.max(3, Math.min(14, days)); // 3 days min for safety margin above 48h

  // Type A: close 24h before estimated event
  if (marketType === "A") {
    days = Math.max(3, days - 1);
  }

  const closeTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  // Round to nearest hour
  closeTime.setMinutes(0, 0, 0);

  return closeTime.toISOString();
}

/**
 * Generate a market question from a trending topic
 * Rules: 10-200 chars, objective, verifiable, no subjective terms
 */
function generateQuestion(topic: TrendingTopic, marketType: MarketType): string {
  const { title, category } = topic;
  const text = title.toLowerCase();

  // Crypto topics
  if (category === "crypto") {
    // Trending coin — price prediction
    const coinMatch = title.match(/^(.+?)\s*\(([A-Z]+)\)\s*trending/i);
    if (coinMatch) {
      const [, name, symbol] = coinMatch;
      return `Will ${symbol} price increase by 20% or more in the next 7 days?`;
    }

    // Sector trend
    if (/sector/.test(text)) {
      const sectorMatch = title.match(/^(.+?)\s*sector/i);
      const sector = sectorMatch?.[1] || "crypto";
      return `Will the ${sector} crypto sector outperform BTC in the next 7 days?`;
    }

    // Generic crypto trend
    return `Will ${title.slice(0, 60)} impact crypto markets positively this week?`;
  }

  // Technology topics
  if (category === "technology") {
    if (/launch|release|announce|unveil|ship/i.test(text)) {
      const subject = extractSubject(title);
      return `Will ${subject} be officially released within the next 14 days?`;
    }
    if (/ai|gpt|llm|model/i.test(text)) {
      const subject = extractSubject(title);
      return `Will ${subject} gain mainstream adoption coverage within 7 days?`;
    }
    if (/acquir|merger|buy/i.test(text)) {
      const subject = extractSubject(title);
      return `Will the ${subject} deal be officially confirmed within 14 days?`;
    }
    if (/ipo|funding|raises/i.test(text)) {
      const subject = extractSubject(title);
      return `Will ${subject} complete funding/IPO within 14 days?`;
    }
  }

  // Sports topics
  if (category === "sports") {
    const subject = extractSubject(title);
    return `Will ${subject} win their next scheduled match/game?`;
  }

  // Finance topics
  if (category === "finance") {
    if (/fed|rate/i.test(text)) {
      return "Will the Federal Reserve change interest rates at the next meeting?";
    }
    if (/inflation/i.test(text)) {
      return "Will the next CPI report show inflation above market expectations?";
    }
    const subject = extractSubject(title);
    return `Will ${subject} exceed analyst expectations this quarter?`;
  }

  // Entertainment
  if (category === "entertainment") {
    const subject = extractSubject(title);
    return `Will ${subject} top charts or win the award within 14 days?`;
  }

  // Politics
  if (category === "politics") {
    if (/ban|regulate/i.test(text)) {
      const subject = extractSubject(title);
      return `Will the proposed ${subject} regulation pass within 14 days?`;
    }
    const subject = extractSubject(title);
    return `Will ${subject} be officially enacted within 14 days?`;
  }

  // Default: generic market question
  const trimmedTitle = title.length > 100 ? title.slice(0, 97) + "..." : title;
  return `Will "${trimmedTitle}" still be trending in 7 days?`;
}

/**
 * Extract the main subject from a headline (first meaningful noun phrase)
 */
function extractSubject(title: string): string {
  // Remove common prefixes
  let cleaned = title
    .replace(/^(breaking|update|report|rumor|leaked|exclusive|official):\s*/i, "")
    .replace(/^(the|a|an)\s+/i, "")
    .trim();

  // Take first ~60 chars, break at word boundary
  if (cleaned.length > 60) {
    cleaned = cleaned.slice(0, 60).replace(/\s+\S*$/, "");
  }

  return cleaned || title.slice(0, 50);
}

/**
 * Generate resolution criteria based on market type and category
 */
function generateResolutionCriteria(
  question: string,
  marketType: MarketType,
  category: MarketCategory,
  dataSource: string
): string {
  if (marketType === "A") {
    return `This market resolves YES if the event described in the question occurs as verified by ${dataSource} before the closing time. Resolves NO if the event has not occurred by closing time, or if the event is officially cancelled/denied.`;
  }

  return `This market resolves YES if the measurement/threshold described in the question is met as verified by ${dataSource} during the measurement period ending at close time. Resolves NO if the threshold is not met by closing time.`;
}

/**
 * Generate a market description from the proposal
 */
function generateDescription(topic: TrendingTopic, question: string, dataSource: string): string {
  const parts = [
    `📊 Auto-generated from trending topic: "${topic.title}"`,
    "",
    `Source: ${topic.source} (trend score: ${topic.trendScore}/100)`,
    "",
    `Resolution: ${dataSource}`,
    "",
    topic.description,
  ];

  if (topic.url) {
    parts.push("", `Reference: ${topic.url}`);
  }

  return parts.join("\n").slice(0, 1000); // Baozi description limit
}

/**
 * Validate that a question meets Baozi quality rules
 */
function validateQuestion(question: string): { valid: boolean; reason?: string } {
  if (question.length < 10) return { valid: false, reason: "Question too short (min 10 chars)" };
  if (question.length > 200) return { valid: false, reason: "Question too long (max 200 chars)" };

  // No subjective terms
  const subjectivePatterns = [
    /\b(best|worst|exciting|amazing|terrible|great|good|bad|beautiful|ugly)\b/i,
    /\b(should|ought|feel|think|believe|opinion)\b/i,
    /\b(popular|famous|cool|hot|viral)\b/i,
  ];

  for (const pattern of subjectivePatterns) {
    if (pattern.test(question)) {
      return { valid: false, reason: `Question contains subjective term: ${pattern.source}` };
    }
  }

  // Must be a question
  if (!question.endsWith("?")) {
    return { valid: false, reason: "Must end with a question mark" };
  }

  return { valid: true };
}

/**
 * Generate a complete market proposal from a trending topic
 */
export function generateMarketProposal(topic: TrendingTopic): MarketProposal | null {
  const marketType = classifyMarketType(topic);
  let question = generateQuestion(topic, marketType);

  // Validate and fix the question
  const validation = validateQuestion(question);
  if (!validation.valid) {
    console.warn(`[generator] Question validation failed for "${topic.title}": ${validation.reason}`);
    // Try to fix common issues
    if (!question.endsWith("?")) question += "?";
    if (question.length > 200) question = question.slice(0, 197) + "...?";
    if (question.length < 10) return null;

    // Re-validate
    const recheck = validateQuestion(question);
    if (!recheck.valid) {
      console.warn(`[generator] Could not fix question: ${recheck.reason}`);
      return null;
    }
  }

  const dataSource = DATA_SOURCES[topic.category];
  const closeTime = calculateCloseTime(marketType, topic.category);

  // Type A markets: closingTime = stop accepting bets, eventTime = when the event occurs (after close)
  // Type B markets: closingTime = stop accepting bets, measurementStart = begin measuring (after close)
  let measurementStart: string | undefined;
  let eventTime: string | undefined;
  if (marketType === "B") {
    const closeDate = new Date(closeTime);
    // Measurement starts 1 hour after close
    const measStart = new Date(closeDate.getTime() + 1 * 60 * 60 * 1000);
    measurementStart = measStart.toISOString();
  } else {
    // Type A: event occurs after betting closes
    const closeDate = new Date(closeTime);
    // Event happens 24 hours after close
    const evtTime = new Date(closeDate.getTime() + 24 * 60 * 60 * 1000);
    eventTime = evtTime.toISOString();
  }

  const tags = [
    ...CATEGORY_TAGS[topic.category],
    "trending",
    "auto-generated",
    ...topic.keywords.slice(0, 3),
  ];

  return {
    topic,
    question,
    description: generateDescription(topic, question, dataSource),
    marketType,
    closeTime,
    measurementStart,
    eventTime,
    dataSource,
    resolutionCriteria: generateResolutionCriteria(question, marketType, topic.category, dataSource),
    category: topic.category,
    tags: [...new Set(tags)].slice(0, 10),
    isRaceMarket: false,
  };
}

export { classifyMarketType, calculateCloseTime, validateQuestion };
