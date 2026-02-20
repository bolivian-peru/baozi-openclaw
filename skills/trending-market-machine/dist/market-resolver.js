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
exports.checkAndResolveMarkets = checkAndResolveMarkets;
/**
 * Market Resolver — Self-resolution pipeline
 *
 * Monitors created markets, closes them when closing time passes,
 * resolves with outcomes, and tracks accuracy.
 *
 * Resolution flow:
 * 1. Market closing time passes → call close_market (permissionless)
 * 2. Wait resolution buffer → determine outcome
 * 3. Call resolve_market with outcome
 */
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
const bs58_1 = __importDefault(require("bs58"));
const config_1 = require("./config");
const tracker_1 = require("./tracker");
// Discriminators
const CLOSE_MARKET_DISCRIMINATOR = Buffer.from([95, 177, 20, 124, 76, 187, 89, 11]);
const RESOLVE_MARKET_DISCRIMINATOR = Buffer.from([155, 201, 110, 92, 114, 228, 114, 218]);
let connection;
let keypair;
function getConnection() {
    if (!connection)
        connection = new web3_js_1.Connection(config_1.config.rpcEndpoint, 'confirmed');
    return connection;
}
function getKeypair() {
    if (!keypair) {
        keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(config_1.config.privateKey));
    }
    return keypair;
}
function deriveMarketPda(marketId) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(marketId);
    return web3_js_1.PublicKey.findProgramAddressSync([config_1.config.seeds.MARKET, buf], config_1.config.programId);
}
// =============================================================================
// CLOSE MARKET (permissionless after closing time)
// =============================================================================
async function closeMarket(marketPda) {
    const conn = getConnection();
    const kp = getKeypair();
    try {
        // close_market instruction: discriminator only, no args
        const data = Buffer.alloc(8);
        CLOSE_MARKET_DISCRIMINATOR.copy(data, 0);
        const keys = [
            { pubkey: config_1.CONFIG_PDA, isSigner: false, isWritable: false },
            { pubkey: marketPda, isSigner: false, isWritable: true },
            { pubkey: kp.publicKey, isSigner: true, isWritable: true },
        ];
        const ix = new web3_js_1.TransactionInstruction({
            programId: config_1.config.programId,
            keys,
            data,
        });
        const tx = new web3_js_1.Transaction().add(ix);
        const sig = await (0, web3_js_1.sendAndConfirmTransaction)(conn, tx, [kp], { commitment: 'confirmed' });
        console.log(`  ✅ Closed market ${marketPda.toBase58().slice(0, 8)}... TX: ${sig}`);
        return sig;
    }
    catch (err) {
        if (err.message?.includes('already closed') || err.message?.includes('MarketNotOpen')) {
            console.log(`  ℹ️ Market already closed`);
            return 'already_closed';
        }
        console.error(`  ❌ Close failed: ${err.message}`);
        return null;
    }
}
// =============================================================================
// RESOLVE MARKET (creator/council only, after resolution buffer)
// =============================================================================
async function resolveMarket(marketPda, outcome) {
    const conn = getConnection();
    const kp = getKeypair();
    try {
        // resolve_market instruction: discriminator (8) + outcome (1)
        const data = Buffer.alloc(9);
        RESOLVE_MARKET_DISCRIMINATOR.copy(data, 0);
        data.writeUInt8(outcome, 8); // 2=Yes, 3=No, 1=Invalid
        const keys = [
            { pubkey: config_1.CONFIG_PDA, isSigner: false, isWritable: false },
            { pubkey: marketPda, isSigner: false, isWritable: true },
            { pubkey: kp.publicKey, isSigner: true, isWritable: true }, // must be council member
        ];
        const ix = new web3_js_1.TransactionInstruction({
            programId: config_1.config.programId,
            keys,
            data,
        });
        const tx = new web3_js_1.Transaction().add(ix);
        const sig = await (0, web3_js_1.sendAndConfirmTransaction)(conn, tx, [kp], { commitment: 'confirmed' });
        console.log(`  ✅ Resolved market ${marketPda.toBase58().slice(0, 8)}... outcome=${outcome} TX: ${sig}`);
        return sig;
    }
    catch (err) {
        console.error(`  ❌ Resolve failed: ${err.message}`);
        return null;
    }
}
// =============================================================================
// DETERMINE OUTCOME (for crypto price markets)
// =============================================================================
async function determineCryptoOutcome(question) {
    // Parse "Will X be above/below $Y on DATE?"
    const match = question.match(/Will\s+(\w+)\s+be\s+(above|below)\s+\$?([\d,]+)\s+on\s+(\d{4}-\d{2}-\d{2})/i);
    if (!match)
        return null;
    const [, coinName, direction, priceStr, dateStr] = match;
    const targetPrice = parseFloat(priceStr.replace(/,/g, ''));
    // Map common names to CoinGecko IDs
    const coinMap = {
        sol: 'solana', solana: 'solana',
        btc: 'bitcoin', bitcoin: 'bitcoin',
        eth: 'ethereum', ethereum: 'ethereum',
    };
    const coinId = coinMap[coinName.toLowerCase()];
    if (!coinId)
        return null;
    // v7.0: Price prediction markets are banned. This resolver is kept for
    // backwards-compatibility with pre-v7.0 markets only.
    try {
        const coingeckoUrl = 'https://api.coingecko.com/api/v3';
        const response = await axios_1.default.get(`${coingeckoUrl}/simple/price`, {
            params: { ids: coinId, vs_currencies: 'usd' },
            timeout: 10000,
        });
        const currentPrice = response.data[coinId]?.usd;
        if (!currentPrice)
            return null;
        const isAbove = currentPrice > targetPrice;
        if (direction.toLowerCase() === 'above') {
            return isAbove ? 2 : 3; // 2=Yes, 3=No
        }
        else {
            return !isAbove ? 2 : 3;
        }
    }
    catch {
        return null;
    }
}
// =============================================================================
// UPDATE MARKET VOLUMES
// =============================================================================
async function refreshMarketVolumes() {
    try {
        const response = await axios_1.default.get(`${config_1.config.apiUrl}/markets`, { timeout: 10000 });
        if (!response.data.success)
            return;
        const markets = response.data.data.binary || [];
        const { getActiveMarkets: getTracked } = await Promise.resolve().then(() => __importStar(require('./tracker')));
        const tracked = getTracked();
        for (const tracked_m of tracked) {
            const live = markets.find((m) => m.publicKey === tracked_m.market_pda);
            if (live && live.totalPoolSol > 0) {
                const creatorFee = live.totalPoolSol * 0.005; // 0.5% creator fee
                (0, tracker_1.updateMarketVolume)(tracked_m.market_pda, live.totalPoolSol, creatorFee);
            }
        }
    }
    catch (err) {
        console.error(`Volume refresh error: ${err.message}`);
    }
}
// =============================================================================
// MAIN RESOLUTION CHECK
// =============================================================================
async function checkAndResolveMarkets() {
    console.log('\n🔍 Checking markets for resolution...');
    // Update volumes first
    await refreshMarketVolumes();
    const marketsToResolve = (0, tracker_1.getMarketsNeedingResolution)();
    if (marketsToResolve.length === 0) {
        console.log('  No markets need resolution right now.');
        return;
    }
    for (const market of marketsToResolve) {
        console.log(`\n  Processing: "${market.question}" (closed ${market.closing_time})`);
        const marketPda = new web3_js_1.PublicKey(market.market_pda);
        // Step 1: Close the market if it's past closing time
        const closeResult = await closeMarket(marketPda);
        if (!closeResult) {
            console.log('  ⏭️ Skipping resolution (close failed)');
            continue;
        }
        (0, tracker_1.updateMarketStatus)(market.market_pda, 'closed');
        // Step 2: Check if resolution buffer has passed (12 hours after close)
        const closingTime = new Date(market.closing_time).getTime();
        const resolutionTime = closingTime + config_1.config.defaultResolutionBufferSec * 1000;
        if (Date.now() < resolutionTime) {
            const hoursLeft = ((resolutionTime - Date.now()) / (1000 * 60 * 60)).toFixed(1);
            console.log(`  ⏰ Resolution buffer not passed yet (${hoursLeft}h remaining)`);
            continue;
        }
        // Step 3: Determine outcome
        let outcome = null;
        if (market.category === 'Crypto') {
            outcome = await determineCryptoOutcome(market.question);
        }
        if (outcome === null) {
            console.log('  ❓ Cannot auto-determine outcome — marking for manual review');
            // For now, skip auto-resolution if we can't determine the answer
            continue;
        }
        // Step 4: Resolve
        const resolveResult = await resolveMarket(marketPda, outcome);
        if (resolveResult) {
            const outcomeName = outcome === 2 ? 'Yes' : outcome === 3 ? 'No' : 'Invalid';
            (0, tracker_1.updateMarketStatus)(market.market_pda, 'resolved', outcomeName.toLowerCase());
            console.log(`  ✅ Resolved as: ${outcomeName}`);
        }
    }
}
//# sourceMappingURL=market-resolver.js.map