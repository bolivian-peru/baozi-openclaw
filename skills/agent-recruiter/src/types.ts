export interface RecruitedAgent {
  id: number;
  agentId: string;       // external agent ID (from AgentNet/other source)
  name: string;
  platform: string;      // agentnet, elizaos, langchain, twitter, manual
  endpoint: string;      // how to reach the agent
  wallet: string | null;
  affiliateCode: string | null;
  status: RecruitStatus;
  pitchType: string;     // which template was used
  discoveredAt: string;
  onboardedAt: string | null;
  firstBetAt: string | null;
}

export type RecruitStatus =
  | 'discovered'    // found but not contacted
  | 'contacted'     // pitch sent
  | 'onboarding'    // in setup process
  | 'onboarded'     // profile + affiliate created
  | 'active';       // placed first bet

export interface OnboardingStep {
  step: number;
  name: string;
  instruction: string;
  mcpTool: string;
  completed: boolean;
}

export interface RecruiterStats {
  totalDiscovered: number;
  totalContacted: number;
  totalOnboarded: number;
  totalActive: number;
  conversionRate: number;
}

export interface PitchTemplate {
  id: string;
  name: string;
  targetType: string;
  subject: string;
  body: string;
}
