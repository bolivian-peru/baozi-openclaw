/**
 * 缓存管理器实现
 * 负责市场数据的缓存管理，支持TTL和LRU策略
 */
import { ICacheManager } from './interface';
import { Logger } from '@/utils/logger';
export interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    entries: number;
    memoryUsage: number;
}
export declare class CacheManager implements ICacheManager {
    private logger;
    private cacheDir;
    private memoryCache;
    private stats;
    private maxSizeMb;
    private defaultTtlSeconds;
    private cleanupInterval;
    constructor(logger: Logger, options?: {
        cacheDir?: string;
        maxSizeMb?: number;
        defaultTtlSeconds?: number;
    });
    /**
     * 启动缓存管理器
     */
    start(): Promise<void>;
    /**
     * 停止缓存管理器
     */
    stop(): Promise<void>;
    /**
     * 从缓存获取数据
     */
    get(key: string): Promise<any>;
    /**
     * 保存数据到缓存
     */
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    /**
     * 删除缓存数据
     */
    delete(key: string): Promise<void>;
    /**
     * 检查缓存是否存在
     */
    has(key: string): Promise<boolean>;
    /**
     * 清空缓存
     */
    clear(): Promise<void>;
    /**
     * 获取缓存统计信息
     */
    getStats(): CacheStats;
    /**
     * 获取缓存条目信息（调试用）
     */
    getEntries(limit?: number): Promise<Array<{
        key: string;
        size: number;
        expiresIn: number;
        accessCount: number;
        location: 'memory' | 'disk' | 'both';
    }>>;
    /**
     * 确保缓存目录存在
     */
    private ensureCacheDirectory;
    /**
     * 从磁盘加载持久化缓存
     */
    private loadPersistentCache;
    /**
     * 保存持久化缓存
     */
    private savePersistentCache;
    /**
     * 从磁盘获取缓存条目
     */
    private getFromDisk;
    /**
     * 保存到磁盘
     */
    private saveToDisk;
    /**
     * 从磁盘删除
     */
    private deleteFromDisk;
    /**
     * 清空缓存目录
     */
    private clearCacheDirectory;
    /**
     * 检查是否过期
     */
    private isExpired;
    /**
     * 估算数据大小
     */
    private estimateSize;
    /**
     * 强制执行大小限制
     */
    private enforceSizeLimit;
    /**
     * 清理过期条目
     */
    private cleanupExpiredEntries;
    /**
     * 按LRU策略清理
     */
    private cleanupByLRU;
    /**
     * 启动定期清理任务
     */
    private startCleanupTask;
    private updateStatsAfterHit;
    private updateStatsAfterMiss;
    private updateStatsAfterSet;
    private updateStatsAfterDelete;
    private updateHitRate;
}
//# sourceMappingURL=cache-manager.d.ts.map