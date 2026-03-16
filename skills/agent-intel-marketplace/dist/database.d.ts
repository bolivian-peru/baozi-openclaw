/**
 * SQLite Database for Intel Marketplace
 */
import Database from 'better-sqlite3';
import { Analyst, AnalystStats, MarketAnalysis } from './types';
export declare function initDatabase(): Database.Database;
export declare function getDb(): Database.Database;
export declare function registerAnalyst(wallet: string, displayName: string, affiliateCode: string): Analyst;
export declare function getAnalyst(wallet: string): Analyst | null;
export declare function getAnalystByCode(affiliateCode: string): Analyst | null;
export declare function getAllAnalysts(): Analyst[];
export declare function createAnalysis(analysis: MarketAnalysis): MarketAnalysis;
export declare function getAnalysis(id: string): MarketAnalysis | null;
export declare function getAnalysesByMarket(marketAddress: string): MarketAnalysis[];
export declare function getAnalystAnalyses(wallet: string): MarketAnalysis[];
export declare function updateAnalysisResolution(id: string, correct: boolean): void;
export declare function recordPurchase(id: string, analysisId: string, buyerWallet: string, amountSol: number, affiliateWallet: string | null, txId: string): void;
export declare function getPurchasesByBuyer(wallet: string): any[];
export declare function getAnalystStats(wallet: string): AnalystStats;
//# sourceMappingURL=database.d.ts.map