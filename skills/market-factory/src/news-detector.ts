/**
 * News & Event Detection Module — v7.0 Compliant
 *
 * Parimutuel Rules v7.0: ONLY event-based (Type A) markets allowed.
 * - Price prediction markets: BANNED
 * - Measurement-period markets: BANNED
 * - One-line test: "Can a bettor observe the likely outcome while betting is open?" → BLOCKED
 *
 * Good sources → Good markets:
 * - Company announcements, government actions, awards, sports, celebrity actions
 *
 * Full rules: https://baozi.bet/agents/rules
 */
import axios from 'axios';
import Parser from 'rss-parser';
import crypto from 'crypto';
import { config } from './config';
import { isEventSeen, recordSeenEvent, isDuplicate } from './tracker';

const rssParser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'BaoziMarketFactory/1.0' },
});

export interface MarketProposal {
  question: string;
  category: string;
  closingTime: Date;
  source: string;
  sourceUrl: string;
  confidence: number;
  resolutionSource?: string; // Approved resolution source
}

// =============================================================================
// v7.0 BANNED MARKET DETECTION
// =============================================================================

/** Patterns that indicate a BANNED price prediction market */
const PRICE_PREDICTION_PATTERNS = [
  /will\s+\w+\s+(?:be\s+)?(?:above|below|reach|exceed|hit|break|surpass|cross)\s+\$[\d,]+/i,
  /(?:price|value)\s+(?:of\s+)?\w+\s+(?:above|below|over|under)/i,
  /\$[\d,]+\s+(?:by|on|before)\s+/i,
  /(?:bitcoin|btc|ethereum|eth|solana|sol|crypto)\s+(?:price|value)/i,
  /(?:stock|share|equity)\s+(?:price|value)/i,
  /market\s+cap\s+(?:above|below|reach)/i,
];

/** Patterns that indicate a BANNED measurement-period market */
const MEASUREMENT_PERIOD_PATTERNS = [
  /during\s+(?:this|next|the)\s+(?:week|month|quarter|year)/i,
  /(?:weekly|monthly|quarterly|annual)\s+(?:average|total|volume)/i,
  /(?:over|across|throughout)\s+(?:the\s+)?(?:period|timeframe|window)/i,
  /what\s+will\s+\w+\s+(?:measure|read|show)\s+(?:at|on)/i,
];

/**
 * v7.0 compliance check: Is this market allowed?
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export function checkV7Compliance(question: string): { allowed: boolean; reason: string } {
  const q = question.toLowerCase();

  // Check for banned price prediction patterns
  for (const pattern of PRICE_PREDICTION_PATTERNS) {
    if (pattern.test(q)) {
      return { allowed: false, reason: `BANNED: Price prediction market (v7.0 rule)` };
    }
  }

  // Check for banned measurement-period patterns
  for (const pattern of MEASUREMENT_PERIOD_PATTERNS) {
    if (pattern.test(q)) {
      return { allowed: false, reason: `BANNED: Measurement-period market (v7.0 rule)` };
    }
  }

  // One-line test: can outcome be observed while betting is open?
  // Price-related questions fail this by default (caught above)
  // For remaining questions, check if they're genuinely event-based
  const eventPatterns = [
    /will\s+.+\s+(?:announce|launch|release|unveil|reveal|confirm|approve|reject|pass|sign|file|win|lose)/i,
    /who\s+(?:will\s+)?win/i,
    /will\s+.+\s+(?:happen|occur)\s+(?:by|before|on)/i,
    /will\s+@?\w+\s+(?:tweet|post|say|do|make|create)/i,
    /will\s+.+\s+(?:be\s+)?(?:approved|rejected|passed|signed|vetoed)/i,
  ];

  const isEventBased = eventPatterns.some(p => p.test(q));
  if (!isEventBased) {
    // Not clearly event-based, but also not clearly banned
    // Allow with lower confidence, the MCP validator will catch edge cases
    return { allowed: true, reason: 'Possibly event-based (not clearly banned)' };
  }

  return { allowed: true, reason: 'Event-based market (Type A) — v7.0 compliant' };
}

// =============================================================================
// v7.0 TIMING RULES (Type A only)
// =============================================================================

export interface TimingClassification {
  type: 'A';
  eventTime?: Date;
  valid: boolean;
  reason: string;
}

/**
 * Validate Type A timing: close_time must be <= event_time - 24h
 *
 * v7.0: Only Type A markets exist. Type B is banned.
 */
