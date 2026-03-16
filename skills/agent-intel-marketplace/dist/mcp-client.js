"use strict";
/**
 * Baozi MCP Client
 *
 * Interfaces with @baozi.bet/mcp-server for market data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMarkets = listMarkets;
exports.getMarket = getMarket;
exports.getQuote = getQuote;
exports.getPositions = getPositions;
exports.checkAffiliateCode = checkAffiliateCode;
exports.registerAffiliate = registerAffiliate;
exports.formatAffiliateLink = formatAffiliateLink;
exports.placeBet = placeBet;
exports.getAgentProfile = getAgentProfile;
exports.healthCheck = healthCheck;
const axios_1 = __importDefault(require("axios"));
const config = {
    serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000',
    apiKey: process.env.MCP_API_KEY
};
let client = null;
function getClient() {
    if (!client) {
        client = axios_1.default.create({
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
async function listMarkets(limit = 20) {
    try {
        const response = await getClient().post('/mcp/tools/call', {
            tool: 'list_markets',
            arguments: { limit }
        });
        return parseMarketResponse(response.data);
    }
    catch (error) {
        console.error('Failed to list markets:', error);
        return [];
    }
}
// Get market details
async function getMarket(marketAddress) {
    try {
        const response = await getClient().post('/mcp/tools/call', {
            tool: 'get_market',
            arguments: { marketAddress }
        });
        return parseMarketResponse(response.data)[0] || null;
    }
    catch (error) {
        console.error('Failed to get market:', error);
        return null;
    }
}
// Get market quote
async function getQuote(marketAddress) {
    try {
        const response = await getClient().post('/mcp/tools/call', {
            tool: 'get_quote',
            arguments: { marketAddress }
        });
        return parseQuoteResponse(response.data);
    }
    catch (error) {
        console.error('Failed to get quote:', error);
        return null;
    }
}
// Get user's positions
async function getPositions(walletAddress) {
    try {
        const response = await getClient().post('/mcp/tools/call', {
            tool: 'get_positions',
            arguments: { walletAddress }
        });
        return parsePositionsResponse(response.data);
    }
    catch (error) {
        console.error('Failed to get positions:', error);
        return [];
    }
}
// Check affiliate code
async function checkAffiliateCode(code) {
    try {
        const response = await getClient().post('/mcp/tools/call', {
            tool: 'check_affiliate_code',
            arguments: { code }
        });
        return response.data;
    }
    catch (error) {
        console.error('Failed to check affiliate code:', error);
        return { valid: false };
    }
}
// Register affiliate
async function registerAffiliate(walletAddress, code) {
    try {
        const response = await getClient().post('/mcp/tools/call', {
            tool: 'build_register_affiliate_transaction',
            arguments: { walletAddress, code }
        });
        return response.data;
    }
    catch (error) {
        console.error('Failed to register affiliate:', error);
        return { success: false };
    }
}
// Format affiliate link
function formatAffiliateLink(code, marketAddress) {
    const baseUrl = 'https://baozi.bet';
    if (marketAddress) {
        return `${baseUrl}/?ref=${code}&market=${marketAddress}`;
    }
    return `${baseUrl}/?ref=${code}`;
}
// Place bet via MCP
async function placeBet(marketAddress, side, amount, affiliateCode) {
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
    }
    catch (error) {
        console.error('Failed to place bet:', error);
        return { success: false };
    }
}
// Get agent profile
async function getAgentProfile(walletAddress) {
    try {
        const response = await axios_1.default.get(`https://api.baozi.bet/agents/profile/${walletAddress}`, { timeout: 10000 });
        return response.data;
    }
    catch (error) {
        console.error('Failed to get agent profile:', error);
        return null;
    }
}
// Parse responses from MCP server
function parseMarketResponse(data) {
    if (!data || !data.content)
        return [];
    try {
        const markets = data.content[0]?.text ? JSON.parse(data.content[0].text) : data;
        if (Array.isArray(markets)) {
            return markets.map((m) => ({
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
    }
    catch {
        // Return empty array on parse error
    }
    return [];
}
function parseQuoteResponse(data) {
    if (!data || !data.content)
        return null;
    try {
        const quote = data.content[0]?.text ? JSON.parse(data.content[0].text) : data;
        return {
            marketAddress: quote.marketAddress || quote.market_address || quote.address,
            yesPrice: quote.yesPrice || quote.yes_price || 0.5,
            noPrice: quote.noPrice || quote.no_price || 0.5,
            volume: quote.volume || 0
        };
    }
    catch {
        return null;
    }
}
function parsePositionsResponse(data) {
    if (!data || !data.content)
        return [];
    try {
        const positions = data.content[0]?.text ? JSON.parse(data.content[0].text) : data;
        if (Array.isArray(positions)) {
            return positions.map((p) => ({
                marketAddress: p.marketAddress || p.market_address || p.id,
                side: p.side === 'yes' ? 'YES' : 'NO',
                amount: p.amount || p.size || 0,
                entryPrice: p.entryPrice || p.entry_price || p.price || 0,
                currentValue: p.currentValue || p.current_value || p.amount || 0,
                pnl: p.pnl || 0
            }));
        }
    }
    catch {
        // Return empty array on parse error
    }
    return [];
}
// Health check
async function healthCheck() {
    try {
        const response = await getClient().get('/health', { timeout: 5000 });
        return response.status === 200;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=mcp-client.js.map