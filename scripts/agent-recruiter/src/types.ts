export type Persona = "builder" | "community" | "content" | "quant" | "operator";

export type AgentStatus = "discovered" | "pitched" | "onboarding" | "active" | "inactive";

export type OnboardingStage = "none" | "intake" | "compliance" | "activation" | "live";

export interface AffiliateLinkRecord {
  code: string;
  url: string;
  generatedAt: string;
  checkedAt?: string;
  isValid?: boolean;
  lastError?: string;
}

export interface OnboardingChecklist {
  intakeComplete: boolean;
  complianceComplete: boolean;
  affiliateIssued: boolean;
  affiliateValidated: boolean;
  activated: boolean;
}

export interface OnboardingState {
  stage: OnboardingStage;
  checklist: OnboardingChecklist;
  affiliate?: AffiliateLinkRecord;
  completedAt?: string;
}

export interface OutreachState {
  templateId: string;
  channel: string;
  generatedAt: string;
  response: "none" | "positive" | "negative";
}

export interface AgentCandidate {
  id: string;
  handle: string;
  persona: Persona;
  channel: "x" | "telegram" | "discord" | "youtube" | "github";
  region: string;
  audienceSize: number;
  engagementRate: number;
  discoverySource: string;
  fitNotes: string[];
  score: number;
  status: AgentStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  outreach?: OutreachState;
  onboarding: OnboardingState;
}

export interface RepositoryState {
  version: number;
  updatedAt: string;
  agents: AgentCandidate[];
}

export interface DiscoverySignal {
  handle: string;
  persona: Persona;
  channel: AgentCandidate["channel"];
  region: string;
  audienceSize: number;
  engagementRate: number;
  discoverySource: string;
  fitNotes: string[];
  tags: string[];
}

export interface DiscoveryResult {
  discoveredAt: string;
  candidates: AgentCandidate[];
  skippedHandles: string[];
}

export interface OutreachTemplate {
  id: string;
  persona: Persona;
  subject: string;
  body: string;
}

export interface FunnelMetrics {
  totalAgents: number;
  discovered: number;
  pitched: number;
  onboarding: number;
  active: number;
  inactive: number;
  pitchRate: number;
  onboardingRate: number;
  activationRate: number;
}
