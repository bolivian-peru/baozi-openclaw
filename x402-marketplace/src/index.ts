/**
 * x402 Agent Intel Marketplace
 * 
 * Agent-to-agent marketplace for prediction market analysis,
 * powered by x402 micropayments and Baozi MCP.
 * 
 * @module @baozi/x402-marketplace
 */

// Core marketplace
export { AgentIntelMarketplace } from './marketplace';

// Agent implementations
export { AnalystAgent, BuyerAgent } from './agents';
export type { AnalystAgentConfig, BuyerAgentConfig } from './agents';

// x402 payment protocol
export { X402PaymentProtocol, X402Error, generateMockSignature } from './x402';

// Reputation system
export { ReputationTracker } from './reputation';

// Baozi MCP client
export { BaoziMCPClient } from './mcp';
export type { BaoziClientConfig } from './mcp';

// REST API
export { createServer } from './api';

// Types
export * from './types';
