/**
 * Prediction Parser
 * 
 * Converts natural language predictions into structured market parameters.
 * Handles common prediction patterns from social media posts.
 */
import type { ParsedPrediction } from "../types/index.js";

/** Known crypto assets and their CoinGecko IDs */
const CRYPTO_ASSETS: Record<string, string> = {
  btc: "bitcoin", bitcoin: "bitcoin",
  eth: "ethereum", ethereum: "ethereum",
  sol: "solana", solana: "solana",
  doge: "dogecoin", dogecoin: "dogecoin",
  xrp: "ripple", ripple: "ripple",
  bnb: "binancecoin",
  ada: "cardano", cardano: "cardano",
  avax: "avalanche", "avalanche-2": "avalanche",
  dot: "polkadot", polkadot: "polkadot",
  matic: "polygon", polygon: "polygon",
  link: "chainlink", chainlink: "chainlink",
  near: "near", sui: "sui",
  apt: "aptos", arb: "arbitrum",
  op: "optimism", pepe: "pepe",
  wif: "dogwifhat", bonk: "bonk",
  jup: "jupiter", jto: "jito",
};

/** Sports data sources */
const SPORTS_KEYWORDS = ["win", "beat", "defeat", "score", "game", "match", "championship", "finals", "super bowl", "world cup", "playoff"];
const SPORTS_SOURCES: Record<string, string> = {
  nba: "ESPN/NBA.com",
  nfl: "ESPN/NFL.com",
  mlb: "ESPN/MLB.com",
  nhl: "ESPN/NHL.com",
  soccer: "ESPN/FIFA.com",
  football: "ESPN/NFL.com",
  basketball: "ESPN/NBA.com",
  baseball: "ESPN/MLB.com",
  hockey: "ESPN/NHL.com",
  esports: "HLTV.org/Liquipedia",
  cs2: "HLTV.org",
  lol: "lolesports.com",
  valorant: "vlr.gg",
  dota: "Liquipedia",
};

/** Date parsing patterns */
const DATE_PATTERNS: Array<{ regex: RegExp; handler: (match: RegExpMatchArray) => Date | null }> = [
  // "by March 1" / "by March 1st" / "by March 1, 2026"
  {
    regex: /by\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i,
    handler: (m) => {
      const month = parseMonth(m[1]);
      const day = parseInt(m[2]);
      const year = m[3] ? parseInt(m[3]) : guessYear(month, day);
      return new Date(year, month, day, 23, 59, 59);
    },
  },
  // "before April 2026"
  {
    regex: /before\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})/i,
    handler: (m) => {
      const month = parseMonth(m[1]);
      const year = parseInt(m[2]);
      return new Date(year, month, 1, 0, 0, 0);
    },
  },
  // "in Q1 2026"
  {
    regex: /in\s+q([1-4])\s+(\d{4})/i,
    handler: (m) => {
      const quarter = parseInt(m[1]);
      const year = parseInt(m[2]);
      const month = quarter * 3;
      return new Date(year, month, 0, 23, 59, 59); // last day of quarter
    },
  },
  // "by end of 2026" / "by EOY 2026"
  {
    regex: /(?:by\s+)?(?:end\s+of|eoy)\s+(\d{4})/i,
    handler: (m) => new Date(parseInt(m[1]), 11, 31, 23, 59, 59),
  },
  // "this week" / "next week"
  {
    regex: /(this|next)\s+week/i,
    handler: (m) => {
      const now = new Date();
      const daysToAdd = m[1].toLowerCase() === "next" ? 14 : 7;
      return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    },
  },
  // "tomorrow"
  {
    regex: /tomorrow/i,
    handler: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 59);
      return d;
    },
  },
  // "in X days/weeks/months"
  {
    regex: /in\s+(\d+)\s+(day|week|month)s?/i,
    handler: (m) => {
      const n = parseInt(m[1]);
      const unit = m[2].toLowerCase();
      const d = new Date();
      if (unit === "day") d.setDate(d.getDate() + n);
      else if (unit === "week") d.setDate(d.getDate() + n * 7);
      else if (unit === "month") d.setMonth(d.getMonth() + n);
      return d;
    },
  },
  // ISO date: "2026-03-01"
  {
    regex: /(\d{4})-(\d{2})-(\d{2})/,
    handler: (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), 23, 59, 59),
  },
];

function parseMonth(s: string): number {
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };
  return months[s.toLowerCase()] ?? 0;
}

function guessYear(month: number, day: number): number {
  const now = new Date();
  const thisYear = now.getFullYear();
  const candidate = new Date(thisYear, month, day);
  return candidate > now ? thisYear : thisYear + 1;
}

/** Parse a price value like "$110k", "$5,000", "110000" */
function parsePrice(text: string): number | null {
  // Match patterns like $110k, $110K, $5,000, 110000
  // Suffix must be immediately after digits (no space) to avoid matching "by" etc.
  const match = text.match(/\$?([\d,]+(?:\.\d+)?)([kKmMbB])?(?:\s|$)/);
  if (!match) return null;
  let val = parseFloat(match[1].replace(/,/g, ""));
  const suffix = match[2]?.toLowerCase();
  if (suffix === "k") val *= 1_000;
  else if (suffix === "m") val *= 1_000_000;
  else if (suffix === "b") val *= 1_000_000_000;
  return val;
}

