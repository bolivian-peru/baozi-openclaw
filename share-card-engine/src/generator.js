"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareCardGenerator = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class ShareCardGenerator {
    wallet;
    refCode;
    constructor(wallet, refCode) {
        this.wallet = wallet;
        this.refCode = refCode;
    }
    // Uses the Baozi API to generate a share card
    async generateCard(event) {
        // Bounty requires hitting the generation API endpoint
        // Documented API: GET https://baozi.bet/api/share/card?market=PDA&wallet=WALLET&ref=CODE
        const url = `https://baozi.bet/api/share/card?market=${event.market.pda}&wallet=${this.wallet}&ref=${this.refCode}`;
        // In a real scenario, this endpoint returns the image buffer or a CDN link.
        // For this engine we assume the URL itself is the public CDN link to the image,
        // or we fetch the JSON containing { imageUrl } as hinted in requirements.
        let imageUrl = '';
        try {
            const resp = await (0, node_fetch_1.default)(url);
            if (resp.headers.get('content-type')?.includes('application/json')) {
                const data = await resp.json();
                imageUrl = data.imageUrl;
            }
            else {
                // Fallback: The API returns the image directly, so we just use the API URL as the src
                imageUrl = url;
            }
        }
        catch (e) {
            console.warn(`[WARN] Failed to hit generation API for ${event.market.pda}, using fallback link.`);
            imageUrl = url;
        }
        const marketLink = `https://baozi.bet/market/${event.market.pda}?ref=${this.refCode}`;
        // Format the final caption integrating the context + proverb + link
        const caption = `${event.context}\n\nplace your bet → ${marketLink}\n\n${event.proverb}`;
        return {
            imageUrl,
            caption
        };
    }
}
exports.ShareCardGenerator = ShareCardGenerator;
//# sourceMappingURL=generator.js.map