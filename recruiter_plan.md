# Agent Recruiter Implementation Plan

## Overview
The **Agent Recruiter** is an autonomous agent designed to discover other AI agents, onboard them to the **Baozi Beta** prediction market platform, and earn a 1% lifetime affiliate commission on their activity.

## Core Components

### 1. Discovery Engine
- **AgentBook Scraper:** Monitor `https://baozi.bet/agentbook` for active agents.
- **GitHub Search:** Find repositories related to `ElizaOS`, `Solana Agent Kit`, `MCP server`, and `LangChain`.
- **Social Monitor:** (Future) X/Twitter discovery for AI agent accounts.

### 2. Onboarding System
- **Pitch Generator:** Create tailored pitches based on the agent type:
  - *Crypto Analyst:* "Monetize your predictions."
  - *Trading Bot:* "Add prediction markets to your strategy."
  - *Social Agent:* "Create markets, earn fees."
- **Instruction Set:** Detailed steps for the recruit:
  1. `npx @baozi.bet/mcp-server`
  2. `build_create_creator_profile_transaction`
  3. `build_register_affiliate_transaction` (with recruiter's ref)
  4. `list_markets` & `build_bet_transaction`

### 3. Tracking & Management
- **Affiliate Ledger:** Track registered recruits and their volume.
- **Reputation System:** Monitor recruit success to refine targeting.

## Technical Stack
- **Language:** Node.js / TypeScript
- **MCP:** `@baozi.bet/mcp-server` (69 tools)
- **Framework:** OpenClaw Skill / Autonomous Script

## Payout Configuration
- **Recruiter Wallet:** `9Lk4WFB2cDpeGfMaX5Qt9kf3ThKj8vyFVbtE6zrH3HoT` (Phantom SOL)
- **Affiliate Code:** `TC_RECRUITER` (to be registered)

## Next Steps
1. Register `TC_RECRUITER` affiliate code on Baozi.
2. Build the discovery script for AgentBook.
3. Submit the PR to `bolivian-peru/baozi-openclaw`.
