/**
 * Bilingual Generator
 *
 * The heart of Night Kitchen. Generates bilingual market reports
 * that mix English market commentary with contextually-chosen
 * Mandarin Chinese proverbs.
 *
 * Brand voice:
 *   - lowercase always
 *   - kitchen metaphors (steaming, simmering, fire, bamboo)
 *   - honest about uncertainty
 *   - 🥟 emoji as brand mark
 */
import type { Market, BilingualReport, Proverb, ProverbContext } from '../types/index.js';
import { pickRandom } from '../proverbs/index.js';
import {
  formatDate,
  formatSol,
  formatPct,
  truncateQuestion,
  hoursUntil,
  daysUntil,
  clampToLimit,
} from '../utils/helpers.js';

// ---------------------------------------------------------------------------
// Proverb selection
// ---------------------------------------------------------------------------

/**
 * Determine the appropriate proverb context based on market conditions.
 *
 * Priority:
 *  1. Closes within 24h → timing
 *  2. Pool > 10 SOL OR extreme odds (>85%) → risk
 *  3. Closes > 7 days away → patience
 *  4. Default → wisdom
 */
export function selectProverbContext(market: Market): ProverbContext {
  const hours = hoursUntil(market.endTime);
  const days = daysUntil(market.endTime);

  if (hours > 0 && hours <= 24) {
    return 'timing';
  }

  const hasExtremeOdds = market.outcomes.some((o) => {
    const pct = o.probability <= 1 ? o.probability * 100 : o.probability;
    return pct > 85 || pct < 15;
  });

  if (market.totalPool > 10 || hasExtremeOdds) {
    return 'risk';
  }

  if (days > 7) {
    return 'patience';
  }

  return 'wisdom';
}

/**
 * Select a proverb for a given market using context-aware logic.
 */
export function selectProverb(market: Market, contextOverride?: ProverbContext): Proverb {
  const context = contextOverride ?? selectProverbContext(market);
  return pickRandom(context);
}

// ---------------------------------------------------------------------------
// Report formatters
// ---------------------------------------------------------------------------

function formatMarketLine(m: Market, index: number): string {
  const q = truncateQuestion(m.question, 70);
  const yes = m.outcomes[0];
  const no = m.outcomes[1];

  let oddsLine = '';
  if (yes && no) {
    oddsLine = `  ${formatPct(yes.probability)} / ${formatPct(no.probability)}`;
  } else if (yes) {
    oddsLine = `  ${yes.label}: ${formatPct(yes.probability)}`;
  }

  const poolLine = m.totalPool > 0 ? `  pool: ${formatSol(m.totalPool)}` : '';
  const closingHours = hoursUntil(m.endTime);
  const closingLine =
    closingHours > 0 && closingHours <= 48
      ? `  closes in: ${Math.round(closingHours)}h`
      : '';

  return [`${index + 1}. ${q}`, oddsLine, poolLine, closingLine]
    .filter(Boolean)
    .join('\n');
}

