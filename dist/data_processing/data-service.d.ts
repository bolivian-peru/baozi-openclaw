/**
 * 数据服务实现
 * 整合数据获取、处理、缓存和报告生成
 */
import { IDataService, MarketData, DataSource } from './interface';
import { Logger } from '@/utils/logger';
export declare class DataService implements IDataService {
    private logger;
    private fetcher;
    private processor;
    private cacheManager;
    private dataSources;
    private performanceMetrics;
    constructor(logger: Logger, dataSources?: DataSource[]);
    /**
     * 启动数据服务
     */
    start(): Promise<void>;
    /**
     * 停止数据服务
     */
    stop(): Promise<void>;
    /**
     * 获取完整的市场数据（包括缓存逻辑）
     */
    getMarketData(currencyIds: string[], forceRefresh?: boolean): Promise<MarketData>;
    /**
     * 刷新缓存数据
     */
    refreshCache(): Promise<void>;
    /**
     * 获取数据源状态
     */
    getDataSourceStatus(): Promise<Array<{
        source: DataSource;
        status: 'healthy' | 'degraded' | 'unhealthy';
        lastUpdate: string;
        error?: string;
    }>>;
    /**
     * 获取性能指标
     */
    getMetrics(): {
        totalRequests: number;
        cacheHits: number;
        cacheMisses: number;
        cacheHitRate: number;
        averageFetchTime: number;
        lastFetchTimestamp: number;
        dataSources: Record<string, any>;
    };
    /**
     * 获取缓存统计信息
     */
    getCacheStats(): Promise<import("./cache-manager").CacheStats>;
    /**
     * 手动清除缓存
     */
    clearCache(): Promise<void>;
    /**
     * 生成缓存键
     */
    private generateCacheKey;
    /**
     * 解析缓存键
     */
    private parseCacheKey;
    /**
     * 过滤指定货币
     */
    private filterCurrencies;
    /**
     * 构建市场数据对象
     */
    private buildMarketData;
    /**
     * 更新性能指标
     */
    private updatePerformanceMetrics;
    /**
     * 验证货币ID
     */
    private validateCurrencyIds;
}
//# sourceMappingURL=data-service.d.ts.map