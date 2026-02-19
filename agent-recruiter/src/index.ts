/**
 * @baozi/agent-recruiter
 * 
 * AI Agent Recruiter for Baozi prediction markets.
 * Discovers, onboards, and tracks AI agents to trade.
 * 
 * Earns 1% lifetime affiliate commission on everything recruited agents do.
 */

export { AgentRecruiter } from './recruiter';
export { loadConfig, BAOZI } from './config';
export { BaoziMCPClient } from './mcp';
export { discoverAgents, createManualAgent, classifyAgentType, AGENT_DIRECTORIES } from './discovery';
export { initRecruitedAgent, generateOnboardingPackage, executeOnboardingFlow } from './onboarding';
export { generatePitch, generateAllPitches, listPitchTypes, getPitchVariants } from './outreach';
export { TrackingStore, formatDashboard, formatAgentProfile } from './tracking';
export * from './types';
