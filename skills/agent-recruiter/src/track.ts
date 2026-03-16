/**
 * Tracking Module
 * 
 * Tracks recruited agents, their activity, and affiliate earnings
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { RecruitedAgent, TrackingData, DEFAULT_CONFIG } from './config.ts';

/**
 * Load tracking data from file
 */
export function loadTrackingData(filepath?: string): TrackingData {
  const file = filepath || DEFAULT_CONFIG.trackingFile;
  
  if (!existsSync(file)) {
    return {
      recruiterCode: DEFAULT_CONFIG.affiliateCode,
      totalRecruited: 0,
      activeAgents: 0,
      totalVolume: 0,
      totalEarnings: 0,
      recruitedAgents: [],
      lastUpdated: new Date()
    };
  }
  
  try {
    const data = readFileSync(file, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      lastUpdated: new Date(parsed.lastUpdated)
    };
  } catch (error) {
    console.error('Error loading tracking data:', error);
    return {
      recruiterCode: DEFAULT_CONFIG.affiliateCode,
      totalRecruited: 0,
      activeAgents: 0,
      totalVolume: 0,
      totalEarnings: 0,
      recruitedAgents: [],
      lastUpdated: new Date()
    };
  }
}

/**
 * Save tracking data to file
 */
export function saveTrackingData(data: TrackingData, filepath?: string): void {
  const file = filepath || DEFAULT_CONFIG.trackingFile;
  
  data.lastUpdated = new Date();
  
  writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`💾 Tracking data saved to ${file}`);
}

/**
 * Add a new recruited agent
 */
export function addRecruitedAgent(
  data: TrackingData,
  agent: RecruitedAgent
): TrackingData {
  const existingIndex = data.recruitedAgents.findIndex(a => a.id === agent.id);
  
  if (existingIndex >= 0) {
    // Update existing
    data.recruitedAgents[existingIndex] = {
      ...data.recruitedAgents[existingIndex],
      ...agent
    };
  } else {
    // Add new
    data.recruitedAgents.push(agent);
  }
  
  data.totalRecruited = data.recruitedAgents.length;
  data.activeAgents = data.recruitedAgents.filter(a => a.status === 'active').length;
  
  return data;
}

/**
 * Update agent status
 */
export function updateAgentStatus(
  data: TrackingData,
  agentId: string,
  status: RecruitedAgent['status']
): TrackingData {
  const agent = data.recruitedAgents.find(a => a.id === agentId);
  
  if (agent) {
    agent.status = status;
    data.activeAgents = data.recruitedAgents.filter(a => a.status === 'active').length;
  }
  
  return data;
}

/**
 * Record agent's first bet
 */
export function recordFirstBet(
  data: TrackingData,
  agentId: string,
  amount: number
): TrackingData {
  const agent = data.recruitedAgents.find(a => a.id === agentId);
  
  if (agent) {
    agent.firstBetAt = new Date();
    agent.firstBetAmount = amount;
    agent.totalVolume = (agent.totalVolume || 0) + amount;
    
    if (agent.status === 'onboarding') {
      agent.status = 'active';
    }
    
    data.activeAgents = data.recruitedAgents.filter(a => a.status === 'active').length;
    data.totalVolume = data.recruitedAgents.reduce((sum, a) => sum + (a.totalVolume || 0), 0);
  }
  
  return data;
}

/**
 * Update earnings (called when affiliate commissions are received)
 */
export function updateEarnings(
  data: TrackingData,
  agentId: string,
  earnings: number
): TrackingData {
  const agent = data.recruitedAgents.find(a => a.id === agentId);
  
  if (agent) {
    agent.totalEarnings = (agent.totalEarnings || 0) + earnings;
    data.totalEarnings = data.recruitedAgents.reduce((sum, a) => sum + (a.totalEarnings || 0), 0);
  }
  
  return data;
}

/**
 * Display tracking dashboard
 */
export function displayDashboard(data: TrackingData): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 AGENT RECRUITER - TRACKING DASHBOARD');
  console.log('='.repeat(60));
  console.log(`\n🎯 Recruiter Code: ${data.recruiterCode}`);
  console.log(`\n📈 Statistics:`);
  console.log(`   Total Recruited: ${data.totalRecruited}`);
  console.log(`   Active Agents:  ${data.activeAgents}`);
  console.log(`   Total Volume:   ${data.totalVolume.toFixed(2)} SOL`);
  console.log(`   Total Earnings: ${data.totalEarnings.toFixed(4)} SOL`);
  
  console.log(`\n👥 Recruited Agents:`);
  console.log('-'.repeat(60));
  
  if (data.recruitedAgents.length === 0) {
    console.log('   No agents recruited yet.');
  } else {
    for (const agent of data.recruitedAgents) {
      const statusEmoji = {
        discovered: '🔍',
        contacted: '📧',
        onboarding: '⚙️',
        active: '✅'
      }[agent.status] || '❓';
      
      console.log(`\n   ${statusEmoji} ${agent.name}`);
      console.log(`      Framework: ${agent.framework}`);
      console.log(`      Affiliate Code: ${agent.affiliateCode}`);
      console.log(`      Status: ${agent.status}`);
      console.log(`      First Bet: ${agent.firstBetAmount ? `${agent.firstBetAmount} SOL` : 'Not yet'}`);
      console.log(`      Total Volume: ${agent.totalVolume ? `${agent.totalVolume.toFixed(2)} SOL` : '0 SOL'}`);
      console.log(`      Earnings: ${agent.totalEarnings ? `${agent.totalEarnings.toFixed(4)} SOL` : '0 SOL'}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Last Updated: ${data.lastUpdated.toISOString()}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Get top performing agents
 */
export function getTopAgents(data: TrackingData, limit: number = 5): RecruitedAgent[] {
  return [...data.recruitedAgents]
    .sort((a, b) => (b.totalVolume || 0) - (a.totalVolume || 0))
    .slice(0, limit);
}

/**
 * Calculate projected earnings
 */
export function calculateProjectedEarnings(data: TrackingData): {
  weekly: number;
  monthly: number;
  yearly: number;
} {
  // Assume average volume per agent per week
  const avgVolumePerAgent = 5; // SOL/week
  const commissionRate = 0.01; // 1%
  
  const weekly = data.activeAgents * avgVolumePerAgent * commissionRate;
  const monthly = weekly * 4;
  const yearly = weekly * 52;
  
  return { weekly, monthly, yearly };
}
