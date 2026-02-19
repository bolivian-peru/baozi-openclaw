/**
 * Market Generator
 * 
 * Core pipeline: takes detected events, filters them,
 * generates valid market parameters, and creates markets on Baozi.
 * 
 * Pipeline: Detect → Filter → Deduplicate → Validate → Create → Track
 */

import type { DetectedEvent, MarketCreateParams, MarketRecord, ExistingMarket } from './types.js';
import type { MarketCategory } from './config.js';
import { QUALITY_FILTERS, MARKET_DEFAULTS } from './config.js';
import { listActiveMarkets, isDuplicateMarket, createLabMarket, previewMarketCreation } from './baozi-client.js';
import { loadState, saveState, addMarketRecord, isEventProcessed, updateLastScan } from './memory.js';

// =============================================================================
// Main Pipeline
// =============================================================================

export interface PipelineResult {
  scanned: number;
  filtered: number;
  duplicates: number;
  created: number;
  failed: number;
  markets: MarketRecord[];
  errors: string[];
}

/**
 * Run the full market generation pipeline
 * 
 * @param events - Detected events from sources
 * @param dryRun - If true, validate but don't create markets
 * @param maxMarkets - Maximum markets to create this cycle
 */
export async function runPipeline(
  events: DetectedEvent[],
  dryRun: boolean = false,
  maxMarkets: number = QUALITY_FILTERS.MAX_MARKETS_PER_CYCLE
): Promise<PipelineResult> {
  const result: PipelineResult = {
    scanned: events.length,
    filtered: 0,
    duplicates: 0,
    created: 0,
    failed: 0,
    markets: [],
    errors: [],
  };

  console.log(`\n[Pipeline] Starting with ${events.length} detected events (dryRun=${dryRun})`);

  // Load state
  const state = loadState();

  // Step 1: Filter by quality
  const filtered = events.filter(event => {
    const reason = filterEvent(event);
    if (reason) {
      result.filtered++;
      return false;
    }
    return true;
  });
  console.log(`[Pipeline] After quality filter: ${filtered.length} events`);

  // Step 2: Remove already-processed events
  const unprocessed = filtered.filter(event => {
    if (isEventProcessed(state, event.eventId)) {
      result.duplicates++;
      return false;
    }
    return true;
  });
  console.log(`[Pipeline] After dedup (processed): ${unprocessed.length} events`);

  // Step 3: Check for duplicate markets on Baozi
  let existingMarkets: ExistingMarket[] = [];
  try {
    existingMarkets = await listActiveMarkets();
    console.log(`[Pipeline] Fetched ${existingMarkets.length} existing markets for dedup`);
  } catch (err) {
    console.warn('[Pipeline] Could not fetch existing markets:', err);
  }

  const unique = unprocessed.filter(event => {
    if (isDuplicateMarket(event.suggestedQuestion, existingMarkets)) {
      result.duplicates++;
      console.log(`[Pipeline] Duplicate: "${event.suggestedQuestion}"`);
      return false;
    }
    return true;
  });
  console.log(`[Pipeline] After dedup (existing): ${unique.length} events`);

  // Step 4: Generate market params and validate
  const candidates: { event: DetectedEvent; params: MarketCreateParams }[] = [];

  for (const event of unique.slice(0, maxMarkets * 2)) { // Check 2x candidates
    const params = generateMarketParams(event);
    if (!params) continue;

    // Validate
    const preview = await previewMarketCreation(params);
    if (!preview.valid) {
      console.warn(`[Pipeline] Validation failed for "${params.question}":`, preview.errors);
      continue;
    }
    if (preview.warnings.length > 0) {
      console.log(`[Pipeline] Warnings for "${params.question}":`, preview.warnings);
    }

    candidates.push({ event, params });
    if (candidates.length >= maxMarkets) break;
  }
  console.log(`[Pipeline] Validated candidates: ${candidates.length}`);

  // Step 5: Create markets (or dry-run log)
  for (const { event, params } of candidates) {
    if (dryRun) {
      console.log(`[Pipeline] DRY RUN - Would create: "${params.question}"`);
      console.log(`  Category: ${params.category}`);
      console.log(`  Closing: ${params.closingTime.toISOString()}`);
      console.log(`  Resolution: ${params.resolutionTime.toISOString()}`);
      console.log(`  Source: ${params.resolutionSource}`);
      result.created++;
      continue;
    }

    console.log(`[Pipeline] Creating market: "${params.question}"`);
    const createResult = await createLabMarket(params);

    if (createResult.success) {
      const record: MarketRecord = {
        eventId: event.eventId,
        marketId: createResult.marketId || 'unknown',
        marketAddress: createResult.marketAddress || 'unknown',
        question: params.question,
        category: params.category,
        createdAt: new Date().toISOString(),
        closingTime: params.closingTime.toISOString(),
        resolutionTime: params.resolutionTime.toISOString(),
        resolutionSource: params.resolutionSource,
        txSignature: createResult.txSignature || '',
        status: 'active',
        volumeSol: 0,
        feesEarnedSol: 0,
      };

      addMarketRecord(state, record);
      result.markets.push(record);
      result.created++;
      console.log(`[Pipeline] ✅ Created! Market ID: ${record.marketId}, Address: ${record.marketAddress}`);
    } else {
      result.failed++;
      result.errors.push(`Failed to create "${params.question}": ${createResult.error}`);
      console.error(`[Pipeline] ❌ Failed: ${createResult.error}`);
    }
  }

  // Save state
  updateLastScan(state, 'pipeline');
  saveState(state);

  console.log(`\n[Pipeline] Summary: scanned=${result.scanned}, filtered=${result.filtered}, dupes=${result.duplicates}, created=${result.created}, failed=${result.failed}`);
  return result;
}

