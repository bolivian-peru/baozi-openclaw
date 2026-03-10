"use strict";
/**
 * 缓存管理器实现
 * 负责市场数据的缓存管理，支持TTL和LRU策略
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const errors_1 = require("@/utils/errors");
class CacheManager {
    logger;
    cacheDir;
    memoryCache;
    stats;
    maxSizeMb;
    defaultTtlSeconds;
    cleanupInterval;
    constructor(logger, options = {}) {
        this.logger = logger.child({ component: 'CacheManager' });
        this.cacheDir = options.cacheDir || './cache';
        this.maxSizeMb = options.maxSizeMb || 100;
        this.defaultTtlSeconds = options.defaultTtlSeconds || 300; // 5分钟
        this.memoryCache = new Map();
        this.stats = {
            size: 0,
            hits: 0,
            misses: 0,
            hitRate: 0,
            entries: 0,
            memoryUsage: 0,
        };
        this.cleanupInterval = null;
        this.logger.info('缓存管理器初始化', {
            cacheDir: this.cacheDir,
            maxSize: `${this.maxSizeMb}MB`,
            defaultTtl: `${this.defaultTtlSeconds}秒`,
        });
    }
    /**
     * 启动缓存管理器
     */
    async start() {
        try {
            // 确保缓存目录存在
            await this.ensureCacheDirectory();
            // 从磁盘加载持久化缓存
            await this.loadPersistentCache();
            // 启动定期清理任务
            this.startCleanupTask();
            this.logger.info('缓存管理器启动成功');
        }
        catch (error) {
            this.logger.error('缓存管理器启动失败', { error: error instanceof Error ? error.message : String(error) });
            // 继续运行，使用内存缓存
        }
    }
    /**
     * 停止缓存管理器
     */
    async stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        try {
            // 保存缓存到磁盘
            await this.savePersistentCache();
            this.logger.info('缓存管理器已停止');
        }
        catch (error) {
            this.logger.error('保存缓存到磁盘失败', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * 从缓存获取数据
     */
    async get(key) {
        this.logger.debug('从缓存获取', { key });
        try {
            // 先检查内存缓存
            const memoryEntry = this.memoryCache.get(key);
            if (memoryEntry) {
                if (this.isExpired(memoryEntry)) {
                    // 已过期，删除
                    this.memoryCache.delete(key);
                    this.updateStatsAfterMiss();
                    return null;
                }
                // 更新访问信息
                memoryEntry.lastAccessed = Date.now();
                memoryEntry.accessCount++;
                this.updateStatsAfterHit(memoryEntry.size);
                this.logger.debug('缓存命中（内存）', { key, size: memoryEntry.size });
                return memoryEntry.value;
            }
            // 检查磁盘缓存
            const diskEntry = await this.getFromDisk(key);
            if (diskEntry && !this.isExpired(diskEntry)) {
                // 加载到内存缓存
                this.memoryCache.set(key, {
                    ...diskEntry,
                    lastAccessed: Date.now(),
                    accessCount: diskEntry.accessCount + 1,
                });
                this.updateStatsAfterHit(diskEntry.size);
                this.logger.debug('缓存命中（磁盘）', { key, size: diskEntry.size });
                return diskEntry.value;
            }
            // 缓存未命中
            this.updateStatsAfterMiss();
            this.logger.debug('缓存未命中', { key });
            return null;
        }
        catch (error) {
            this.logger.error('获取缓存数据失败', { key, error: error instanceof Error ? error.message : String(error) });
            this.updateStatsAfterMiss();
            return null;
        }
    }
    /**
     * 保存数据到缓存
     */
    async set(key, value, ttlSeconds) {
        const ttl = ttlSeconds || this.defaultTtlSeconds;
        const size = this.estimateSize(value);
        this.logger.debug('保存到缓存', {
            key,
            ttl: `${ttl}秒`,
            size: `${size}字节`,
        });
        try {
            const entry = {
                value,
                expiresAt: Date.now() + ttl * 1000,
                size,
                lastAccessed: Date.now(),
                accessCount: 0,
            };
            // 检查缓存大小限制
            await this.enforceSizeLimit(entry.size);
            // 保存到内存缓存
            this.memoryCache.set(key, entry);
            // 异步保存到磁盘
            this.saveToDisk(key, entry).catch(error => {
                this.logger.warn('异步保存到磁盘失败', { key, error: error instanceof Error ? error.message : String(error) });
            });
            this.updateStatsAfterSet(entry.size);
            this.logger.debug('缓存保存成功', { key });
        }
        catch (error) {
            this.logger.error('保存到缓存失败', { key, error: error instanceof Error ? error.message : String(error) });
            throw errors_1.AppErrorFactory.createCacheError(error instanceof Error ? error : new Error(String(error)), 'set', { key, size });
        }
    }
    /**
     * 删除缓存数据
     */
    async delete(key) {
        this.logger.debug('删除缓存', { key });
        try {
            // 从内存缓存删除
            const memoryEntry = this.memoryCache.get(key);
            if (memoryEntry) {
                this.updateStatsAfterDelete(memoryEntry.size);
                this.memoryCache.delete(key);
            }
            // 从磁盘缓存删除
            await this.deleteFromDisk(key);
            this.logger.debug('缓存删除成功', { key });
        }
        catch (error) {
            this.logger.error('删除缓存失败', { key, error: error instanceof Error ? error.message : String(error) });
            throw errors_1.AppErrorFactory.createCacheError(error instanceof Error ? error : new Error(String(error)), 'delete', { key });
        }
    }
    /**
     * 检查缓存是否存在
     */
    async has(key) {
        try {
            // 检查内存缓存
            const memoryEntry = this.memoryCache.get(key);
            if (memoryEntry) {
                if (this.isExpired(memoryEntry)) {
                    await this.delete(key);
                    return false;
                }
                return true;
            }
            // 检查磁盘缓存
            const diskEntry = await this.getFromDisk(key);
            if (diskEntry) {
                if (this.isExpired(diskEntry)) {
                    await this.delete(key);
                    return false;
                }
                return true;
            }
            return false;
        }
        catch (error) {
            this.logger.error('检查缓存存在失败', { key, error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
    /**
     * 清空缓存
     */
    async clear() {
        this.logger.info('清空缓存');
        try {
            // 清空内存缓存
            this.memoryCache.clear();
            // 清空磁盘缓存目录
            await this.clearCacheDirectory();
            // 重置统计
            this.stats = {
                size: 0,
                hits: 0,
                misses: 0,
                hitRate: 0,
                entries: 0,
                memoryUsage: 0,
            };
            this.logger.info('缓存已清空');
        }
        catch (error) {
            this.logger.error('清空缓存失败', { error: error instanceof Error ? error.message : String(error) });
            throw errors_1.AppErrorFactory.createCacheError(error instanceof Error ? error : new Error(String(error)), 'clear');
        }
    }
    /**
     * 获取缓存统计信息
     */
    getStats() {
        // 计算当前内存使用量
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        return {
            ...this.stats,
            memoryUsage,
            hitRate: this.stats.hits + this.stats.misses > 0
                ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
                : 0,
        };
    }
    /**
     * 获取缓存条目信息（调试用）
     */
    async getEntries(limit = 10) {
        const entries = [];
        let count = 0;
        for (const [key, memoryEntry] of this.memoryCache.entries()) {
            if (count >= limit)
                break;
            const diskEntry = await this.getFromDisk(key).catch(() => null);
            const location = memoryEntry && diskEntry ? 'both' : 'memory';
            entries.push({
                key,
                size: memoryEntry.size,
                expiresIn: Math.max(0, memoryEntry.expiresAt - Date.now()) / 1000,
                accessCount: memoryEntry.accessCount,
                location,
            });
            count++;
        }
        return entries;
    }
    // ================ 私有方法 ================
    /**
     * 确保缓存目录存在
     */
    async ensureCacheDirectory() {
        try {
            await fs.access(this.cacheDir);
        }
        catch {
            await fs.mkdir(this.cacheDir, { recursive: true });
            this.logger.info('创建缓存目录', { directory: this.cacheDir });
        }
    }
    /**
     * 从磁盘加载持久化缓存
     */
    async loadPersistentCache() {
        try {
            const files = await fs.readdir(this.cacheDir);
            const cacheFiles = files.filter(f => f.endsWith('.cache.json'));
            this.logger.info('加载持久化缓存', { fileCount: cacheFiles.length });
            let loaded = 0;
            for (const file of cacheFiles.slice(0, 100)) { // 限制加载数量
                try {
                    const filePath = path.join(this.cacheDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const entry = JSON.parse(content);
                    const key = file.replace('.cache.json', '');
                    if (!this.isExpired(entry)) {
                        this.memoryCache.set(key, entry);
                        this.updateStatsAfterSet(entry.size);
                        loaded++;
                    }
                    else {
                        // 删除过期文件
                        await fs.unlink(filePath);
                    }
                }
                catch (error) {
                    this.logger.warn('加载缓存文件失败', { file, error: error instanceof Error ? error.message : String(error) });
                }
            }
            this.logger.info('持久化缓存加载完成', { loaded, total: cacheFiles.length });
        }
        catch (error) {
            this.logger.error('加载持久化缓存失败', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * 保存持久化缓存
     */
    async savePersistentCache() {
        try {
            let saved = 0;
            for (const [key, entry] of this.memoryCache.entries()) {
                if (saved >= 50)
                    break; // 限制保存数量
                try {
                    const filePath = path.join(this.cacheDir, `${key}.cache.json`);
                    const content = JSON.stringify(entry, null, 2);
                    await fs.writeFile(filePath, content, 'utf-8');
                    saved++;
                }
                catch (error) {
                    this.logger.warn('保存缓存文件失败', { key, error: error instanceof Error ? error.message : String(error) });
                }
            }
            this.logger.info('持久化缓存保存完成', { saved });
        }
        catch (error) {
            this.logger.error('保存持久化缓存失败', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * 从磁盘获取缓存条目
     */
    async getFromDisk(key) {
        try {
            const filePath = path.join(this.cacheDir, `${key}.cache.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
    /**
     * 保存到磁盘
     */
    async saveToDisk(key, entry) {
        try {
            const filePath = path.join(this.cacheDir, `${key}.cache.json`);
            const content = JSON.stringify(entry, null, 2);
            await fs.writeFile(filePath, content, 'utf-8');
        }
        catch (error) {
            throw new Error(`保存到磁盘失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 从磁盘删除
     */
    async deleteFromDisk(key) {
        try {
            const filePath = path.join(this.cacheDir, `${key}.cache.json`);
            await fs.unlink(filePath);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw new Error(`从磁盘删除失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
    /**
     * 清空缓存目录
     */
    async clearCacheDirectory() {
        try {
            const files = await fs.readdir(this.cacheDir);
            const cacheFiles = files.filter(f => f.endsWith('.cache.json'));
            for (const file of cacheFiles) {
                try {
                    const filePath = path.join(this.cacheDir, file);
                    await fs.unlink(filePath);
                }
                catch (error) {
                    this.logger.warn('删除缓存文件失败', { file, error: error instanceof Error ? error.message : String(error) });
                }
            }
            this.logger.info('缓存目录已清空', { fileCount: cacheFiles.length });
        }
        catch (error) {
            throw new Error(`清空缓存目录失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 检查是否过期
     */
    isExpired(entry) {
        return Date.now() > entry.expiresAt;
    }
    /**
     * 估算数据大小
     */
    estimateSize(value) {
        try {
            const json = JSON.stringify(value);
            return Buffer.byteLength(json, 'utf-8');
        }
        catch {
            return 1024; // 默认大小
        }
    }
    /**
     * 强制执行大小限制
     */
    async enforceSizeLimit(newEntrySize) {
        const maxSizeBytes = this.maxSizeMb * 1024 * 1024;
        const currentSizeBytes = this.stats.size + newEntrySize;
        if (currentSizeBytes <= maxSizeBytes) {
            return;
        }
        this.logger.info('缓存大小超出限制，开始清理', {
            current: `${(currentSizeBytes / 1024 / 1024).toFixed(2)}MB`,
            max: `${this.maxSizeMb}MB`,
            newEntry: `${(newEntrySize / 1024).toFixed(2)}KB`,
        });
        // 清理策略：1. 过期条目 2. LRU（最近最少使用）
        await this.cleanupExpiredEntries();
        // 如果仍然超出限制，使用LRU策略
        if (this.stats.size + newEntrySize > maxSizeBytes) {
            await this.cleanupByLRU(maxSizeBytes - newEntrySize);
        }
    }
    /**
     * 清理过期条目
     */
    async cleanupExpiredEntries() {
        let cleaned = 0;
        for (const [key, entry] of this.memoryCache.entries()) {
            if (this.isExpired(entry)) {
                await this.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            this.logger.info('清理过期缓存条目', { count: cleaned });
        }
    }
    /**
     * 按LRU策略清理
     */
    async cleanupByLRU(targetSizeBytes) {
        // 将条目按最后访问时间排序
        const entries = Array.from(this.memoryCache.entries())
            .map(([key, entry]) => ({ key, entry }))
            .sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed); // 最早访问的排前面
        let currentSize = this.stats.size;
        let cleaned = 0;
        for (const { key, entry } of entries) {
            if (currentSize <= targetSizeBytes) {
                break;
            }
            await this.delete(key);
            currentSize -= entry.size;
            cleaned++;
        }
        if (cleaned > 0) {
            this.logger.info('按LRU策略清理缓存', {
                count: cleaned,
                freed: `${((this.stats.size - currentSize) / 1024 / 1024).toFixed(2)}MB`,
                target: `${(targetSizeBytes / 1024 / 1024).toFixed(2)}MB`,
            });
        }
    }
    /**
     * 启动定期清理任务
     */
    startCleanupTask() {
        this.cleanupInterval = setInterval(async () => {
            try {
                await this.cleanupExpiredEntries();
                this.logger.debug('定期缓存清理完成');
            }
            catch (error) {
                this.logger.error('定期缓存清理失败', { error: error instanceof Error ? error.message : String(error) });
            }
        }, 5 * 60 * 1000); // 每5分钟清理一次
        this.logger.info('定期清理任务已启动', { interval: '5分钟' });
    }
    // ================ 统计更新方法 ================
    updateStatsAfterHit(_size) {
        this.stats.hits++;
        this.updateHitRate();
    }
    updateStatsAfterMiss() {
        this.stats.misses++;
        this.updateHitRate();
    }
    updateStatsAfterSet(size) {
        this.stats.size += size;
        this.stats.entries = this.memoryCache.size;
    }
    updateStatsAfterDelete(size) {
        this.stats.size = Math.max(0, this.stats.size - size);
        this.stats.entries = this.memoryCache.size;
    }
    updateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=cache-manager.js.map