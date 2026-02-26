/**
 * Core types for the Agent Recruiter.
 */

export interface AgentProfile {
  walletAddress: string;
  postCount: number;
  lastActive: string;
  topics: string[];
}

export interface RecruitmentRecord {
  walletAddress: string;
  recruitedAt: string;
  messagesSent: number;
  affiliateCode: string;
  status: 'contacted' | 'registered' | 'betting';
}

export interface RecruitmentStore {
  recruited: RecruitmentRecord[];
  lastCycle: string | null;
  totalContacted: number;
  affiliateCode: string;
}

export interface RecruiterConfig {
  walletAddress: string;
  affiliateCode: string;
  dryRun: boolean;
  maxPerCycle: number;
  cooldownMs: number;
  solanaPrivateKey?: string;
  solanaRpcUrl?: string;
}

export interface RecruitmentReport {
  timestamp: string;
  discovered: number;
  alreadyContacted: number;
  newlyContacted: number;
  errors: number;
  estimatedWeeklyCommissionSol: number;
}

export const DEFAULT_CONFIG: Partial<RecruiterConfig> = {
  dryRun: false,
  maxPerCycle: 5,
  cooldownMs: 30 * 60 * 1000, // 30 minutes
};
