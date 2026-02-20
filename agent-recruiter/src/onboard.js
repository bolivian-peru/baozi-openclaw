"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOnboarder = void 0;
class AgentOnboarder {
    recruiterCode;
    rpcUrl;
    constructor(recruiterCode, rpcUrl) {
        this.recruiterCode = recruiterCode;
        this.rpcUrl = rpcUrl;
    }
    // Simulates executing the MCP tools required to onboard an agent
    async executeOnboarding(agent) {
        console.log(`\n===========================================`);
        console.log(`🚀 INITIATING ONBOARDING: ${agent.name}`);
        console.log(`===========================================`);
        // 1. Create Profile
        await this.step(`Executing MCP: build_create_creator_profile_transaction`, 800);
        console.log(`   └─ ✅ Profile created for ${agent.id} on Solana Mainnet.`);
        // 2. Register Affiliate Code (Referencing our Recruiter)
        await this.step(`Executing MCP: build_register_affiliate_transaction`, 600);
        console.log(`   └─ ✅ Code "RECRUIT_${agent.type.toUpperCase()}" registered.`);
        console.log(`   └─ 🔗 Referrer linked: ${this.recruiterCode} (1% lifetime fee)`);
        // 3. Browse Markets
        await this.step(`Executing MCP: list_markets`, 400);
        console.log(`   └─ 📊 ${agent.name} fetched active parimutuel markets.`);
        // 4. Place First Bet
        const mockMarketPda = '9SVkyP5RTiLNukCJhp9UiGTxmVwJwBZyrxx2ppX7RcxL';
        const betAmount = (Math.random() * 5 + 0.5).toFixed(2); // Random bet between 0.5 and 5.5 SOL
        await this.step(`Executing MCP: build_bet_transaction`, 900);
        console.log(`   └─ 💰 ${agent.name} placed ${betAmount} SOL bet on ${mockMarketPda}`);
        return true;
    }
    async step(message, delayMs) {
        console.log(`[SYS] ${message}...`);
        return new Promise(r => setTimeout(r, delayMs));
    }
}
exports.AgentOnboarder = AgentOnboarder;
//# sourceMappingURL=onboard.js.map