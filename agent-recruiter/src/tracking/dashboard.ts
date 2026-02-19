import { RecruiterStats, RecruitedAgent } from '../types';

/**
 * Format the recruiter dashboard as a CLI-friendly string.
 * 
 * Shows:
 * - Overall stats (discovered, contacted, onboarded, active)
 * - Volume and earnings
 * - Top recruits
 * - Breakdown by source and status
 */
export function formatDashboard(stats: RecruiterStats): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║              🥟 BAOZI AGENT RECRUITER DASHBOARD             ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');

  // Overview
  lines.push('┌─────────────────── OVERVIEW ───────────────────┐');
  lines.push(`│  Discovered:     ${pad(stats.totalDiscovered)}                        │`);
  lines.push(`│  Contacted:      ${pad(stats.totalContacted)}                        │`);
  lines.push(`│  Onboarded:      ${pad(stats.totalOnboarded)}                        │`);
  lines.push(`│  Active:         ${pad(stats.totalActive)}                        │`);
  lines.push('├─────────────────── EARNINGS ───────────────────┤');
  lines.push(`│  Combined Volume:    ${padSol(stats.combinedVolume)} SOL             │`);
  lines.push(`│  Est. Earnings (1%): ${padSol(stats.estimatedEarnings)} SOL             │`);
  lines.push('└────────────────────────────────────────────────┘');
  lines.push('');

  // By Source
  lines.push('┌─────────── DISCOVERY SOURCES ──────────────────┐');
  for (const [source, count] of Object.entries(stats.bySource)) {
    if (count > 0) {
      lines.push(`│  ${padRight(source, 20)} ${pad(count)}                        │`);
    }
  }
  if (Object.values(stats.bySource).every(v => v === 0)) {
    lines.push('│  (no agents discovered yet)                    │');
  }
  lines.push('└────────────────────────────────────────────────┘');
  lines.push('');

  // By Status
  lines.push('┌─────────── ONBOARDING PIPELINE ────────────────┐');
  const statusEmoji: Record<string, string> = {
    discovered: '🔍',
    contacted: '📨',
    onboarding: '⚙️',
    'profile-created': '👤',
    'affiliate-registered': '🔗',
    'first-bet-placed': '🎯',
    active: '✅',
    inactive: '💤',
    failed: '❌',
  };
  for (const [status, count] of Object.entries(stats.byStatus)) {
    if (count > 0) {
      const emoji = statusEmoji[status] || '•';
      lines.push(`│  ${emoji} ${padRight(status, 22)} ${pad(count)}                  │`);
    }
  }
  if (Object.values(stats.byStatus).every(v => v === 0)) {
    lines.push('│  (pipeline empty)                              │');
  }
  lines.push('└────────────────────────────────────────────────┘');
  lines.push('');

  // Top Recruits
  if (stats.topRecruits.length > 0) {
    lines.push('┌─────────── TOP RECRUITS ──────────────────────┐');
    for (const agent of stats.topRecruits.slice(0, 5)) {
      const vol = agent.totalVolume.toFixed(2);
      const earn = agent.estimatedEarnings.toFixed(4);
      lines.push(`│  ${padRight(agent.name, 16)} Vol: ${padRight(vol, 8)} Earn: ${padRight(earn, 8)} │`);
    }
    lines.push('└────────────────────────────────────────────────┘');
  }

  lines.push('');
  lines.push('一笼包子，一桌人情 — one basket of buns, a whole table of affection.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format a single agent's profile for display
 */
export function formatAgentProfile(agent: RecruitedAgent): string {
  const lines: string[] = [];

  lines.push(`\n=== Agent: ${agent.name} ===`);
  lines.push(`ID:          ${agent.id}`);
  lines.push(`Type:        ${agent.type}`);
  lines.push(`Source:      ${agent.source}`);
  lines.push(`Status:      ${agent.status}`);
  lines.push(`Wallet:      ${agent.walletAddress || 'N/A'}`);
  lines.push(`Affiliate:   ${agent.affiliateCode || 'N/A'}`);
  lines.push(`Total Bets:  ${agent.totalBets}`);
  lines.push(`Volume:      ${agent.totalVolume.toFixed(2)} SOL`);
  lines.push(`Earnings:    ${agent.estimatedEarnings.toFixed(4)} SOL`);
  lines.push(`Discovered:  ${agent.discoveredAt}`);
  lines.push(`Onboarded:   ${agent.onboardedAt || 'N/A'}`);
  lines.push(`Last Active: ${agent.lastActivityAt || 'N/A'}`);

  if (agent.notes.length > 0) {
    lines.push(`\nNotes:`);
    for (const note of agent.notes.slice(-5)) {
      lines.push(`  • ${note}`);
    }
  }

  return lines.join('\n');
}

// Helpers
function pad(n: number, width: number = 4): string {
  return String(n).padStart(width);
}

function padSol(n: number): string {
  return n.toFixed(4).padStart(10);
}

function padRight(s: string, width: number): string {
  return s.padEnd(width);
}