export function classifyAndValidateTiming(proposal: MarketProposal): TimingClassification {
  const question = proposal.question.toLowerCase();
  const closingMs = proposal.closingTime.getTime();
  const buffer24h = 24 * 60 * 60 * 1000;

  // Parse event date from question
  const byDateMatch = question.match(/by\s+(?:end\s+of\s+)?(\w+\s+\d{4}|q[1-4]\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
  const onDateMatch = question.match(/(?:on|before)\s+(\d{4}-\d{2}-\d{2})/i);

  let eventDate: Date | null = null;

  if (byDateMatch) {
    const dateStr = byDateMatch[1].toLowerCase();
    if (dateStr.match(/q[1-4]\s+\d{4}/)) {
      const [q, year] = dateStr.split(/\s+/);
      const quarter = parseInt(q.replace('q', ''));
      eventDate = new Date(`${year}-${String(quarter * 3).padStart(2, '0')}-28T23:59:59Z`);
    } else if (dateStr.match(/\d{4}-\d{2}-\d{2}/)) {
      eventDate = new Date(dateStr + 'T23:59:59Z');
    } else {
      eventDate = new Date(dateStr + ' 28 23:59:59 UTC');
    }
  } else if (onDateMatch) {
    eventDate = new Date(onDateMatch[1] + 'T23:59:59Z');
  }

  if (eventDate && !isNaN(eventDate.getTime())) {
    const valid = closingMs <= eventDate.getTime() - buffer24h;
    return {
      type: 'A',
      eventTime: eventDate,
      valid,
      reason: valid
        ? `Type A: closes ${((eventDate.getTime() - closingMs) / buffer24h).toFixed(1)} days before event`
        : `Type A VIOLATION: close_time must be <= event_time - 24h`,
    };
  }

  // No explicit date found — use closing time with default buffer
  return {
    type: 'A',
    eventTime: new Date(closingMs + buffer24h),
    valid: true,
    reason: 'Type A (inferred): no explicit event date, using closing time with default buffer',
  };
}

/**
 * Adjust proposal closing time to comply with Type A timing rules.
 * Returns null if the market cannot be made compliant.
 */
export function enforceTimingRules(proposal: MarketProposal): MarketProposal | null {
  const classification = classifyAndValidateTiming(proposal);

  if (classification.valid) return proposal;

  const buffer24h = 24 * 60 * 60 * 1000;

  if (classification.eventTime) {
    const adjustedClose = new Date(classification.eventTime.getTime() - buffer24h);
    if (adjustedClose.getTime() <= Date.now()) {
      console.warn(`  ⚠️ Cannot fix timing for "${proposal.question}" — adjusted close would be in the past`);
      return null;
    }
    console.log(`  🔧 Adjusted closing time: ${proposal.closingTime.toISOString()} → ${adjustedClose.toISOString()}`);
    return { ...proposal, closingTime: adjustedClose };
  }

  return null;
}

// =============================================================================
// RSS NEWS DETECTION (v7.0: Event-based only)
// =============================================================================

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
  categories?: string[];
}

function generateEventHash(title: string, source: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  return crypto.createHash('md5').update(`${source}:${normalized}`).digest('hex');
}

/** v7.0 EVENT-BASED patterns only. No price predictions. */
const EVENT_PATTERNS = [
  // Tech/product launches
  { regex: /(Apple|Google|Microsoft|Meta|Tesla|Nvidia|OpenAI|Anthropic)\s+(?:launches?|announces?|unveils?|releases?|reveals?)\s+(.+)/i, type: 'tech_launch' },
  // AI model releases
  { regex: /(GPT-\d|Claude\s+\d|Gemini\s+\d|Llama\s+\d)\s+(?:launch|release|announce)/i, type: 'ai_model' },
  // Regulatory actions
  { regex: /(?:SEC|CFTC|DOJ|FTC)\s+(?:approves?|rejects?|files?|charges?|investigates?)\s+/i, type: 'regulation' },
  // ETF/approval decisions
  { regex: /(\w+)\s+(?:ETF|etf)\s+(?:approved|rejected|filed|submitted|decision)/i, type: 'etf_decision' },
  // Corporate actions
  { regex: /(?:IPO|acquisition|merger|buyout)\s+(?:announced|confirmed|approved|completed)/i, type: 'corporate' },
  // Awards/competitions
  { regex: /(?:Oscar|Grammy|Emmy|BAFTA|Nobel|Pulitzer)\s+(?:winner|nomination|award)/i, type: 'award' },
  // Government/policy
  { regex: /(?:bill|legislation|executive\s+order|sanction)\s+(?:pass|sign|veto|approve|reject)/i, type: 'government' },
  // Celebrity/social media actions
  { regex: /@?\w+\s+(?:tweets?|posts?|announces?|confirms?)/i, type: 'social_action' },
];

function generateEventQuestion(title: string, pattern: { type: string }): string | null {
  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const dateStr = futureDate.toISOString().split('T')[0];

  switch (pattern.type) {
    case 'tech_launch': {
      const match = cleanTitle.match(/(Apple|Google|Microsoft|Meta|Tesla|Nvidia|OpenAI|Anthropic)\s+(?:launches?|announces?|unveils?|releases?|reveals?)\s+(.{5,50})/i);
      if (match) {
        return `Will ${match[1]} officially launch ${match[2].trim()} by ${dateStr}?`;
      }
      return null;
    }

    case 'ai_model': {
      const match = cleanTitle.match(/(GPT-\d|Claude\s+\d|Gemini\s+\d|Llama\s+\d)/i);
      if (match) {
        return `Will ${match[1]} be publicly released by ${dateStr}?`;
      }
      return null;
    }

    case 'etf_decision':
      return `Will the ${cleanTitle.match(/(\w+)/)?.[1] || 'crypto'} ETF receive a final SEC decision by ${dateStr}?`;

    case 'regulation':
      return null; // Too nuanced for auto-generation

    case 'corporate': {
      const snippet = cleanTitle.substring(0, 60).trim();
      return `Will the "${snippet}" deal be completed by ${dateStr}?`;
    }

    case 'award': {
      const match = cleanTitle.match(/(Oscar|Grammy|Emmy|BAFTA|Nobel|Pulitzer)/i);
      if (match) return null; // Awards need specific nominee info
      return null;
    }

    case 'government': {
      const snippet = cleanTitle.substring(0, 60).trim();
      return `Will "${snippet}" become law by ${dateStr}?`;
    }

    case 'social_action': return null; // Too noisy for auto-generation

    default:
      return null;
  }
}

export async function scanRSSFeeds(): Promise<MarketProposal[]> {
  const proposals: MarketProposal[] = [];

  for (const feed of config.rssFeeds) {
    try {
      console.log(`📡 Scanning RSS: ${feed.url}`);
      const parsed = await rssParser.parseURL(feed.url);

      for (const item of (parsed.items || []).slice(0, 15)) {
        const title = item.title || '';
        const eventHash = generateEventHash(title, feed.category);

        if (isEventSeen(eventHash)) continue;

        for (const pattern of EVENT_PATTERNS) {
          if (pattern.regex.test(title)) {
            const question = generateEventQuestion(title, pattern);
            if (question && question.length >= 10 && question.length <= 200) {
              // v7.0 compliance check
              const compliance = checkV7Compliance(question);
              if (!compliance.allowed) {
                console.log(`  🚫 BLOCKED: "${question}" — ${compliance.reason}`);
                recordSeenEvent(eventHash, title, feed.category);
                break;
              }

              if (!isDuplicate(question)) {
                const closingTime = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000); // 12 days (14 day event - 2 day buffer)
                proposals.push({
                  question,
                  category: feed.category,
                  closingTime,
                  source: `RSS:${feed.category}`,
                  sourceUrl: item.link || '',
                  confidence: 0.75,
                  resolutionSource: 'Official announcement / news source',
                });
                recordSeenEvent(eventHash, title, feed.category);
                console.log(`  ✅ Proposal: "${question}" (${compliance.reason})`);
              }
            }
            break;
          }
        }

        recordSeenEvent(eventHash, title, feed.category);
      }
    } catch (err: any) {
      console.error(`  ❌ RSS error for ${feed.url}: ${err.message}`);
    }
  }

  return proposals;
}