function buildProverbBlock(proverb: Proverb): string {
  return [
    '---',
    '古语有云 (gǔ yǔ yǒu yún — "as the old saying goes"):',
    proverb.chinese,
    proverb.pinyin,
    `"${proverb.english}"`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

/**
 * Generate the daily digest report — top markets by activity.
 */
export function generateDailyDigest(markets: Market[], maxToShow = 5): BilingualReport {
  const now = new Date();

  // Pick top markets: prefer higher pool, then filter out already-closed
  const active = markets
    .filter((m) => hoursUntil(m.endTime) > 0)
    .sort((a, b) => b.totalPool - a.totalPool)
    .slice(0, maxToShow);

  // Select the most contextually relevant proverb from the highest-stakes market
  const anchorMarket = active[0] ?? markets[0];
  const proverb = anchorMarket
    ? selectProverb(anchorMarket)
    : pickRandom('wisdom');

  const dateStr = formatDate(now);

  const header = `🥟 night kitchen report — ${dateStr}`;
  const intro = 'what\'s steaming in the market kitchen tonight:';

  const marketLines = active.length > 0
    ? active.map((m, i) => formatMarketLine(m, i)).join('\n\n')
    : '  no active markets found. the kitchen is quiet tonight.';

  const proverbBlock = buildProverbBlock(proverb);
  const footer = 'trade carefully. the kitchen never sleeps. 🥟';

  const combined = clampToLimit(
    [header, '', intro, '', marketLines, '', proverbBlock, '', footer].join('\n')
  );

  return {
    english: [header, '', intro, '', marketLines, '', footer].join('\n'),
    chinese: proverbBlock,
    combined,
    proverb,
    marketCount: active.length,
    generatedAt: now,
  };
}

/**
 * Generate a report focused on markets closing soon.
 */
export function generateClosingSoonReport(markets: Market[], maxToShow = 5): BilingualReport {
  const now = new Date();

  const closing = markets
    .filter((m) => {
      const h = hoursUntil(m.endTime);
      return h > 0 && h <= 24;
    })
    .sort((a, b) => a.endTime.getTime() - b.endTime.getTime())
    .slice(0, maxToShow);

  const proverb = pickRandom('timing');
  const dateStr = formatDate(now);

  const header = `🥟 night kitchen — closing soon report — ${dateStr}`;
  const intro = 'these markets are coming off the fire soon. last call:';

  const marketLines = closing.length > 0
    ? closing.map((m, i) => formatMarketLine(m, i)).join('\n\n')
    : '  nothing closing in the next 24h. the kitchen has time.';

  const proverbBlock = buildProverbBlock(proverb);
  const footer = 'the timer is running. nobody knows for sure. 🥟';

  const combined = clampToLimit(
    [header, '', intro, '', marketLines, '', proverbBlock, '', footer].join('\n')
  );

  return {
    english: [header, '', intro, '', marketLines, '', footer].join('\n'),
    chinese: proverbBlock,
    combined,
    proverb,
    marketCount: closing.length,
    generatedAt: now,
  };
}

/**
 * Generate a report focused on high-stakes markets.
 */
export function generateHighStakesReport(markets: Market[], maxToShow = 5): BilingualReport {
  const now = new Date();

  const highStakes = markets
    .filter((m) => m.totalPool > 10 && hoursUntil(m.endTime) > 0)
    .sort((a, b) => b.totalPool - a.totalPool)
    .slice(0, maxToShow);

  // Also catch extreme odds markets even if pool is modest
  const extremeOdds = markets
    .filter((m) => {
      if (m.totalPool > 10) return false; // already included above
      if (hoursUntil(m.endTime) <= 0) return false;
      return m.outcomes.some((o) => {
        const pct = o.probability <= 1 ? o.probability * 100 : o.probability;
        return pct > 85 || pct < 15;
      });
    })
    .slice(0, Math.max(0, maxToShow - highStakes.length));

  const featured = [...highStakes, ...extremeOdds].slice(0, maxToShow);

  const anchorMarket = featured[0] ?? markets[0];
  const proverb = anchorMarket
    ? selectProverb(anchorMarket, 'risk')
    : pickRandom('risk');

  const dateStr = formatDate(now);

  const header = `🥟 night kitchen — high stakes report — ${dateStr}`;
  const intro = 'the big pots are on the stove. where the real fire is:';

  const marketLines = featured.length > 0
    ? featured.map((m, i) => formatMarketLine(m, i)).join('\n\n')
    : '  no high-stakes markets right now. the kitchen is simmering low.';

  const proverbBlock = buildProverbBlock(proverb);
  const footer = 'large pools, real consequences. the market disagrees with itself. 🥟';

  const combined = clampToLimit(
    [header, '', intro, '', marketLines, '', proverbBlock, '', footer].join('\n')
  );

  return {
    english: [header, '', intro, '', marketLines, '', footer].join('\n'),
    chinese: proverbBlock,
    combined,
    proverb,
    marketCount: featured.length,
    generatedAt: now,
  };
}

/**
 * Generate a community warmth report (milestones, celebrations).
 */
export function generateCommunityReport(markets: Market[], maxToShow = 5): BilingualReport {
  const now = new Date();

  // Show a balanced cross-section of what's active
  const active = markets
    .filter((m) => hoursUntil(m.endTime) > 0)
    .slice(0, maxToShow);

  const proverb = pickRandom('community');
  const dateStr = formatDate(now);

  const header = `🥟 night kitchen — community digest — ${dateStr}`;
  const intro = 'the whole family is at the table. what we\'re watching together:';

  const marketLines = active.length > 0
    ? active.map((m, i) => formatMarketLine(m, i)).join('\n\n')
    : '  the kitchen is quiet. check back soon.';

  const proverbBlock = buildProverbBlock(proverb);
  const footer = 'one kitchen, many cooks. 🥟';

  const combined = clampToLimit(
    [header, '', intro, '', marketLines, '', proverbBlock, '', footer].join('\n')
  );

  return {
    english: [header, '', intro, '', marketLines, '', footer].join('\n'),
    chinese: proverbBlock,
    combined,
    proverb,
    marketCount: active.length,
    generatedAt: now,
  };
}
