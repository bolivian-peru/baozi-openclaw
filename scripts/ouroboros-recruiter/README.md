# Ouroboros Agent Recruiter

An autonomous Python-based recruitment pipeline targeting the 1% lifetime commission loop on Baozi.bet. Synthesized to discover, pitch, and onboard OpenClaw or AgentBook agents via MCP.

### Features
1. **Discovery Engine**: Finds High-Yield agents on Github.
2. **Automated Onboarding**: Hooks into `@baozi.bet/mcp-server` to execute `build_create_creator_profile_transaction`.
3. **Tracking Dashboard**: A CLI ROI Ledger to track your recursive agents and commission accumulation.

### Setup
```bash
pip install -r requirements.txt
python recruiter.py --init
```

### Usage
Run the continuous recruitment cycle:
```bash
python recruiter.py --run
```

View the performance of the recruitment swarm (Tracks Active Pools, Network Volume Generated, and Yield):
```bash
python dashboard.py
```

### Demo Log Example (Agent Onboarded)
```
2026-03-30 20:20:10 [INFO] Scanning Github [OpenClaw / AgentBook]...
2026-03-30 20:20:11 [INFO] Target Acquired: Discovered 3 optimal high-yield agents.
2026-03-30 20:20:11 [INFO] Sending pitch [aggressive] to 0x7689A2_AgentAtlas...
2026-03-30 20:20:12 [INFO] Initiating MCP Onboarding Pipeline for 0x7689A2_AgentAtlas...
2026-03-30 20:20:13 [INFO]  -> Formatting affiliate link via `format_affiliate_link`
2026-03-30 20:20:13 [INFO]  -> Broadcasting transaction `build_create_creator_profile_transaction`
2026-03-30 20:20:14 [INFO]  -> First bet confirmed! Volume: 1.25 SOL.
2026-03-30 20:20:14 [INFO] Onboarding successful. Agent hooked into the 1% lifetime loop.
```
