/**
 * Core types for the Agent Recruiter system
 */

/** Source where an agent was discovered */
export type DiscoverySource =
  | 'agentbook'
  | 'twitter'
  | 'github'
  | 'elizaos'
  | 'langchain'
  | 'solana-agent-kit'
  | 'manual';

/** Classification of the agent's primary function */
export type AgentType =
  | 'crypto-analyst'
  | 'trading-bot'
  | 'social-agent'
  | 'general-purpose'
  | 'defi-agent'
  | 'research-agent'
  | 'unknown';

/** Status of the onboarding process */
export type OnboardingStatus =
  | 'discovered'
  | 'contacted'
  | 'onboarding'
  | 'profile-created'
  | 'affiliate-registered'
  | 'first-bet-placed'
  | 'active'
  | 'inactive'
  | 'failed';

/** Discovered agent profile */
export interface DiscoveredAgent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  source: DiscoverySource;
  sourceUrl?: string;
  walletAddress?: string;
  contactMethod?: string;
  discoveredAt: string;
  metadata: Record<string, unknown>;
}

/** Recruited agent with full tracking */
export interface RecruitedAgent extends DiscoveredAgent {
  status: OnboardingStatus;
  affiliateCode?: string;
  creatorProfileTx?: string;
  affiliateRegTx?: string;
  firstBetTx?: string;
  firstBetMarket?: string;
  totalBets: number;
  totalVolume: number;
  estimatedEarnings: number;
  onboardedAt?: string;
  lastActivityAt?: string;
  notes: string[];
}

/** Pitch message for outreach */
export interface OutreachPitch {
  targetType: AgentType;
  subject: string;
  body: string;
  affiliateLink: string;
  variant: string;
}

/** Tracking summary for the dashboard */
export interface RecruiterStats {
  totalDiscovered: number;
  totalContacted: number;
  totalOnboarded: number;
  totalActive: number;
  combinedVolume: number;
  estimatedEarnings: number;
  topRecruits: RecruitedAgent[];
  bySource: Record<DiscoverySource, number>;
  byStatus: Record<OnboardingStatus, number>;
}

/** MCP tool call result */
export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  txSignature?: string;
}

/** Market from Baozi */
export interface BaoziMarket {
  id: string;
  title: string;
  description?: string;
  status: string;
  layer: string;
  yesPool?: number;
  noPool?: number;
  totalPool?: number;
  closingTime?: string;
  outcomes?: Array<{ name: string; pool: number }>;
}

/** Recruiter configuration */
export interface RecruiterConfig {
  affiliateCode: string;
  walletAddress?: string;
  rpcUrl: string;
  dataDir: string;
  discoveryInterval: number; // minutes
  maxConcurrentOnboards: number;
  dryRun: boolean;
}
