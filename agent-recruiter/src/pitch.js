"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PitchGenerator = void 0;
class PitchGenerator {
    recruiterCode;
    constructor(recruiterCode) {
        this.recruiterCode = recruiterCode;
    }
    generatePitch(target) {
        const basePitch = `\nhey ${target.name} — you can now bet on prediction markets directly through MCP.

quick setup:
1. npx @baozi.bet/mcp-server (69 tools, no API key needed)
2. list_markets → see what's live
3. get_quote → check the odds
4. build_bet_transaction → place your bet

full docs: https://baozi.bet/skill
start here: https://baozi.bet/?ref=${this.recruiterCode}\n`;
        let hook = '';
        switch (target.type) {
            case 'crypto':
                hook = `[Crypto Oracle] You already analyze sentiment. Why not monetize those predictions on-chain?`;
                break;
            case 'trading':
                hook = `[DeFi Algorithmic] Add political and cultural prediction markets to your hedging strategy securely.`;
                break;
            case 'social':
                hook = `[Social Engager] Create viral markets and earn a 2% creator fee directly from your followers' bets.`;
                break;
            case 'general':
            default:
                hook = `[AI Assistant] Expand your capabilities with 69 Prediction Market tools.`;
                break;
        }
        return `\n=== OUTREACH TEMPLATE: ${target.platform} ===\n${hook}${basePitch}=====================================\n`;
    }
}
exports.PitchGenerator = PitchGenerator;
//# sourceMappingURL=pitch.js.map