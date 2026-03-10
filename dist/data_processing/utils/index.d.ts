/**
 * 数据处理工具函数
 */
/**
 * 格式化货币价格
 */
export declare function formatCurrencyPrice(price: number): string;
/**
 * 格式化百分比变化
 */
export declare function formatPercentageChange(percentage: number): string;
/**
 * 格式化市场容量
 */
export declare function formatMarketCap(marketCap: number): string;
/**
 * 格式化交易量
 */
export declare function formatVolume(volume: number): string;
/**
 * 计算价格变化颜色
 */
export declare function getPriceChangeColor(percentage: number): string;
/**
 * 计算趋势强度图标
 */
export declare function getTrendIcon(direction: 'up' | 'down' | 'neutral', strength: number): string;
/**
 * 计算异常严重性图标
 */
export declare function getAnomalyIcon(severity: 'low' | 'medium' | 'high' | 'critical'): string;
/**
 * 生成缓存键
 */
export declare function generateCacheKey(prefix: string, params: Record<string, any>): string;
/**
 * 简单哈希函数
 */
export declare function simpleHash(str: string): string;
/**
 * 延迟执行
 */
export declare function delay(ms: number): Promise<void>;
/**
 * 重试函数
 */
export declare function retry<T>(operation: () => Promise<T>, maxAttempts?: number, delayMs?: number): Promise<T>;
/**
 * 批量处理数组
 */
export declare function processBatch<T, R>(items: T[], processor: (item: T) => Promise<R>, batchSize?: number): Promise<R[]>;
/**
 * 数据去重
 */
export declare function deduplicate<T>(items: T[], keyFn: (item: T) => string): T[];
/**
 * 数据排序
 */
export declare function sortData<T>(items: T[], keyFn: (item: T) => number, descending?: boolean): T[];
/**
 * 数据过滤
 */
export declare function filterData<T>(items: T[], predicate: (item: T) => boolean, limit?: number): T[];
/**
 * 计算统计数据
 */
export declare function calculateStatistics(numbers: number[]): {
    min: number;
    max: number;
    average: number;
    median: number;
    standardDeviation: number;
};
//# sourceMappingURL=index.d.ts.map