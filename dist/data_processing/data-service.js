"use strict";
/**
 * 数据服务实现
 * 整合数据获取、处理、缓存和报告生成
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataService = void 0;
const data_fetcher_1 = require("./data-fetcher");
const data_processor_1 = require("./data-processor");
const cache_manager_1 = require("./cache-manager");
const errors_1 = require("@/utils/errors");
class DataService {
    logger;
    fetcher;
    processor;
    cacheManager;
    dataSources;
    performanceMetrics;
    constructor(logger, dataSources = []) {
        this.logger = logger.child({ component: 'DataService' });
        this.dataSources = dataSources;
        this.fetcher = new data_fetcher_1.DataFetcher(logger);
        this.processor = new data_processor_1.DataProcessor(logger);
        this.cacheManager = new cache_manager_1.CacheManager(logger, {
            cacheDir: './data-cache',
            maxSizeMb: 100,
            defaultTtlSeconds: 300, // 5分钟
        });
        this.performanceMetrics = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageFetchTime: 0,
            fetchTimeHistory: [],
            lastFetchTimestamp: 0,
        };
        this.logger.info('数据服务初始化完成', {
            dataSourceCount: dataSources.length,
            cacheEnabled: true,
        });
    }
    /**
     * 启动数据服务
     */
    async start() {
        try {
            await this.cacheManager.start();
            this.logger.info('数据服务启动成功');
        }
        catch (error) {
            this.logger.error('数据服务启动失败', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw errors_1.AppErrorFactory.createDataFetchError('start', error instanceof Error ? error : new Error(String(error)), {
                operation: 'service_start',
            });
        }
    }
    /**
     * 停止数据服务
     */
    async stop() {
        try {
            await this.cacheManager.stop();
            this.logger.info('数据服务已停止');
        }
        catch (error) {
            this.logger.error('数据服务停止失败', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw errors_1.AppErrorFactory.createDataFetchError('stop', error instanceof Error ? error : new Error(String(error)), {
                operation: 'service_stop',
            });
        }
    }
    /**
     * 获取完整的市场数据（包括缓存逻辑）
     */
    async getMarketData(currencyIds, forceRefresh = false) {
        const startTime = Date.now();
        const cacheKey = this.generateCacheKey('market_data', currencyIds);
        this.logger.info('获取市场数据', {
            currencyCount: currencyIds.length,
            currencies: currencyIds.slice(0, 5),
            forceRefresh,
            cacheKey,
        });
        try {
            // 检查缓存（除非强制刷新）
            let marketData = null;
            if (!forceRefresh) {
                marketData = await this.cacheManager.get(cacheKey);
                if (marketData) {
                    this.performanceMetrics.cacheHits++;
                    this.logger.info('从缓存获取市场数据', {
                        cacheKey,
                        age: `${(Date.now() - new Date(marketData.timestamp).getTime()) / 1000}秒`,
                    });
                    this.updatePerformanceMetrics(startTime, true);
                    return marketData;
                }
                this.performanceMetrics.cacheMisses++;
            }
            // 缓存未命中或强制刷新，获取新数据
            this.logger.info('从数据源获取市场数据', { cacheMiss: !forceRefresh });
            // 1. 从所有数据源获取数据
            const allData = await this.fetcher.fetchAllData();
            // 2. 合并数据
            const mergedData = this.processor.mergeData(allData);
            // 3. 过滤指定货币
            const filteredData = this.filterCurrencies(mergedData, currencyIds);
            // 4. 清洗数据
            const cleanedData = this.processor.cleanData(filteredData);
            // 5. 验证数据质量
            const validation = this.processor.validateData(cleanedData);
            if (!validation.isValid) {
                this.logger.warn('数据验证发现问题', {
                    issueCount: validation.issues.length,
                    issues: validation.issues.slice(0, 3),
                });
            }
            // 6. 分析趋势
            const trends = this.processor.analyzeTrends(cleanedData);
            // 7. 检测异常
            const anomalies = this.processor.detectAnomalies(cleanedData);
            // 8. 构建市场数据对象
            marketData = this.buildMarketData(cleanedData, trends, anomalies, Object.keys(allData));
            // 9. 保存到缓存
            await this.cacheManager.set(cacheKey, marketData, 300); // 5分钟TTL
            this.logger.info('市场数据获取完成', {
                currencyCount: cleanedData.length,
                trendCount: trends.length,
                anomalyCount: anomalies.length,
                fetchTime: `${Date.now() - startTime}ms`,
                cached: true,
            });
            this.updatePerformanceMetrics(startTime, false);
            return marketData;
        }
        catch (error) {
            this.logger.error('获取市场数据失败', {
                error: error instanceof Error ? error.message : String(error),
                currencyCount: currencyIds.length,
                fetchTime: `${Date.now() - startTime}ms`,
            });
            // 尝试返回缓存数据（即使已过期）
            if (!forceRefresh) {
                try {
                    const staleData = await this.cacheManager.get(cacheKey);
                    if (staleData) {
                        this.logger.warn('返回过期的缓存数据', { cacheKey });
                        return staleData;
                    }
                }
                catch (cacheError) {
                    // 忽略缓存错误
                }
            }
            throw errors_1.AppErrorFactory.createDataFetchError('getMarketData', error instanceof Error ? error : new Error(String(error)), {
                currencyIds,
                forceRefresh,
                cacheKey,
            });
        }
    }
    /**
     * 刷新缓存数据
     */
    async refreshCache() {
        this.logger.info('刷新缓存数据');
        try {
            // 获取所有活跃的缓存键
            const cacheEntries = await this.cacheManager.getEntries(100);
            let refreshed = 0;
            let failed = 0;
            for (const entry of cacheEntries) {
                try {
                    // 解析货币ID
                    const currencyIds = this.parseCacheKey(entry.key);
                    if (currencyIds) {
                        // 强制刷新数据
                        await this.getMarketData(currencyIds, true);
                        refreshed++;
                    }
                }
                catch (error) {
                    this.logger.warn('刷新缓存条目失败', {
                        key: entry.key,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    failed++;
                }
            }
            this.logger.info('缓存刷新完成', {
                refreshed,
                failed,
                total: cacheEntries.length,
            });
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('刷新缓存失败', { error: err.message });
            throw errors_1.AppErrorFactory.createCacheError(err, 'refresh_cache');
        }
    }
    /**
     * 获取数据源状态
     */
    async getDataSourceStatus() {
        const statuses = [];
        this.logger.info('检查数据源状态');
        for (const source of this.dataSources) {
            try {
                const isHealthy = await this.fetcher.testConnection(source);
                statuses.push({
                    source,
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    lastUpdate: new Date().toISOString(),
                    ...(isHealthy ? {} : { error: '连接测试失败' }),
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                statuses.push({
                    source,
                    status: 'unhealthy',
                    lastUpdate: new Date().toISOString(),
                    error: errorMessage,
                });
                this.logger.warn('数据源状态检查失败', {
                    sourceId: source.id,
                    error: errorMessage,
                });
            }
        }
        // 如果没有配置数据源，返回模拟状态
        if (statuses.length === 0) {
            statuses.push({
                source: {
                    id: 'mock',
                    name: '模拟数据源',
                    type: 'api',
                    url: 'mock://data',
                    priority: 5,
                    enabled: true,
                },
                status: 'healthy',
                lastUpdate: new Date().toISOString(),
            });
        }
        this.logger.info('数据源状态检查完成', {
            healthy: statuses.filter(s => s.status === 'healthy').length,
            unhealthy: statuses.filter(s => s.status === 'unhealthy').length,
            total: statuses.length,
        });
        return statuses;
    }
    /**
     * 获取性能指标
     */
    getMetrics() {
        const totalRequests = this.performanceMetrics.totalRequests;
        const cacheHitRate = totalRequests > 0
            ? (this.performanceMetrics.cacheHits / totalRequests) * 100
            : 0;
        const dataSources = this.dataSources.reduce((acc, source) => {
            acc[source.id] = {
                enabled: source.enabled,
                priority: source.priority,
                type: source.type,
            };
            return acc;
        }, {});
        return {
            totalRequests,
            cacheHits: this.performanceMetrics.cacheHits,
            cacheMisses: this.performanceMetrics.cacheMisses,
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            averageFetchTime: this.performanceMetrics.averageFetchTime,
            lastFetchTimestamp: this.performanceMetrics.lastFetchTimestamp,
            dataSources,
        };
    }
    /**
     * 获取缓存统计信息
     */
    async getCacheStats() {
        return this.cacheManager.getStats();
    }
    /**
     * 手动清除缓存
     */
    async clearCache() {
        await this.cacheManager.clear();
        this.logger.info('手动清除缓存完成');
    }
    // ================ 私有方法 ================
    /**
     * 生成缓存键
     */
    generateCacheKey(prefix, currencyIds) {
        const sortedIds = [...currencyIds].sort();
        const idsHash = sortedIds.join('_').toLowerCase();
        return `${prefix}_${idsHash}`;
    }
    /**
     * 解析缓存键
     */
    parseCacheKey(cacheKey) {
        try {
            const match = cacheKey.match(/^market_data_(.+)$/);
            if (match) {
                return match[1].split('_');
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * 过滤指定货币
     */
    filterCurrencies(data, currencyIds) {
        if (currencyIds.length === 0) {
            return data;
        }
        const idSet = new Set(currencyIds.map(id => id.toUpperCase()));
        return data.filter(record => idSet.has(record.symbol.toUpperCase()));
    }
    /**
     * 构建市场数据对象
     */
    buildMarketData(currencies, trends, anomalies, sources) {
        const currencyMap = {};
        currencies.forEach(currency => {
            currencyMap[currency.symbol] = currency;
        });
        return {
            timestamp: new Date().toISOString(),
            sources,
            currencies: currencyMap,
            trends,
            ...(anomalies.length > 0 ? { anomalies } : {}),
        };
    }
    /**
     * 更新性能指标
     */
    updatePerformanceMetrics(startTime, fromCache) {
        const fetchTime = Date.now() - startTime;
        this.performanceMetrics.totalRequests++;
        this.performanceMetrics.lastFetchTimestamp = Date.now();
        if (!fromCache) {
            this.performanceMetrics.fetchTimeHistory.push(fetchTime);
            // 保持最近100次记录
            if (this.performanceMetrics.fetchTimeHistory.length > 100) {
                this.performanceMetrics.fetchTimeHistory.shift();
            }
            // 计算平均获取时间
            const sum = this.performanceMetrics.fetchTimeHistory.reduce((a, b) => a + b, 0);
            this.performanceMetrics.averageFetchTime = Math.round(sum / this.performanceMetrics.fetchTimeHistory.length);
        }
    }
    /**
     * 验证货币ID
     */
    // @ts-ignore TS6133: 暂时未使用
    validateCurrencyIds(currencyIds) {
        if (!Array.isArray(currencyIds)) {
            throw errors_1.AppErrorFactory.createValidationError('currencyIds', '货币ID必须为数组');
        }
        if (currencyIds.length === 0) {
            throw errors_1.AppErrorFactory.createValidationError('currencyIds', '至少需要一个货币ID');
        }
        if (currencyIds.length > 100) {
            throw errors_1.AppErrorFactory.createValidationError('currencyIds', '货币ID数量不能超过100个');
        }
        currencyIds.forEach((id, index) => {
            if (typeof id !== 'string') {
                throw errors_1.AppErrorFactory.createValidationError(`currencyIds[${index}]`, '货币ID必须为字符串');
            }
            if (!/^[A-Z0-9-]{1,20}$/i.test(id)) {
                throw errors_1.AppErrorFactory.createValidationError(`currencyIds[${index}]`, `无效的货币ID格式: ${id}`);
            }
        });
    }
}
exports.DataService = DataService;
//# sourceMappingURL=data-service.js.map