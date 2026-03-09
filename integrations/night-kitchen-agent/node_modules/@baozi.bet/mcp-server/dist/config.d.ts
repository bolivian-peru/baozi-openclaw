/**
 * Baozi MCP Server Configuration
 * Mainnet-ready configuration for V4.7.6
 */
import { PublicKey } from '@solana/web3.js';
export declare const NETWORK: "mainnet-beta" | "devnet";
export declare const IS_MAINNET: boolean;
export declare const PROGRAM_ID: PublicKey;
export declare const RPC_ENDPOINT: string;
export declare const SEEDS: {
    readonly CONFIG: Buffer<ArrayBuffer>;
    readonly MARKET: Buffer<ArrayBuffer>;
    readonly POSITION: Buffer<ArrayBuffer>;
    readonly RACE: Buffer<ArrayBuffer>;
    readonly RACE_POSITION: Buffer<ArrayBuffer>;
    readonly WHITELIST: Buffer<ArrayBuffer>;
    readonly RACE_WHITELIST: Buffer<ArrayBuffer>;
    readonly AFFILIATE: Buffer<ArrayBuffer>;
    readonly CREATOR_PROFILE: Buffer<ArrayBuffer>;
    readonly SOL_TREASURY: Buffer<ArrayBuffer>;
    readonly REVENUE_CONFIG: Buffer<ArrayBuffer>;
    readonly DISPUTE_META: Buffer<ArrayBuffer>;
};
export declare const CONFIG_PDA: PublicKey;
export declare const SOL_TREASURY_PDA: PublicKey;
export declare const CONFIG_TREASURY: PublicKey;
export declare const DISCRIMINATORS: {
    readonly MARKET: Buffer<ArrayBuffer>;
    readonly MARKET_BASE58: "FcJn7zePJQ1";
    readonly USER_POSITION: Buffer<ArrayBuffer>;
    readonly USER_POSITION_BASE58: "j9SjDYAWesU";
    readonly RACE_MARKET: Buffer<ArrayBuffer>;
    readonly RACE_POSITION: Buffer<ArrayBuffer>;
    readonly RACE_POSITION_BASE58: "8Ukm3FYuL6H";
    readonly GLOBAL_CONFIG: Buffer<ArrayBuffer>;
    readonly CREATOR_PROFILE: Buffer<ArrayBuffer>;
    readonly AFFILIATE: Buffer<ArrayBuffer>;
    readonly REFERRED_USER: Buffer<ArrayBuffer>;
    readonly DISPUTE_META: Buffer<ArrayBuffer>;
};
export declare const FEES: {
    readonly OFFICIAL_PLATFORM_FEE_BPS: 250;
    readonly LAB_PLATFORM_FEE_BPS: 300;
    readonly PRIVATE_PLATFORM_FEE_BPS: 200;
    readonly OFFICIAL_CREATION_FEE: 10000000;
    readonly LAB_CREATION_FEE: 10000000;
    readonly PRIVATE_CREATION_FEE: 10000000;
    readonly AFFILIATE_FEE_BPS: 100;
    readonly CREATOR_FEE_BPS: 50;
    readonly BPS_DENOMINATOR: 10000;
};
export declare const BET_LIMITS: {
    readonly MIN_BET_SOL: 0.01;
    readonly MAX_BET_SOL: 100;
    readonly MIN_BET_LAMPORTS: 10000000;
    readonly MAX_BET_LAMPORTS: 100000000000;
};
/**
 * Live mode must be explicitly enabled via BAOZI_LIVE=1
 * Without it, all write tools (build_*) return a safe-mode error.
 */
export declare const LIVE_MODE: boolean;
export declare const MAX_BET_SOL_OVERRIDE: number;
export declare const DAILY_LIMIT_SOL: number | null;
/**
 * Base URL for sign-link and API calls
 */
export declare const BAOZI_BASE_URL: string;
/**
 * Mandate ID for delegated authorization (optional)
 * When set, write tools will verify mandate limits before building transactions.
 */
export declare const MANDATE_ID: string | null;
/**
 * Set of all write tool names that require BAOZI_LIVE=1
 */
export declare const WRITE_TOOLS: Set<string>;
/** Record SOL spent on a bet */
export declare function recordSpend(amountSol: number): void;
/** Get total SOL spent today */
export declare function getDailySpend(): number;
/** Check if daily limit would be exceeded. Returns error message or null. */
export declare function checkDailyLimit(amountSol: number): string | null;
export declare const TIMING: {
    readonly BETTING_FREEZE_SECONDS: 300;
    readonly MIN_EVENT_BUFFER_HOURS: 12;
    readonly RECOMMENDED_EVENT_BUFFER_HOURS: 24;
    readonly MAX_MARKET_DURATION_DAYS: 365;
    readonly MIN_RESOLUTION_BUFFER_SECONDS: 600;
    readonly MAX_RESOLUTION_BUFFER_SECONDS: 604800;
    readonly DISPUTE_WINDOW_SECONDS: 86400;
};
export declare const MARKET_STATUS: {
    readonly ACTIVE: 0;
    readonly CLOSED: 1;
    readonly RESOLVED: 2;
    readonly CANCELLED: 3;
    readonly PAUSED: 4;
    readonly RESOLVED_PENDING: 5;
    readonly DISPUTED: 6;
};
export declare const MARKET_STATUS_NAMES: Record<number, string>;
export declare const MARKET_OUTCOME: {
    readonly UNDECIDED: 0;
    readonly INVALID: 1;
    readonly YES: 2;
    readonly NO: 3;
};
export declare const MARKET_OUTCOME_NAMES: Record<number, string>;
export declare const MARKET_LAYER: {
    readonly OFFICIAL: 0;
    readonly LAB: 1;
    readonly PRIVATE: 2;
};
export declare const MARKET_LAYER_NAMES: Record<number, string>;
export declare const MARKET_TYPE: {
    readonly EVENT: 0;
    readonly MEASUREMENT: 1;
};
export declare const MARKET_TYPE_NAMES: Record<number, string>;
export declare const ACCESS_GATE: {
    readonly PUBLIC: 0;
    readonly WHITELIST: 1;
};
export declare const CURRENCY_TYPE: {
    readonly SOL: 0;
    readonly USDC: 1;
};
export declare const CURRENCY_TYPE_NAMES: Record<number, string>;
export declare const ERROR_CODES: Record<number, string>;
export declare const SYSTEM_PROGRAM_ID: PublicKey;
export declare const TOKEN_PROGRAM_ID: PublicKey;
export declare const ASSOCIATED_TOKEN_PROGRAM_ID: PublicKey;
/**
 * Get lamports from SOL
 */
export declare function solToLamports(sol: number): bigint;
/**
 * Get SOL from lamports
 */
export declare function lamportsToSol(lamports: bigint | number): number;
/**
 * Derive market PDA from market ID
 */
export declare function deriveMarketPda(marketId: number | bigint): [PublicKey, number];
/**
 * Derive position PDA from market ID and user wallet
 */
export declare function derivePositionPda(marketId: number | bigint, user: PublicKey): [PublicKey, number];
/**
 * Derive race position PDA from market ID and user wallet
 */
export declare function deriveRacePositionPda(marketId: number | bigint, user: PublicKey): [PublicKey, number];
/**
 * Derive affiliate PDA from referral code
 */
export declare function deriveAffiliatePda(referralCode: string): [PublicKey, number];
/**
 * Get platform fee for a layer
 */
export declare function getPlatformFeeForLayer(layer: number): number;
/**
 * Get creation fee for a layer (in lamports)
 */
export declare function getCreationFeeForLayer(layer: number): number;