/** Detect direction words */
function detectDirection(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/(?:hit|reach|exceed|above|over|surpass|break|pump|moon)/i.test(lower)) return "above";
  if (/(?:drop|fall|below|under|crash|dump|tank)/i.test(lower)) return "below";
  if (/\bwill\b.*\bwin\b/i.test(lower)) return "yes";
  if (/\bwon'?t\b|\bwill\s+not\b/i.test(lower)) return "no";
  return undefined;
}

/**
 * Parse a natural language prediction into structured market parameters
 */
export function parsePrediction(text: string): ParsedPrediction {
  const lower = text.toLowerCase().trim();

  // Detect deadline
  let deadline: Date | null = null;
  for (const pattern of DATE_PATTERNS) {
    const match = lower.match(pattern.regex);
    if (match) {
      deadline = pattern.handler(match);
      break;
    }
  }
  if (!deadline) {
    // Default: 7 days from now
    deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
  }

  // Detect crypto asset
  let subject = "";
  let dataSource = "";
  let targetValue: number | undefined;
  let isCrypto = false;

  for (const [keyword, geckoId] of Object.entries(CRYPTO_ASSETS)) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(lower)) {
      subject = keyword.toUpperCase();
      if (subject.length <= 4) subject = subject; // keep ticker
      else subject = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      dataSource = `CoinGecko (${geckoId})`;
      isCrypto = true;

      // Extract price target
      const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[kKmMbB]?/);
      if (priceMatch) {
        targetValue = parsePrice(priceMatch[0]) ?? undefined;
      }
      break;
    }
  }

  // Detect sports
  let isSports = false;
  if (!isCrypto) {
    for (const kw of SPORTS_KEYWORDS) {
      if (lower.includes(kw)) {
        isSports = true;
        break;
      }
    }
    if (isSports) {
      for (const [sport, source] of Object.entries(SPORTS_SOURCES)) {
        if (lower.includes(sport)) {
          dataSource = source;
          break;
        }
      }
      if (!dataSource) dataSource = "ESPN";

      // Try to extract team/subject
      const willWinMatch = text.match(/(\w[\w\s]*?)\s+will\s+(?:win|beat|defeat)/i);
      if (willWinMatch) subject = willWinMatch[1].trim();
      else {
        const teamMatch = text.match(/(?:Will\s+)?(\w[\w\s]*?)\s+(?:win|beat|defeat)/i);
        if (teamMatch) subject = teamMatch[1].trim();
      }
    }
  }

  // Fallback subject and data source
  if (!subject) {
    // Use first capitalized word(s) as subject
    const capsMatch = text.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/);
    subject = capsMatch ? capsMatch[1] : "General";
  }
  if (!dataSource) {
    dataSource = "Web research / multiple sources";
  }

  const direction = detectDirection(text);

  // Build the question
  let question: string;
  if (isCrypto && targetValue && direction) {
    const dirWord = direction === "above" ? "exceed" : "fall below";
    const formattedPrice = targetValue >= 1000
      ? `$${(targetValue / 1000).toFixed(targetValue % 1000 === 0 ? 0 : 1)}k`
      : `$${targetValue}`;
    const deadlineStr = deadline.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    question = `Will ${subject} ${dirWord} ${formattedPrice} by ${deadlineStr}?`;
  } else if (isSports && subject) {
    question = text.replace(/^["']|["']$/g, "").trim();
    if (!question.endsWith("?")) question += "?";
    if (!question.startsWith("Will")) {
      question = `Will ${question.charAt(0).toLowerCase() + question.slice(1)}`;
    }
  } else {
    question = text.replace(/^["']|["']$/g, "").trim();
    if (!question.endsWith("?")) question += "?";
  }

  // Build resolution criteria
  let resolutionCriteria: string;
  if (isCrypto && targetValue) {
    resolutionCriteria = `Check ${subject} price on ${dataSource} at the deadline. Resolves YES if price is ${direction === "below" ? "below" : "at or above"} $${targetValue.toLocaleString()}.`;
  } else if (isSports) {
    resolutionCriteria = `Check official results on ${dataSource} after the event. Resolves based on final official outcome.`;
  } else {
    resolutionCriteria = `Verify outcome using ${dataSource}. Resolves YES if the stated prediction comes true by the deadline.`;
  }

  return {
    rawText: text,
    question,
    dataSource,
    resolutionCriteria,
    subject,
    targetValue,
    direction,
    deadline: deadline.toISOString(),
    marketType: "boolean",
  };
}

/**
 * Validate a parsed prediction for market creation
 */
export function validatePrediction(prediction: ParsedPrediction): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!prediction.question || prediction.question.length < 10) {
    errors.push("Question is too short (minimum 10 characters)");
  }
  if (prediction.question.length > 200) {
    errors.push("Question is too long (maximum 200 characters)");
  }
  if (!prediction.dataSource) {
    errors.push("Data source is required for resolution");
  }
  if (!prediction.resolutionCriteria) {
    errors.push("Resolution criteria is required");
  }

  const deadlineDate = new Date(prediction.deadline);
  const now = new Date();
  if (deadlineDate <= now) {
    errors.push("Deadline must be in the future");
  }
  // Minimum 1 hour from now for market close
  const minClose = new Date(now.getTime() + 60 * 60 * 1000);
  if (deadlineDate < minClose) {
    errors.push("Deadline must be at least 1 hour from now");
  }

  return { valid: errors.length === 0, errors };
}
