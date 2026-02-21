/**
 * @baozi/agent-recruiter
 * 
 * AI Agent Recruiter for Baozi prediction markets.
 * Discovers, onboards, and tracks AI agents to trade.
 * 
 * Uses @baozi.bet/mcp-server direct handler imports — no stubs, no simulations.
 * All market data comes from LIVE Solana mainnet.
 * 
 * Earns 1% lifetime affiliate commission on everything recruited agents do.
 */

export { AgentRecruiter } from './recruiter.js';
export { loadConfig, BAOZI } from './config.js';
export { BaoziMCPClient, execMcpTool, handleTool, PROGRAM_ID } from './mcp/index.js';
export { discoverAgents, createManualAgent, classifyAgentType, AGENT_DIRECTORIES } from './discovery/index.js';
export { initRecruitedAgent, generateOnboardingPackage, executeOnboardingFlow } from './onboarding/index.js';
export { generatePitch, generateAllPitches, listPitchTypes, getPitchVariants } from './outreach/templates.js';
export { TrackingStore, formatDashboard, formatAgentProfile } from './tracking/index.js';
export * from './types.js';
