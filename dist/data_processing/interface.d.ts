/**
 * 数据处理模块接口定义
 */
import { MarketData, CurrencyData, MarketTrend, MarketAnomaly, DataSource } from '@/types';
export type { MarketData, CurrencyData, MarketTrend, MarketAnomaly, DataSource };
export interface IDataFetcher {
    /**
     * 从指定数据源获取数据
     */
    fetchFromSource(source: DataSource): Promise<CurrencyData[]>;
    /**
     * 获取所有启用的数据源的数据
     */
    fetchAllData(): Promise<Record<string, CurrencyData[]>>;
    /**
     * 测试数据源连接
     */
    testConnection(source: DataSource): Promise<boolean>;
}
export interface IDataProcessor {
    /**
     * 合并多个数据源的数据
     */
    mergeData(data: Record<string, CurrencyData[]>): CurrencyData[];
    /**
     * 分析市场趋势
     */
    analyzeTrends(data: CurrencyData[]): MarketTrend[];
    /**
     * 检测市场异常
     */
    detectAnomalies(data: CurrencyData[]): MarketAnomaly[];
    /**
     * 验证数据质量
     */
    validateData(data: CurrencyData[]): {
        isValid: boolean;
        issues: string[];
    };
    /**
     * 清洗和转换数据
     */
    cleanData(data: CurrencyData[]): CurrencyData[];
}
export interface ICacheManager {
    /**
     * 从缓存获取数据
     */
    get(key: string): Promise<any>;
    /**
     * 保存数据到缓存
     */
    set(key: string, value: any, ttl?: number): Promise<void>;
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
    getStats(): {
        size: number;
        hits: number;
        misses: number;
        hitRate: number;
    };
}
export interface IDataService {
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
        averageFetchTime: number;
        dataSources: Record<string, any>;
    };
}
//# sourceMappingURL=interface.d.ts.map