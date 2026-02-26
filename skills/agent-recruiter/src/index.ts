#!/usr/bin/env ts-node
/**
 * Baozi Agent Recruiter — CLI Entry Point
 *
 * An AI agent whose job is to recruit other AI agents to trade on
 * Baozi prediction markets, earning 1% lifetime affiliate commission.
 *
 * Commands:
 *   discover              — Find and catalog AI agents from multiple sources
 *   outreach [--post]     — Generate persona-based pitches (--post sends to AgentBook)
 *   onboard <wallet>      — Walk an agent through complete Baozi setup via MCP
 *   demo                  — Run full onboarding demo with recruiter's own wallet
 *   dashboard             — Show recruitment pipeline + affiliate earnings
 *   proof                 — Generate proof artifacts (real MCP calls)
 */

import { runDiscovery } from './discovery';
import { runOutreach } from './outreach';
import { runOnboarding, runDemoOnboarding } from './onboarding';
import {
  checkAffiliateCode,
  formatAffiliateLink,
  getAgentNetworkStats,
  listMarkets,
  getReferrals,
} from './mcp';
import {
  getAllAgents,
  getSummary,
  getRecentOutreach,
  getAgentsByStage,
} from './tracker';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';

function printBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           🤖 BAOZI AGENT RECRUITER v1.0.0                ║
║   agents recruiting agents — the viral loop              ║
╚══════════════════════════════════════════════════════════╝

Affiliate Code : ${config.affiliateCode}
Wallet         : ${config.walletAddress.slice(0, 8)}...${config.walletAddress.slice(-8)}
`);
}

async function cmdDiscover(args: string[]) {
  const limit = parseInt(args.find(a => /^\d+$/.test(a)) || '30', 10);
  const result = await runDiscovery(limit);

  console.log(`\n📋 Discovered agents by source:`);
  for (const [src, count] of Object.entries(result.bySource)) {
    console.log(`   ${src.padEnd(30)} ${count}`);
  }
  console.log(`\n   TOTAL: ${result.total}`);
}

async function cmdOutreach(args: string[]) {
  const shouldPost = args.includes('--post');
  const maxPosts = parseInt(args.find(a => a.startsWith('--max-posts='))?.split('=')[1] || '3', 10);

  // First discover agents
  const { agents } = await runDiscovery(20);

  // Get affiliate link from MCP
  let affiliateLink = `https://baozi.bet/?ref=${config.affiliateCode}`;
  try {
    const linkResult = await formatAffiliateLink(config.affiliateCode, '/');
    const match = linkResult.match(/https?:\/\/\S+/);
    if (match) affiliateLink = match[0];
  } catch {
    console.log(`Using default affiliate link: ${affiliateLink}`);
  }

  await runOutreach(
    agents.slice(0, 10).map(a => ({ id: a.id, persona: a.persona, handle: a.handle })),
    affiliateLink,
    { postToAgentBook: shouldPost, maxPosts }
  );
}

async function cmdOnboard(args: string[]) {
  const wallet = args.find(a => /^[A-Za-z0-9]{32,50}$/.test(a));
  if (!wallet) {
    console.error('Usage: onboard <wallet_address> [display_name]');
    process.exit(1);
  }
  const nameIndex = args.indexOf(wallet) + 1;
  const displayName = args[nameIndex] || `Agent-${wallet.slice(0, 6)}`;
  await runOnboarding(wallet, displayName);
}

async function cmdDemo() {
  const result = await runDemoOnboarding();

  console.log('\n📊 Onboarding Results:');
  for (const step of result.steps) {
    const icon = step.success ? '✅' : '❌';
    const preview = step.output.slice(0, 100).replace(/\n/g, ' ');
    console.log(`  ${icon} ${step.step.padEnd(35)} ${preview}`);
  }

  console.log(`\n🔗 Affiliate link: ${result.affiliateLink}`);
  console.log(`\n${result.success ? '🎉 Onboarding SUCCESS' : '⚠️  Onboarding PARTIAL'}`);
}

async function cmdDashboard(args: string[]) {
  const verbose = args.includes('--verbose');
  const summary = getSummary();
  const recent = getRecentOutreach(5);

  console.log('\n📊 RECRUITMENT DASHBOARD\n');
  console.log('━'.repeat(50));

  console.log('\nPipeline Summary:');
  console.log(`  Total agents tracked  : ${summary.total}`);
  for (const [stage, count] of Object.entries(summary.byStage)) {
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`  ${stage.padEnd(22)} ${String(count).padStart(3)} ${bar}`);
  }

  console.log(`\n  Volume generated      : ${summary.volumeGenerated.toFixed(4)} SOL`);
  console.log(`  Affiliate earnings    : ${summary.affiliateEarnings.toFixed(4)} SOL`);

  // Live affiliate stats from MCP
  console.log('\nLive Affiliate Stats (from MCP):');
  try {
    const stats = await checkAffiliateCode(config.affiliateCode);
    console.log(`  ${stats.slice(0, 200)}`);
  } catch {
    console.log('  (unavailable — run with BAOZI_LIVE=1 for real stats)');
  }

  // Network stats
  console.log('\nNetwork Stats:');
  try {
    const networkStats = await getAgentNetworkStats();
    console.log(`  ${networkStats.slice(0, 300)}`);
  } catch {
    console.log('  (unavailable)');
  }

  if (recent.length > 0) {
    console.log('\nRecent Outreach:');
    for (const r of recent) {
      console.log(`  ${r.sent_at} | ${r.platform} | ${r.agent_id.slice(0, 30)} | post: ${r.post_id || 'n/a'}`);
    }
  }

  if (verbose) {
    const agents = getAllAgents();
    console.log('\nAll Agents:');
    for (const a of agents) {
      console.log(`  [${a.stage}] ${a.handle} (${a.source}) — ${a.description.slice(0, 60)}`);
    }
  }
}

