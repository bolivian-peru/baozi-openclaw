/**
 * 数据获取器实现
 * 负责从多个数据源获取市场数据
 */
import { IDataFetcher } from './interface';
import { DataSource, CurrencyData } from '@/types';
import { Logger } from '@/utils/logger';
export declare class DataFetcher implements IDataFetcher {
    private logger;
    private httpClients;
    constructor(logger: Logger);
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
    /**
     * 从API获取数据
     */
    private fetchFromAPI;
    /**
     * 从网页爬虫获取数据
     */
    private fetchFromScraper;
    /**
     * 从数据流获取数据
     */
    private fetchFromFeed;
    /**
     * 获取HTTP客户端
     */
    private getHttpClient;
    /**
     * 获取模拟数据（用于演示）
     */
    private fetchMockData;
    /**
     * 应用速率限制
     */
    private _applyRateLimit;
}
//# sourceMappingURL=data-fetcher.d.ts.map