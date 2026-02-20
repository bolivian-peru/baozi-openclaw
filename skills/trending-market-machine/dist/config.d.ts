import { PublicKey } from '@solana/web3.js';
export declare const config: {
    rpcEndpoint: string;
    privateKey: string;
    walletAddress: string;
    programId: PublicKey;
    apiUrl: string;
    configTreasury: PublicKey;
    seeds: {
        CONFIG: Buffer<ArrayBuffer>;
        MARKET: Buffer<ArrayBuffer>;
        RACE: Buffer<ArrayBuffer>;
        WHITELIST: Buffer<ArrayBuffer>;
        CREATOR_PROFILE: Buffer<ArrayBuffer>;
    };
    labCreationFee: number;
    newsScanIntervalMs: number;
    eventCheckIntervalMs: number;
    resolutionCheckIntervalMs: number;
    defaultResolutionBufferSec: number;
    defaultAutoStopBufferSec: number;
    minClosingTimeFutureHours: number;
    maxClosingTimeFutureDays: number;
    rssFeeds: {
        url: string;
        category: string;
    }[];
    dbPath: string;
};
export declare const CONFIG_PDA: PublicKey;
export declare const CREATE_LAB_MARKET_SOL_DISCRIMINATOR: Buffer<ArrayBuffer>;
export declare const MARKET_COUNT_OFFSET = 170;
