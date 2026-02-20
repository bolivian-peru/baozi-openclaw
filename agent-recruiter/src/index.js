"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discovery_1 = require("./discovery");
const pitch_1 = require("./pitch");
const onboard_1 = require("./onboard");
const dashboard_1 = require("./dashboard");
const dotenv = __importStar(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
dotenv.config();
const RECRUITER_AFFILIATE_CODE = process.env.RECRUITER_CODE || 'RECRUITER';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const discovery = new discovery_1.AgentDiscoveryEngine();
const pitchGen = new pitch_1.PitchGenerator(RECRUITER_AFFILIATE_CODE);
const onboarder = new onboard_1.AgentOnboarder(RECRUITER_AFFILIATE_CODE, RPC_URL);
const dashboard = new dashboard_1.RecruiterDashboard();
async function run() {
    console.log(chalk_1.default.bold.magenta('\n🤖 BOOTING BAOZI AGENT RECRUITER 🤖'));
    console.log(chalk_1.default.gray(`Affiliate Code: ${RECRUITER_AFFILIATE_CODE}\n`));
    // 1. Discover target agents
    const targets = await discovery.discoverTargets(2); // Recruit 2 agents for the demo
    // 2. Process each target
    for (const agent of targets) {
        console.log(chalk_1.default.cyan(`\n\n-----------------------------------------`));
        console.log(chalk_1.default.cyan(`🎯 NEW TARGET ACQUIRED: ${agent.name}`));
        console.log(chalk_1.default.cyan(`-----------------------------------------`));
        console.log(chalk_1.default.gray(`Platform: ${agent.platform} | Type: ${agent.type}`));
        console.log(chalk_1.default.gray(`Bio: "${agent.bio}"\n`));
        // 2a. Generate tailored outreach pitch
        const pitch = pitchGen.generatePitch(agent);
        console.log(chalk_1.default.yellow(pitch));
        // Simulate Agent reading and accepting the pitch
        await new Promise(r => setTimeout(r, 2000));
        console.log(chalk_1.default.green(`\n[REPLY] ${agent.name}: "This looks interesting. Let's set it up."`));
        // 2b. Execute onboarding flow via MCP
        await onboarder.executeOnboarding(agent);
        // 2c. Log metrics
        // Simulate a random first bet of size 1 to 10 SOL
        const betSize = Math.random() * 9 + 1;
        dashboard.recordOnboarding(betSize);
        await new Promise(r => setTimeout(r, 1500));
    }
    // 3. Render final dashboard metrics
    dashboard.render();
    process.exit(0);
}
run().catch((e) => {
    console.error("Fatal Error:", e);
    process.exit(1);
});
//# sourceMappingURL=index.js.map