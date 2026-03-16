/**
 * Baozi MCP Client
 * 
 * Interfaces with @baozi.bet/mcp-server for market data
 */

import axios, { AxiosInstance } from 'axios';
import { Market, Quote, Position } from './types';

interface MCPConfig {
  serverUrl: string;
  apiKey?: string;
}

const config: MCPConfig = {
  serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000',
  apiKey: process.env.MCP_API_KEY
};

let client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      baseURL: config.serverUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
  }
  return client;
}

// List available markets
export async function listMarkets(limit = 20): Promise<Market[]> {
  try {
    const response = await getClient().post('/mcp/tools/call', {
      tool: 'list_markets',
      arguments: { limit }
    });
    
    return parseMarketResponse(response.data);
  } catch (error) {
    console.error('Failed to list markets:', error);
    return [];
  }
}

// Get market details
export async function getMarket(marketAddress: string): Promise<Market | null> {
  try {
    const response = await getClient().post('/mcp/tools/call', {
      tool: 'get_market',
      arguments: { marketAddress }
    });
    
    return parseMarketResponse(response.data)[0] || null;
  } catch (error) {
    console.error('Failed to get market:', error);
    return null;
  }
}

// Get market quote
export async function getQuote(marketAddress: string): Promise<Quote | null> {
  try {
    const response = await getClient().post('/mcp/tools/call', {
      tool: 'get_quote',
      arguments: { marketAddress }
    });
    
    return parseQuoteResponse(response.data);
  } catch (error) {
    console.error('Failed to get quote:', error);
    return null;
  }
}

// Get user's positions
export async function getPositions(walletAddress: string): Promise<Position[]> {
  try {
    const response = await getClient().post('/mcp/tools/call', {
      tool: 'get_positions',
      arguments: { walletAddress }
    });
    
    return parsePositionsResponse(response.data);
  } catch (error) {
    console.error('Failed to get positions:', error);
    return [];
  }
}

// Check affiliate code
export async function checkAffiliateCode(code: string): Promise<{ valid: boolean; wallet?: string }> {
  try {
    const response = await getClient().post('/mcp/tools/call', {
      tool: 'check_affiliate_code',
      arguments: { code }
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to check affiliate code:', error);
    return { valid: false };
  }
}

// Register affiliate
export async function registerAffiliate(
  walletAddress: string,
  code: string
): Promise<{ success: boolean; txId?: string }> {
  try {
    const response = await getClient().post('/mcp/tools/call', {
      tool: 'build_register_affiliate_transaction',
      arguments: { walletAddress, code }
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to register affiliate:', error);
    return { success: false };
  }
}

// Format affiliate link
export function formatAffiliateLink(code: string, marketAddress?: string): string {
  const baseUrl = 'https://baozi.bet';
  if (marketAddress) {
    return `${baseUrl}/?ref=${code}&market=${marketAddress}`;
  }
  return `${baseUrl}/?ref=${code}`;
}

// Place bet via MCP
export async function placeBet(
  marketAddress: string,
  side: 'YES' | 'NO',
  amount: number,
  affiliateCode?: string
): Promise<{ success: boolean; txId?: string }> {
  try {
    const response = await getClient().post('/mcp/tools/call', {
      tool: 'place_bet',
      arguments: {
        marketAddress,
        side,
        amount,
        ...(affiliateCode && { affiliateCode })
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to place bet:', error);
    return { success: false };
  }
}

// Get agent profile
export async function getAgentProfile(walletAddress: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://api.baozi.bet/agents/profile/${walletAddress}`,
      { timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to get agent profile:', error);
    return null;
  }
}

// Parse responses from MCP server
function parseMarketResponse(data: any): Market[] {
  if (!data || !data.content) return [];
  
  try {
    const markets = data.content[0]?.text ? JSON.parse(data.content[0].text) : data;
    if (Array.isArray(markets)) {
      return markets.map((m: any) => ({
        address: m.address || m.marketAddress || m.id,
        question: m.question || m.title,
        description: m.description || '',
        volume: m.volume || m.volume24h || 0,
        yesPrice: m.yesPrice || m.yes_price || m.price || 0.5,
        noPrice: m.noPrice || m.no_price || (1 - (m.yesPrice || m.yes_price || m.price || 0.5)),
        endDate: m.endDate || m.end_date || m.resolutionDate,
        resolved: m.resolved || false,
        outcome: m.outcome || null
      }));
    }
  } catch {
    // Return empty array on parse error
  }
  return [];
}

function parseQuoteResponse(data: any): Quote | null {
  if (!data || !data.content) return null;
  
  try {
    const quote = data.content[0]?.text ? JSON.parse(data.content[0].text) : data;
    return {
      marketAddress: quote.marketAddress || quote.market_address || quote.address,
      yesPrice: quote.yesPrice || quote.yes_price || 0.5,
      noPrice: quote.noPrice || quote.no_price || 0.5,
      volume: quote.volume || 0
    };
  } catch {
    return null;
  }
}

function parsePositionsResponse(data: any): Position[] {
  if (!data || !data.content) return [];
  
  try {
    const positions = data.content[0]?.text ? JSON.parse(data.content[0].text) : data;
    if (Array.isArray(positions)) {
      return positions.map((p: any) => ({
        marketAddress: p.marketAddress || p.market_address || p.id,
        side: p.side === 'yes' ? 'YES' : 'NO',
        amount: p.amount || p.size || 0,
        entryPrice: p.entryPrice || p.entry_price || p.price || 0,
        currentValue: p.currentValue || p.current_value || p.amount || 0,
        pnl: p.pnl || 0
      }));
    }
  } catch {
    // Return empty array on parse error
  }
  return [];
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await getClient().get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}