// =============================================================================
// Quality Filter
// =============================================================================

function filterEvent(event: DetectedEvent): string | null {
  // Confidence threshold
  if (event.confidence < 0.5) {
    return `Low confidence: ${event.confidence}`;
  }

  // Question length
  if (event.suggestedQuestion.length < QUALITY_FILTERS.MIN_QUESTION_LENGTH) {
    return `Question too short: ${event.suggestedQuestion.length} chars`;
  }
  if (event.suggestedQuestion.length > QUALITY_FILTERS.MAX_QUESTION_LENGTH) {
    return `Question too long: ${event.suggestedQuestion.length} chars`;
  }

  // Blocked terms
  const lowerQuestion = event.suggestedQuestion.toLowerCase();
  for (const term of QUALITY_FILTERS.BLOCKED_TERMS) {
    if (lowerQuestion.includes(term.toLowerCase())) {
      return `Blocked term: ${term}`;
    }
  }

  // Event time check (must be in the future)
  const now = new Date();
  const minFuture = new Date(now.getTime() + QUALITY_FILTERS.MIN_FUTURE_HOURS * 60 * 60 * 1000);
  if (event.eventTime < minFuture) {
    return `Event too soon: ${event.eventTime.toISOString()}`;
  }

  return null; // Passes filter
}

// =============================================================================
// Market Param Generation
// =============================================================================

function generateMarketParams(event: DetectedEvent): MarketCreateParams | null {
  let question = event.suggestedQuestion;

  // Ensure question ends with ?
  if (!question.endsWith('?')) {
    question += '?';
  }

  // Truncate if needed
  if (question.length > 200) {
    question = question.slice(0, 197) + '...?';
  }

  // Calculate timing
  const now = new Date();
  const eventTime = event.eventTime;

  // Closing time: 2 hours before event, or 1 hour from now (whichever is later)
  let closingTime = new Date(eventTime.getTime() - MARKET_DEFAULTS.DEFAULT_CLOSE_BUFFER_HOURS * 60 * 60 * 1000);
  const minClosing = new Date(now.getTime() + MARKET_DEFAULTS.MIN_CLOSE_BUFFER_HOURS * 60 * 60 * 1000);

  if (closingTime < minClosing) {
    closingTime = minClosing;
  }

  // Resolution time: 24 hours after closing
  const resolutionTime = new Date(closingTime.getTime() + MARKET_DEFAULTS.RESOLUTION_BUFFER_HOURS * 60 * 60 * 1000);

  // Sanity: max duration 90 days
  const durationDays = (closingTime.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (durationDays > MARKET_DEFAULTS.MAX_DURATION_DAYS) {
    return null;
  }

  return {
    question,
    closingTime,
    resolutionTime,
    category: event.category,
    eventId: event.eventId,
    marketType: event.marketType,
    outcomes: event.outcomes,
    resolutionSource: event.resolutionSource,
  };
}
