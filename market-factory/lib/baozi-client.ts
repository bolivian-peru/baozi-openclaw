/**
 * Baozi Client
 * 
 * Interacts with Baozi.bet API and Solana program for:
 * - Listing existing markets (duplicate detection)
 * - Creating Lab markets
 * - Closing and resolving markets
 * 
 * Uses the MCP server API endpoints where available,
 * falling back to direct Solana RPC for on-chain operations.
 */

import { BAOZI_API_BASE, SOLANA_RPC_URL, BAOZI_PROGRAM_ID } from './config.js';
import type { ExistingMarket, MarketCreateParams, MarketCreateResult } from './types.js';

// =============================================================================
// Market Listing (for duplicate detection)
// =============================================================================

/**
 * Fetch all active Lab markets from Baozi API
 */
export async function listActiveMarkets(): Promise<ExistingMarket[]> {
  try {
    // Try the Baozi HTTP API first (faster, indexed)
    const resp = await fetch(`${BAOZI_API_BASE}/markets?status=Active&layer=Lab`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (resp.ok) {
      const data = await resp.json() as { markets?: ExistingMarket[] };
      return data.markets || [];
    }

    // Fallback: try the MCP-style endpoint
    const mcpResp = await fetch(`${BAOZI_API_BASE}/mcp/tools/list_markets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ status: 'Active', layer: 'Lab' }),
      signal: AbortSignal.timeout(15000),
    });

    if (mcpResp.ok) {
      const data = await mcpResp.json() as { content?: { text: string }[] };
      if (data.content?.[0]?.text) {
        const parsed = JSON.parse(data.content[0].text);
        return parsed.markets || [];
      }
    }

    console.warn('[BaoziClient] Could not fetch markets from API, returning empty list');
    return [];
  } catch (err) {
    console.warn('[BaoziClient] Market list fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Check if a similar market already exists
 * Uses fuzzy matching on question text
 */
export function isDuplicateMarket(
  question: string,
  existingMarkets: ExistingMarket[]
): boolean {
  const normalizedQuestion = normalizeQuestion(question);

  for (const market of existingMarkets) {
    const normalizedExisting = normalizeQuestion(market.question);

    // Exact match
    if (normalizedQuestion === normalizedExisting) return true;

    // High similarity (>80% word overlap)
    const similarity = wordSimilarity(normalizedQuestion, normalizedExisting);
    if (similarity > 0.80) return true;
  }

  return false;
}

function normalizeQuestion(q: string): string {
  return q.toLowerCase()
    .replace(/[?!.,;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

// =============================================================================
// Market Creation
// =============================================================================

/**
 * Create a Lab market on Baozi using the MCP server API
 * 
 * This builds the transaction server-side. The transaction
 * still needs to be signed and submitted.
 */
export async function createLabMarket(params: MarketCreateParams): Promise<MarketCreateResult> {
  try {
    // Use MCP endpoint to build the creation transaction
    const resp = await fetch(`${BAOZI_API_BASE}/mcp/tools/build_create_lab_market_transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        question: params.question,
        closingTime: params.closingTime.toISOString(),
        resolutionTime: params.resolutionTime.toISOString(),
        creatorWallet: process.env.SOLANA_PUBLIC_KEY || '',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return {
        success: false,
        error: `API error ${resp.status}: ${errorText}`,
      };
    }

    const data = await resp.json() as {
      content?: { text: string }[];
      marketId?: string;
      marketAddress?: string;
      transaction?: string;
    };

    // Parse response
    if (data.marketId || data.marketAddress) {
      return {
        success: true,
        marketId: data.marketId,
        marketAddress: data.marketAddress,
        txSignature: data.transaction,
      };
    }

    // MCP-style response
    if (data.content?.[0]?.text) {
      const parsed = JSON.parse(data.content[0].text);
      return {
        success: true,
        marketId: parsed.marketId,
        marketAddress: parsed.marketPda || parsed.marketAddress,
        txSignature: parsed.transaction || parsed.txSignature,
      };
    }

    return {
      success: false,
      error: 'Unexpected API response format',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Preview market creation (dry run - validates without creating)
 */
export async function previewMarketCreation(params: MarketCreateParams): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedCostSol: number;
}> {
  try {
    const resp = await fetch(`${BAOZI_API_BASE}/mcp/tools/preview_market_creation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        question: params.question,
        closingTime: params.closingTime.toISOString(),
        resolutionTime: params.resolutionTime.toISOString(),
        layer: 'lab',
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (resp.ok) {
      const data = await resp.json() as any;
      const parsed = data.content?.[0]?.text ? JSON.parse(data.content[0].text) : data;
      return {
        valid: parsed.validation?.valid ?? true,
        errors: parsed.validation?.errors || [],
        warnings: parsed.validation?.warnings || [],
        estimatedCostSol: parsed.totalCostSol || 0.015,
      };
    }

    // If API not available, do local validation
    return localValidation(params);
  } catch {
    return localValidation(params);
  }
}

function localValidation(params: MarketCreateParams): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedCostSol: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (params.question.length < 10) errors.push('Question too short (min 10 chars)');
  if (params.question.length > 200) errors.push('Question too long (max 200 chars)');
  if (!params.question.endsWith('?')) warnings.push('Question should end with ?');

  const now = new Date();
  if (params.closingTime <= now) errors.push('Closing time must be in the future');
  if (params.resolutionTime <= params.closingTime) errors.push('Resolution time must be after closing time');

  const minFuture = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  if (params.closingTime < minFuture) errors.push('Closing time must be at least 1 hour in the future');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    estimatedCostSol: 0.015,
  };
}

// =============================================================================
// Market Resolution
// =============================================================================

/**
 * Close a market (permissionless - anyone can call after closing time)
 */
export async function closeMarket(marketAddress: string): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch(`${BAOZI_API_BASE}/mcp/tools/build_close_market_transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        marketPublicKey: marketAddress,
        signerWallet: process.env.SOLANA_PUBLIC_KEY || '',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      return { success: false, error: `API error: ${resp.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Propose resolution for a market
 */
export async function resolveMarket(
  marketAddress: string,
  outcome: 'yes' | 'no'
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch(`${BAOZI_API_BASE}/mcp/tools/build_propose_resolution_transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        marketPublicKey: marketAddress,
        outcome: outcome === 'yes' ? 2 : 3, // MARKET_OUTCOME enum
        signerWallet: process.env.SOLANA_PUBLIC_KEY || '',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      return { success: false, error: `API error: ${resp.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
