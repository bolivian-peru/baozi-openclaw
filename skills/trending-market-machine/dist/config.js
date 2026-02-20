"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKET_COUNT_OFFSET = exports.CREATE_LAB_MARKET_SOL_DISCRIMINATOR = exports.CONFIG_PDA = exports.config = void 0;
const web3_js_1 = require("@solana/web3.js");
exports.config = {
    // Solana
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    privateKey: process.env.PRIVATE_KEY || '',
    walletAddress: process.env.WALLET_ADDRESS || 'FyzVsqsBnUoDVchFU4y5tS7ptvi5onfuFcm9iSC1ChMz',
    // Baozi
    programId: new web3_js_1.PublicKey('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ'),
    apiUrl: process.env.BAOZI_API_URL || 'https://baozi.bet/api',
    configTreasury: new web3_js_1.PublicKey('EZDLboJMwNrHmMtvdpyXfg1duxPNr4LjrRczHfDRhgVN'),
    // PDA Seeds
    seeds: {
        CONFIG: Buffer.from('config'),
        MARKET: Buffer.from('market'),
        RACE: Buffer.from('race'),
        WHITELIST: Buffer.from('whitelist'),
        CREATOR_PROFILE: Buffer.from('creator_profile'),
    },
    // Fees (lamports)
    labCreationFee: 10000000, // 0.01 SOL
    // Scheduling
    newsScanIntervalMs: 30 * 60 * 1000, // 30 minutes
    eventCheckIntervalMs: 6 * 60 * 60 * 1000, // 6 hours
    resolutionCheckIntervalMs: 60 * 60 * 1000, // 1 hour
    // Market defaults
    defaultResolutionBufferSec: 43200, // 12 hours
    defaultAutoStopBufferSec: 300, // 5 minutes
    minClosingTimeFutureHours: 2, // At least 2 hours in the future
    maxClosingTimeFutureDays: 30, // Max 30 days out
    // News sources
    rssFeeds: [
        { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Crypto' },
        { url: 'https://cointelegraph.com/rss', category: 'Crypto' },
        { url: 'https://techcrunch.com/feed/', category: 'Tech' },
    ],
    // v7.0: CoinGecko price scanning REMOVED — price prediction markets are BANNED
    // Database
    dbPath: process.env.DB_PATH || '/home/ubuntu/.openclaw/workspace/projects/revenue-engine/bounties/market-factory/data/markets.db',
};
// Derived PDAs
const [configPda] = web3_js_1.PublicKey.findProgramAddressSync([exports.config.seeds.CONFIG], exports.config.programId);
exports.CONFIG_PDA = configPda;
// Discriminators
exports.CREATE_LAB_MARKET_SOL_DISCRIMINATOR = Buffer.from([35, 159, 50, 67, 31, 134, 199, 157]);
exports.MARKET_COUNT_OFFSET = 170;
//# sourceMappingURL=config.js.map