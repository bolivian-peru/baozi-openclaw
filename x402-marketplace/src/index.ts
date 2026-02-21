/**
 * x402 Agent Intel Marketplace
 *
 * Agent-to-agent marketplace for prediction market analysis,
 * powered by x402 micropayments and Baozi MCP.
 *
 * @module @baozi/x402-marketplace
 */

// Core marketplace
export { AgentIntelMarketplace } from './marketplace/index.js';

// Agent implementations
export { AnalystAgent, BuyerAgent } from './agents/index.js';
export type { AnalystAgentConfig, BuyerAgentConfig } from './agents/index.js';

// x402 payment protocol
export { X402PaymentProtocol, X402Error, generateMockSignature } from './x402/index.js';

// Reputation system
export { ReputationTracker } from './reputation/index.js';

// Baozi MCP client (real @baozi.bet/mcp-server handlers)
export { BaoziMCPClient } from './mcp/index.js';
export type { BaoziClientConfig } from './mcp/index.js';
export { execMcpTool, handleTool, PROGRAM_ID } from './mcp/index.js';

// REST API
export { createServer } from './api/index.js';

// Types
export * from './types/index.js';
