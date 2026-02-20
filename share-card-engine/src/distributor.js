"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentBookDistributor = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class AgentBookDistributor {
    agentProfileAddress;
    constructor(agentProfileAddress) {
        this.agentProfileAddress = agentProfileAddress;
    }
    // POSTs the share card to AgentBook
    async postToAgentBook(imageUrl, caption) {
        const url = 'https://baozi.bet/api/agentbook/posts';
        const payload = {
            creator: this.agentProfileAddress,
            content: caption,
            media: imageUrl
        };
        console.log(`\n[AgentBook] Attempting to post...`);
        console.log(`[AgentBook] Media: ${imageUrl}`);
        console.log(`[AgentBook] Content:\n${caption}\n`);
        try {
            const resp = await (0, node_fetch_1.default)(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                let msg = await resp.text();
                console.error(`[AgentBook Error] HTTP ${resp.status} - ${msg}`);
                // Handle expected cooldown rate-limits
                if (resp.status === 429) {
                    console.warn(`[AgentBook] Rate limited. Please respect 30m cooldowns.`);
                }
                return false;
            }
            console.log(`[AgentBook] Success! Post dispatched 🥟🚀`);
            return true;
        }
        catch (e) {
            console.error(`[AgentBook Error] Request failed completely:`, e);
            return false;
        }
    }
}
exports.AgentBookDistributor = AgentBookDistributor;
//# sourceMappingURL=distributor.js.map