"use strict";
/**
 * 市场数据获取任务执行器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataTaskExecutor = void 0;
const base_executor_1 = require("../base-executor");
const data_processing_1 = require("@/data_processing");
class MarketDataTaskExecutor extends base_executor_1.BaseTaskExecutor {
    constructor(logger) {
        super(logger, 'market_data', '获取市场数据并分析趋势');
    }
    /**
     * 执行实际任务
     */
    async executeTask(config) {
        const currencyIds = this.parseCurrencyIds(config);
        const forceRefresh = config.forceRefresh || false;
        this.logProgress(10, '初始化数据服务', { currencyCount: currencyIds.length });
        // 创建数据服务
        const logger = this.logger.child({ task: 'market_data' });
        const dataService = (0, data_processing_1.createDataService)(logger);
        try {
            await dataService.start();
            this.logProgress(30, '数据服务启动成功');
            // 获取市场数据
            this.logProgress(50, '获取市场数据中...');
            const marketData = await dataService.getMarketData(currencyIds, forceRefresh);
            this.logProgress(80, '数据获取完成，正在分析...');
            // 提取关键信息
            const result = {
                currencies: Object.entries(marketData.currencies).reduce((acc, [symbol, data]) => {
                    acc[symbol] = {
                        price: data.currentPrice,
                        change24h: data.priceChangePercentage24h,
                        marketCap: data.marketCap,
                        volume24h: data.volume24h,
                    };
                    return acc;
                }, {}),
                trends: marketData.trends.map(trend => ({
                    direction: trend.direction,
                    strength: trend.strength,
                    description: trend.description,
                })),
                anomalies: marketData.anomalies?.map(anomaly => ({
                    type: anomaly.type,
                    severity: anomaly.severity,
                    description: anomaly.description,
                })),
            };
            this.logProgress(100, '任务完成', {
                currencyCount: Object.keys(result.currencies).length,
                trendCount: result.trends.length,
                anomalyCount: result.anomalies?.length || 0,
            });
            // 获取性能指标
            const metrics = dataService.getMetrics();
            this.logger.info('市场数据任务性能指标', {
                cacheHitRate: `${metrics.cacheHitRate}%`,
                averageFetchTime: `${metrics.averageFetchTime}ms`,
                totalRequests: metrics.totalRequests,
            });
            await dataService.stop();
            return result;
        }
        catch (error) {
            await dataService.stop().catch(() => { });
            throw error;
        }
    }
    /**
     * 获取必需字段
     */
    getRequiredFields() {
        return ['currencyIds'];
    }
    /**
     * 解析货币ID列表
     */
    parseCurrencyIds(config) {
        const currencyIds = config.currencyIds;
        if (typeof currencyIds === 'string') {
            return currencyIds.split(',').map(id => id.trim());
        }
        else if (Array.isArray(currencyIds)) {
            return currencyIds.map(id => String(id).trim());
        }
        else {
            // 默认监控主要加密货币
            return ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];
        }
    }
    /**
     * 扩展配置验证
     */
    validateConfig(config) {
        const baseValidation = super.validateConfig(config);
        if (!baseValidation.valid) {
            return baseValidation;
        }
        const errors = [];
        const currencyIds = this.parseCurrencyIds(config);
        // 验证货币ID数量
        if (currencyIds.length === 0) {
            errors.push('至少需要一个货币ID');
        }
        if (currencyIds.length > 50) {
            errors.push('货币ID数量不能超过50个');
        }
        // 验证货币ID格式
        for (const id of currencyIds) {
            if (!/^[A-Z0-9-]{1,20}$/i.test(id)) {
                errors.push(`无效的货币ID格式: ${id}`);
            }
        }
        // 验证刷新标志
        if (config.forceRefresh !== undefined && typeof config.forceRefresh !== 'boolean') {
            errors.push('forceRefresh必须是布尔值');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
exports.MarketDataTaskExecutor = MarketDataTaskExecutor;
//# sourceMappingURL=market-data-task.js.map