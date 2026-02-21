import type { ParsedPrediction, MarketType } from "./types";

/** Known data sources by asset/topic */
const DATA_SOURCES: Record<string, string> = {
  btc: "CoinGecko BTC/USD", bitcoin: "CoinGecko BTC/USD",
  eth: "CoinGecko ETH/USD", ethereum: "CoinGecko ETH/USD",
  sol: "CoinGecko SOL/USD", solana: "CoinGecko SOL/USD",
  nfl: "NFL Official Results", "super bowl": "NFL Official Results",
  nba: "NBA Official Results",
  election: "Associated Press (AP)",
  temperature: "NOAA Weather Data",
  rain: "NOAA Weather Data", weather: "NOAA Weather Data",
};

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};

/**
 * Parse a free-text prediction into structured market parameters.
 * Handles: "X will Y by Z", "Will X do Y?", social post formats, etc.
 */
export function parsePrediction(text: string): ParsedPrediction | null {
  const t = text.trim();
  if (t.length < 10) return null;

  // Build question
  let cleaned = t.replace(/^(i think|i believe|my call:?\s*)/i, "").replace(/!+$/, "");
  // Handle "X to $Y" → "X reach $Y"
  cleaned = cleaned.replace(/\sto\s\$/i, " reach $");

  let question: string;
  if (t.endsWith("?")) {
    question = t;
  } else if (/^will\s/i.test(cleaned)) {
    // Already starts with "will" — just add "?"
    question = cleaned.charAt(0).toUpperCase() + cleaned.slice(1) + "?";
  } else if (/\s+will\s+/i.test(cleaned)) {
    // Contains "will" mid-sentence: "BTC will hit $120k" → "Will BTC hit $120k?"
    question = "Will " + cleaned.replace(/\s+will\s+/i, " ") + "?";
  } else {
    question = `Will ${cleaned}?`;
  }

  // Detect market type and timing
  const eventTime = extractEventTime(t);
  const measurementStart = extractMeasurementStart(t);
  let marketType: MarketType = "A";
  let closeTime: Date;

  if (measurementStart) {
    // Type B: measurement-based (e.g., "average temperature over next week")
    marketType = "B";
    closeTime = new Date(measurementStart.getTime() - 1 * 60 * 60 * 1000); // 1h before measurement
  } else if (eventTime) {
    // Type A: event-based, close_time must be >= 24h before event
    marketType = "A";
    closeTime = new Date(eventTime.getTime() - 25 * 60 * 60 * 1000); // 25h before event
  } else {
    // Default: 7 days from now
    const now = new Date();
    const defaultEvent = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    closeTime = new Date(defaultEvent.getTime() - 25 * 60 * 60 * 1000);
  }

  // Validate close_time is in the future
  if (closeTime <= new Date()) {
    return null; // Can't create a market that's already closed
  }

  // Detect data source
  const dataSource = detectDataSource(t);

  // Build resolution criteria
  const resolutionCriteria = `Resolves YES if: ${cleaned}. Data source: ${dataSource}.`;

  return {
    question,
    market_type: marketType,
    close_time: closeTime,
    event_time: eventTime,
    measurement_start: measurementStart,
    data_source: dataSource,
    resolution_criteria: resolutionCriteria,
  };
}

/** Extract event time from text (e.g., "by March 1, 2026") */
function extractEventTime(text: string): Date | null {
  const lower = text.toLowerCase();

  // Pattern: "by Month Day, Year" or "by Month Day Year"
  const byDate = lower.match(/by\s+(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/);
  if (byDate) {
    const month = MONTH_MAP[byDate[1]];
    if (month !== undefined) {
      const day = parseInt(byDate[2]);
      const year = byDate[3] ? parseInt(byDate[3]) : new Date().getFullYear();
      return new Date(year, month, day, 23, 59, 59);
    }
  }

  // Pattern: "end of Month" or "end of Year"
  const endOf = lower.match(/end of\s+(\w+)\s*(\d{4})?/);
  if (endOf) {
    const month = MONTH_MAP[endOf[1]];
    if (month !== undefined) {
      const year = endOf[2] ? parseInt(endOf[2]) : new Date().getFullYear();
      return new Date(year, month + 1, 0, 23, 59, 59); // last day of month
    }
    const year = parseInt(endOf[1]);
    if (!isNaN(year) && year >= 2025 && year <= 2030) {
      return new Date(year, 11, 31, 23, 59, 59);
    }
  }

  // Pattern: "within N days/weeks/months"
  const within = lower.match(/within\s+(\d+)\s+(hour|day|week|month)s?/);
  if (within) {
    const n = parseInt(within[1]);
    const unit = within[2];
    const ms: Record<string, number> = { hour: 3600e3, day: 86400e3, week: 604800e3, month: 2592000e3 };
    return new Date(Date.now() + n * (ms[unit] || 86400e3));
  }

  // Pattern: "next Sunday/Monday/etc."
  const nextDay = lower.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (nextDay) {
    const dayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const target = dayMap[nextDay[1]];
    const now = new Date();
    const current = now.getDay();
    let diff = target - current;
    if (diff <= 0) diff += 7;
    return new Date(now.getTime() + diff * 86400e3);
  }

  return null;
}

/** Extract measurement start for Type B markets */
function extractMeasurementStart(text: string): Date | null {
  const lower = text.toLowerCase();
  // Type B: "average X over next Y" or "total X during next Y"
  if (/average|total|cumulative|over the next|during the next/i.test(lower)) {
    const duration = lower.match(/(?:next|coming)\s+(\d+)\s+(hour|day|week|month)s?/);
    if (duration) {
      const n = parseInt(duration[1]);
      const unit = duration[2];
      const ms: Record<string, number> = { hour: 3600e3, day: 86400e3, week: 604800e3, month: 2592000e3 };
      // Measurement starts now (or in near future)
      return new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h from now
    }
  }
  return null;
}

/** Detect data source from prediction text */
function detectDataSource(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, source] of Object.entries(DATA_SOURCES)) {
    if (lower.includes(keyword)) return source;
  }
  return "Manual oracle review";
}

/**
 * Parse a social media post into a prediction.
 * Strips @mentions, hashtags, emojis, URLs, and extracts the core prediction.
 */
export function parseSocialPost(rawText: string): { prediction: string; source_handle: string | null } {
  let text = rawText;

  // Extract @mention as source handle
  const handleMatch = text.match(/@(\w+)/);
  const sourceHandle = handleMatch ? handleMatch[1] : null;

  // Strip URLs
  text = text.replace(/https?:\/\/\S+/g, "");
  // Strip @mentions
  text = text.replace(/@\w+/g, "");
  // Strip hashtags
  text = text.replace(/#\w+/g, "");
  // Strip common social noise
  text = text.replace(/RT\s*:?/g, "");
  text = text.replace(/🔥|🚀|💰|📈|📉|🎯|⚡|💎|🙌|🤑|❗|‼️/g, "");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  return { prediction: text, source_handle: sourceHandle };
}
