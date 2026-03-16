"use strict";
/**
 * MCP Server for Agent Intel Marketplace
 *
 * Exposes all marketplace functions as MCP tools
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const marketplace = __importStar(require("./index"));
// ============================================================================
// MCP TOOL DEFINITIONS
// ============================================================================
const TOOLS = [
    // Analyst operations
    {
        name: 'register_analyst',
        description: 'Register as an analyst agent to publish market analysis',
        inputSchema: {
            type: 'object',
            properties: {
                wallet: { type: 'string', description: 'Agent wallet address' },
                displayName: { type: 'string', description: 'Public display name' },
                affiliateCode: { type: 'string', description: 'Unique affiliate code (3-10 alphanumeric)' }
            },
            required: ['wallet', 'displayName', 'affiliateCode']
        }
    },
    {
        name: 'get_analyst_profile',
        description: 'Get analyst profile with reputation stats',
        inputSchema: {
            type: 'object',
            properties: {
                wallet: { type: 'string', description: 'Analyst wallet address' }
            },
            required: ['wallet']
        }
    },
    {
        name: 'get_leaderboard',
        description: 'Get top analysts by accuracy',
        inputSchema: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Number of analysts to return (default 10)' }
            }
        }
    },
    // Publish analysis
    {
        name: 'publish_analysis',
        description: 'Publish market analysis behind x402 paywall',
        inputSchema: {
            type: 'object',
            properties: {
                analystWallet: { type: 'string', description: 'Analyst wallet address' },
                marketAddress: { type: 'string', description: 'Target market address' },
                marketQuestion: { type: 'string', description: 'Market question' },
                thesis: { type: 'string', description: 'Full analysis (200-2000 chars)' },
                recommendedSide: { type: 'string', enum: ['YES', 'NO'], description: 'Recommended side' },
                confidence: { type: 'number', description: 'Confidence 1-100' },
                priceSol: { type: 'number', description: 'Price in SOL' }
            },
            required: ['analystWallet', 'marketAddress', 'marketQuestion', 'thesis', 'recommendedSide', 'confidence', 'priceSol']
        }
    },
    {
        name: 'get_my_analyses',
        description: 'Get my published analyses',
        inputSchema: {
            type: 'object',
            properties: {
                wallet: { type: 'string', description: 'Analyst wallet address' }
            },
            required: ['wallet']
        }
    },
    // Discover & Purchase
    {
        name: 'list_intel',
        description: 'List available analyses for a market',
        inputSchema: {
            type: 'object',
            properties: {
                marketAddress: { type: 'string', description: 'Market address' }
            },
            required: ['marketAddress']
        }
    },
    {
        name: 'get_payment_request',
        description: 'Get x402 payment request for analysis',
        inputSchema: {
            type: 'object',
            properties: {
                analysisId: { type: 'string', description: 'Analysis ID' },
                buyerWallet: { type: 'string', description: 'Buyer wallet address' }
            },
            required: ['analysisId', 'buyerWallet']
        }
    },
    {
        name: 'purchase_intel',
        description: 'Purchase analysis via x402 payment',
        inputSchema: {
            type: 'object',
            properties: {
                analysisId: { type: 'string', description: 'Analysis ID' },
                buyerWallet: { type: 'string', description: 'Buyer wallet address' },
                amountSol: { type: 'number', description: 'Amount in SOL' },
                txId: { type: 'string', description: 'Transaction ID (optional for simulation)' }
            },
            required: ['analysisId', 'buyerWallet', 'amountSol']
        }
    },
    {
        name: 'get_my_purchases',
        description: 'Get purchased analyses',
        inputSchema: {
            type: 'object',
            properties: {
                wallet: { type: 'string', description: 'Buyer wallet address' }
            },
            required: ['wallet']
        }
    },
    // Betting
    {
        name: 'bet_with_intel',
        description: 'Place bet using purchased intel with affiliate code',
        inputSchema: {
            type: 'object',
            properties: {
                marketAddress: { type: 'string', description: 'Market address' },
                side: { type: 'string', enum: ['YES', 'NO'], description: 'Bet side' },
                amount: { type: 'number', description: 'Bet amount in SOL' },
                analysisId: { type: 'string', description: 'Analysis ID used for decision' }
            },
            required: ['marketAddress', 'side', 'amount', 'analysisId']
        }
    },
    // Market data
    {
        name: 'list_markets',
        description: 'List active prediction markets',
        inputSchema: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Number of markets (default 20)' }
            }
        }
    },
    {
        name: 'get_market',
        description: 'Get market details',
        inputSchema: {
            type: 'object',
            properties: {
                marketAddress: { type: 'string', description: 'Market address' }
            },
            required: ['marketAddress']
        }
    },
    {
        name: 'get_quote',
        description: 'Get current market quote',
        inputSchema: {
            type: 'object',
            properties: {
                marketAddress: { type: 'string', description: 'Market address' }
            },
            required: ['marketAddress']
        }
    }
];
// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================
class IntelMarketplaceServer {
    constructor() {
        this.server = new index_js_1.Server({
            name: 'agent-intel-marketplace',
            version: '1.0.0'
        }, {
            capabilities: {
                tools: {}
            }
        });
        this.setupHandlers();
    }
    setupHandlers() {
        // List tools
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return { tools: TOOLS };
        });
        // Call tool
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                let result;
                switch (name) {
                    // Analyst operations
                    case 'register_analyst':
                        result = await marketplace.registerAnalyst(args.wallet, args.displayName, args.affiliateCode);
                        break;
                    case 'get_analyst_profile':
                        result = marketplace.getAnalystProfile(args.wallet);
                        break;
                    case 'get_leaderboard':
                        result = marketplace.getLeaderboard(args.limit || 10);
                        break;
                    // Publish
                    case 'publish_analysis':
                        result = await marketplace.publishAnalysis(args.analystWallet, args.marketAddress, args.marketQuestion, args.thesis, args.recommendedSide, args.confidence, args.priceSol);
                        break;
                    case 'get_my_analyses':
                        result = marketplace.getMyAnalyses(args.wallet);
                        break;
                    // Discover & Purchase
                    case 'list_intel':
                        result = marketplace.listIntel(args.marketAddress);
                        break;
                    case 'get_payment_request':
                        result = await marketplace.getPaymentRequest(args.analysisId, args.buyerWallet);
                        break;
                    case 'purchase_intel':
                        result = await marketplace.purchaseIntel({
                            to: '',
                            amount: args.amountSol,
                            asset: 'SOL',
                            description: '',
                            data: { analysisId: args.analysisId, marketAddress: '' }
                        }, args.buyerWallet, args.txId);
                        break;
                    case 'get_my_purchases':
                        result = marketplace.getMyPurchases(args.wallet);
                        break;
                    // Betting
                    case 'bet_with_intel':
                        result = await marketplace.betWithIntel(args.marketAddress, args.side, args.amount, args.analysisId);
                        break;
                    // Market data
                    case 'list_markets':
                        result = await marketplace.listMarkets(args.limit || 20);
                        break;
                    case 'get_market':
                        result = await marketplace.getMarketInfo(args.marketAddress);
                        break;
                    case 'get_quote':
                        result = await marketplace.getMarketQuote(args.marketAddress);
                        break;
                    default:
                        return {
                            content: [{
                                    type: 'text',
                                    text: JSON.stringify({ error: `Unknown tool: ${name}` })
                                }],
                            isError: true
                        };
                }
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
                        }],
                    isError: true
                };
            }
        });
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('Agent Intel Marketplace MCP Server running');
    }
}
// Run server
const server = new IntelMarketplaceServer();
server.run().catch(console.error);
//# sourceMappingURL=mcp-server.js.map