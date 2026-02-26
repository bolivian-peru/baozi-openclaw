/**
 * Agent Recruiter Configuration
 */

export const config = {
  // Recruiter identity
  affiliateCode: process.env.AFFILIATE_CODE || 'AURORA',
  walletAddress: process.env.WALLET_ADDRESS || 'GpXHXs5KfzfXbNKcMLNbAMsJsgPsBE7y5GtwVoiuxYvH',

  // Baozi endpoints
  baoziApi: 'https://baozi.bet/api',
  baoziSkillUrl: 'https://baozi.bet/skill',
  mcpCommand: 'npx',
  mcpArgs: ['@baozi.bet/mcp-server@latest'],

  // AgentBook API
  agentBookApi: 'https://baozi.bet/api/agentbook',

  // Tracking DB
  dbPath: process.env.DB_PATH || './recruiter.db',

  // Outreach limits
  maxAgentsPerScan: 50,
  maxPostsPerRun: 3,

  // Recruitment stages
  stages: {
    DISCOVERED: 'discovered',
    CONTACTED: 'contacted',
    ONBOARDING: 'onboarding',
    PROFILE_CREATED: 'profile_created',
    AFFILIATE_REGISTERED: 'affiliate_registered',
    FIRST_BET: 'first_bet',
    ACTIVE: 'active',
  } as const,
};

export type RecruitmentStage = typeof config.stages[keyof typeof config.stages];
