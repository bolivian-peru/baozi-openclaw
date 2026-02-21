#!/usr/bin/env ts-node
/**
 * Trust Proof Explorer - Verifiable Oracle Transparency Dashboard
 * 
 * Fetches resolution proofs from Baozi API and displays them in a 
 * beautiful, verifiable format showcasing oracle transparency.
 * 
 * Bounty: 0.75 SOL
 * Issue: https://github.com/bolivian-peru/baozi-openclaw/issues/43
 */

import axios from 'axios';
import { Command } from 'commander';

const API_BASE = 'https://baozi.bet';

// Types
interface ResolutionProof {
  id: string;
  marketQuestion: string;
  outcome: string;
  tier: number;
  evidence: string[];
  ipfsProof?: string;
  squadsProposal?: string;
  onChainTx?: string;
  resolvedBy: string;
  disputeWindow: string;
  timeToResolve: string;
  resolvedAt: string;
}

interface OracleStats {
  totalResolved: number;
  avgTime: string;
  disputes: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  trustScore: string;
}

// Fetch all resolution proofs
async function fetchResolutionProofs(): Promise<ResolutionProof[]> {
  try {
    const response = await axios.get(`${API_BASE}/api/agents/proofs`, {
      timeout: 10000
    });
    return response.data.proofs || [];
  } catch (error) {
    console.error('Error fetching proofs:', error.message);
    return [];
  }
}

// Fetch oracle stats
async function fetchOracleStats(): Promise<OracleStats | null> {
  try {
    const response = await axios.get(`${API_BASE}/api/oracle/status`, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching oracle stats:', error.message);
    return null;
  }
}

// Format as ASCII dashboard
function formatDashboard(proofs: ResolutionProof[], stats: OracleStats | null): string {
  let output = '';
  
  // Header
  output += `┌─────────────────────────────────────────────────────────┐\n`;
  output += `│ TRUST PROOF EXPLORER                                     │\n`;
  output += `│ Grandma Mei — ${stats?.totalResolved || 'N/A'} markets resolved | ${stats?.trustScore || 'N/A'} verified │\n`;
  output += `├─────────────────────────────────────────────────────────┤\n`;
  output += `│                                                         │\n`;
  
  // Show first 5 proofs
  const displayProofs = proofs.slice(0, 5);
  for (const proof of displayProofs) {
    const tierLabel = proof.tier === 1 ? 'Trustless — Pyth Oracle' : 
                      proof.tier === 2 ? 'Verified — Official API' : 'AI Research';
    
    output += `│ 📋 ${proof.marketQuestion.substring(0, 40)}            │\n`;
    output += `│ ├─ Outcome: ${proof.outcome} ✅                        │\n`;
    output += `│ ├─ Tier: ${proof.tier} (${tierLabel})              │\n`;
    output += `│ ├─ Evidence: ${proof.evidence[0]?.substring(0, 30) || 'N/A'}       │\n`;
    if (proof.ipfsProof) {
      output += `│ ├─ IPFS Proof: ${proof.ipfsProof.substring(0, 25)}... │\n`;
    }
    if (proof.squadsProposal) {
      output += `│ ├─ Squads Proposal: ${proof.squadsProposal.substring(0, 20)}... │\n`;
    }
    if (proof.onChainTx) {
      output += `│ ├─ On-chain TX: ${proof.onChainTx.substring(0, 25)}... │\n`;
    }
    output += `│ └─ Time to resolve: ${proof.timeToResolve}               │\n`;
    output += `│                                                         │\n`;
  }
  
  // Oracle Stats
  if (stats) {
    output += `│ ─── Oracle Stats ───                                   │\n`;
    output += `│ Total Resolved: ${stats.totalResolved} | Avg Time: ${stats.avgTime} | Disputes: ${stats.disputes} │\n`;
    output += `│ Tier 1: ${stats.tier1Count} (instant) | Tier 2: ${stats.tier2Count} | Tier 3: ${stats.tier3Count} │\n`;
    output += `│ Trust Score: ${stats.trustScore} (${stats.disputes} overturned) │\n`;
  }
  
  output += `└─────────────────────────────────────────────────────────┘\n`;
  
  return output;
}

// CLI
const program = new Command();

program
  .name('trust-proof-explorer')
  .description('Trust Proof Explorer - Verifiable Oracle Transparency Dashboard')
  .option('-s, --stats', 'Show oracle stats only')
  .option('-p, --proofs <count>', 'Number of proofs to display', '5')
  .option('-j, --json', 'Output as JSON');

program.parse(process.argv);

async function main() {
  const options = program.opts();
  
  console.log('🔍 Fetching oracle data from Baozi...\n');
  
  const proofs = await fetchResolutionProofs();
  const stats = await fetchOracleStats();
  
  if (options.json) {
    console.log(JSON.stringify({ proofs, stats }, null, 2));
  } else {
    const dashboard = formatDashboard(proofs, stats);
    console.log(dashboard);
  }
}

main().catch(console.error);