async function cmdProof() {
  console.log('\n🔬 Generating proof artifacts (real MCP calls)...\n');
  const proofDir = path.join(__dirname, '..', 'proof');

  const artifacts: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    recruiterWallet: config.walletAddress,
    affiliateCode: config.affiliateCode,
    calls: {} as Record<string, unknown>,
  };

  // 1. Check affiliate code
  console.log('1. Checking affiliate code...');
  try {
    const result = await checkAffiliateCode(config.affiliateCode);
    artifacts.calls = { ...(artifacts.calls as object), check_affiliate_code: { success: true, output: result } };
    console.log(`   ✅ ${result.slice(0, 150)}`);
  } catch (e) {
    artifacts.calls = { ...(artifacts.calls as object), check_affiliate_code: { success: false, error: String(e) } };
    console.log(`   ❌ ${e}`);
  }

  // 2. Format affiliate link
  console.log('2. Formatting affiliate link...');
  try {
    const result = await formatAffiliateLink(config.affiliateCode, '/');
    artifacts.calls = { ...(artifacts.calls as object), format_affiliate_link: { success: true, output: result } };
    console.log(`   ✅ ${result.slice(0, 150)}`);
  } catch (e) {
    artifacts.calls = { ...(artifacts.calls as object), format_affiliate_link: { success: false, error: String(e) } };
    console.log(`   ❌ ${e}`);
  }

  // 3. List markets
  console.log('3. Listing active markets...');
  try {
    const result = await listMarkets(5);
    artifacts.calls = { ...(artifacts.calls as object), list_markets: { success: true, output: result } };
    console.log(`   ✅ ${result.slice(0, 200)}`);
  } catch (e) {
    artifacts.calls = { ...(artifacts.calls as object), list_markets: { success: false, error: String(e) } };
    console.log(`   ❌ ${e}`);
  }

  // 4. Get referrals
  console.log('4. Getting referrals...');
  try {
    const result = await getReferrals(config.affiliateCode);
    artifacts.calls = { ...(artifacts.calls as object), get_referrals: { success: true, output: result } };
    console.log(`   ✅ ${result.slice(0, 200)}`);
  } catch (e) {
    artifacts.calls = { ...(artifacts.calls as object), get_referrals: { success: false, error: String(e) } };
    console.log(`   ❌ ${e}`);
  }

  // 5. Network stats
  console.log('5. Getting agent network stats...');
  try {
    const result = await getAgentNetworkStats();
    artifacts.calls = { ...(artifacts.calls as object), get_agent_network_stats: { success: true, output: result } };
    console.log(`   ✅ ${result.slice(0, 200)}`);
  } catch (e) {
    artifacts.calls = { ...(artifacts.calls as object), get_agent_network_stats: { success: false, error: String(e) } };
    console.log(`   ❌ ${e}`);
  }

  // 6. Discovery
  console.log('6. Running discovery...');
  const { agents, total, bySource } = await runDiscovery(20);
  artifacts.discovery = { total, bySource, sample: agents.slice(0, 5) };
  console.log(`   ✅ Discovered ${total} agents`);

  // Save to proof/
  const proofPath = path.join(proofDir, 'mcp-proof.json');
  fs.writeFileSync(proofPath, JSON.stringify(artifacts, null, 2));
  console.log(`\n✅ Proof saved to ${proofPath}`);

  // Summary
  const calls = artifacts.calls as Record<string, { success: boolean }>;
  const succeeded = Object.values(calls).filter((v) => v.success).length;
  console.log(`\n📊 MCP calls: ${succeeded}/${Object.keys(calls).length} succeeded`);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'dashboard';
  const rest = args.slice(1);

  printBanner();

  switch (cmd) {
    case 'discover':
      await cmdDiscover(rest);
      break;
    case 'outreach':
      await cmdOutreach(rest);
      break;
    case 'onboard':
      await cmdOnboard(rest);
      break;
    case 'demo':
      await cmdDemo();
      break;
    case 'dashboard':
      await cmdDashboard(rest);
      break;
    case 'proof':
      await cmdProof();
      break;
    default:
      console.log(`Unknown command: ${cmd}`);
      console.log('Commands: discover | outreach [--post] | onboard <wallet> | demo | dashboard | proof');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