// =============================================================================
// CURATED EVENT MARKETS (v7.0 compliant — no price predictions)
// =============================================================================

/**
 * Generate curated event-based markets.
 * v7.0: ONLY unknowable-outcome events. NO price predictions.
 */
export function generateCuratedMarkets(): MarketProposal[] {
  const proposals: MarketProposal[] = [];
  const now = new Date();

  const twoWeeks = new Date(now);
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const closeTime = new Date(now);
  closeTime.setDate(closeTime.getDate() + 12); // 2 days before event

  // Event-based markets with unknowable outcomes
  const curatedEvents = [
    {
      question: `Will OpenAI announce a new model by ${twoWeeks.toISOString().split('T')[0]}?`,
      category: 'Tech',
      confidence: 0.7,
      resolutionSource: 'OpenAI official blog / Twitter',
    },
    {
      question: `Will the SEC announce any new crypto enforcement action by ${twoWeeks.toISOString().split('T')[0]}?`,
      category: 'Regulation',
      confidence: 0.7,
      resolutionSource: 'SEC.gov press releases',
    },
    {
      question: `Will Elon Musk tweet about Dogecoin by ${twoWeeks.toISOString().split('T')[0]}?`,
      category: 'Social',
      confidence: 0.65,
      resolutionSource: 'Twitter / X (@elonmusk)',
    },
  ];

  for (const event of curatedEvents) {
    const compliance = checkV7Compliance(event.question);
    if (!compliance.allowed) {
      console.log(`  🚫 Curated BLOCKED: "${event.question}" — ${compliance.reason}`);
      continue;
    }

    const eventHash = generateEventHash(event.question, 'Curated');
    if (!isEventSeen(eventHash) && !isDuplicate(event.question)) {
      proposals.push({
        question: event.question,
        category: event.category,
        closingTime: closeTime,
        source: 'Curated',
        sourceUrl: '',
        confidence: event.confidence,
        resolutionSource: event.resolutionSource,
      });
      recordSeenEvent(eventHash, event.question, 'Curated');
    }
  }

  return proposals;
}

// =============================================================================
// MAIN SCAN (v7.0: no crypto price scanning)
// =============================================================================

export async function detectMarketOpportunities(): Promise<MarketProposal[]> {
  const allProposals: MarketProposal[] = [];

  // v7.0: Only RSS event detection. NO crypto price milestones.
  const rssProposals = await scanRSSFeeds();
  allProposals.push(...rssProposals);

  // Add curated markets if we don't have enough
  if (allProposals.length < 3) {
    allProposals.push(...generateCuratedMarkets());
  }

  // Final v7.0 compliance filter (belt and suspenders)
  const compliant = allProposals.filter(p => {
    const check = checkV7Compliance(p.question);
    if (!check.allowed) {
      console.log(`  🚫 Final filter blocked: "${p.question}" — ${check.reason}`);
    }
    return check.allowed;
  });

  compliant.sort((a, b) => b.confidence - a.confidence);
  console.log(`\n📋 Total v7.0-compliant proposals: ${compliant.length} (from ${allProposals.length} raw)`);
  return compliant;
}
