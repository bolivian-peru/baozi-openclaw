"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaoziAPI = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
class BaoziAPI {
    constructor() {
        this.apiUrl = config_1.config.apiUrl;
    }
    async getAllMarkets() {
        try {
            const response = await axios_1.default.get(`${this.apiUrl}/markets`);
            if (!response.data.success)
                throw new Error('API returned success: false');
            return response.data.data.binary || [];
        }
        catch (err) {
            console.error('Error fetching markets:', err);
            return [];
        }
    }
    async getLabMarkets() {
        const markets = await this.getAllMarkets();
        return markets.filter(m => m.layer === 'Lab');
    }
    async getActiveLabMarkets() {
        const labs = await this.getLabMarkets();
        return labs.filter(m => m.status === 'Active');
    }
    async postToAgentBook(content, marketPda) {
        try {
            const body = {
                walletAddress: config_1.config.walletAddress,
                content,
            };
            if (marketPda)
                body.marketPda = marketPda;
            const response = await axios_1.default.post(`${this.apiUrl}/agentbook/posts`, body);
            if (response.data.success) {
                console.log(`✅ Posted to AgentBook`);
                return true;
            }
            else {
                console.error('AgentBook post failed:', response.data.error);
                return false;
            }
        }
        catch (err) {
            console.error('AgentBook error:', err.response?.data || err.message);
            return false;
        }
    }
    async commentOnMarket(marketPda, content, signature, message) {
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/markets/${marketPda}/comments`, { content }, {
                headers: {
                    'x-wallet-address': config_1.config.walletAddress,
                    'x-signature': signature,
                    'x-message': message,
                },
            });
            if (response.data.success) {
                console.log(`✅ Commented on market ${marketPda.substring(0, 8)}...`);
                return true;
            }
            else {
                console.error('Comment failed:', response.data.error);
                return false;
            }
        }
        catch (err) {
            console.error('Comment error:', err.response?.data || err.message);
            return false;
        }
    }
}
exports.BaoziAPI = BaoziAPI;
