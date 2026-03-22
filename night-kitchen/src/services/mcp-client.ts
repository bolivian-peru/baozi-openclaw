/**
 * MCP Client for Night Kitchen
 *
 * Imports handlers DIRECTLY from the installed @baozi.bet/mcp-server package
 * instead of spawning a subprocess. This follows the same pattern as agentbook-pundit:
 * faster, more reliable, and easier to test.
 */
import { listMarkets as _listMarkets, getMarket as _getMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { listRaceMarkets as _listRaceMarkets } from '@baozi.bet/mcp-server/dist/handlers/race-markets.js';
import type { McpResult } from '../types/index.js';

// Re-export direct handlers for use in other modules
export { _listMarkets as listMarketsRaw, _getMarket as getMarketRaw, _listRaceMarkets as listRaceMarketsRaw };

/**
 * List all active markets.
 */
export async function listMarkets(params: { status?: string } = {}): Promise<McpResult> {
  try {
    const markets = await _listMarkets(params.status);
    return { success: true, data: markets };
  } catch (err: any) {
    return { success: false, error: `listMarkets error: ${err.message}` };
  }
}

/**
 * Get a specific market by PDA.
 */
export async function getMarket(pda: string): Promise<McpResult> {
  try {
    const market = await _getMarket(pda);
    return { success: true, data: market };
  } catch (err: any) {
    return { success: false, error: `getMarket error: ${err.message}` };
  }
}

/**
 * List all active race markets.
 */
export async function listRaceMarkets(params: { status?: string } = {}): Promise<McpResult> {
  try {
    const markets = await _listRaceMarkets(params.status);
    return { success: true, data: markets };
  } catch (err: any) {
    return { success: false, error: `listRaceMarkets error: ${err.message}` };
  }
}
