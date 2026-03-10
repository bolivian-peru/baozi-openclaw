"use strict";
/**
 * MCP服务主模块
 * 整合所有MCP相关组件，提供统一的API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPService = void 0;
exports.getMCPService = getMCPService;
exports.destroyMCPService = destroyMCPService;
const client_1 = require("./client");
const error_handler_1 = require("./error-handler");
const request_builder_1 = require("./request-builder");
const logger_1 = require("@/utils/logger");
const config_1 = require("@/config");
class MCPService {
    client;
    errorHandler;
    requestBuilder;
    logger;
    config;
    isInitialized = false;
    constructor(config) {
        // 初始化配置
        this.config = config || this.loadConfigFromManager();
        // 初始化日志
        this.logger = logger_1.Logger.getInstance();
        // 初始化组件
        this.errorHandler = new error_handler_1.MCPErrorHandler();
        this.requestBuilder = new request_builder_1.MCPRequestBuilder();
        // 初始化客户端
        this.client = new client_1.MCPClient(this.config, 
        // @ts-ignore
        this.logger.child({ module: 'MCPService' }), this.errorHandler, this.requestBuilder);
        this.isInitialized = true;
        this.logger.info('MCP服务初始化完成');
    }
    /**
     * 从配置管理器加载配置
     */
    loadConfigFromManager() {
        try {
            const configManager = config_1.ConfigManager.getInstance();
            const appConfig = configManager.getConfig();
            return appConfig.mcp;
        }
        catch (error) {
            this.logger.error('从配置管理器加载MCP配置失败', { error: error.message });
            // 返回默认配置
            return {
                url: '@baozi.bet/mcp-server',
                apiKey: '',
                timeoutMs: 30000,
                retryAttempts: 3,
                retryDelayMs: 1000,
            };
        }
    }
    async connect() {
        this.validateInitialization();
        try {
            await this.client.connect();
            this.logger.info('MCP服务连接成功');
        }
        catch (error) {
            this.logger.error('MCP服务连接失败', { error: error.message });
            throw error;
        }
    }
    async disconnect() {
        this.validateInitialization();
        try {
            await this.client.disconnect();
            this.logger.info('MCP服务已断开连接');
        }
        catch (error) {
            this.logger.error('断开MCP服务连接时出错', { error: error.message });
            // 忽略断开连接错误
        }
    }
    getConnectionStatus() {
        this.validateInitialization();
        return this.client.getConnectionStatus();
    }
    async fetchMarketData(currencyIds, timeframe = '24h') {
        this.validateInitialization();
        try {
            this.logger.info('开始获取市场数据', {
                currencyCount: currencyIds.length,
                timeframe,
            });
            const marketData = await this.client.fetchMarketData(currencyIds, timeframe);
            this.logger.info('市场数据获取完成', {
                currencyCount: Object.keys(marketData.currencies).length,
                trends: marketData.trends?.length || 0,
            });
            return marketData;
        }
        catch (error) {
            this.logger.error('获取市场数据失败', {
                error: error.message,
                currencyIds: currencyIds.length,
                timeframe,
            });
            throw error;
        }
    }
    async generateReport(data, language = 'en') {
        this.validateInitialization();
        try {
            this.logger.info('开始生成市场报告', {
                language,
                dataPoints: Object.keys(data.currencies).length,
            });
            const report = await this.client.generateReport(data, language);
            this.logger.info('市场报告生成完成', {
                reportId: report.id,
                language,
                generationTime: `${report.metadata.generationTime}ms`,
            });
            return report;
        }
        catch (error) {
            this.logger.error('生成市场报告失败', {
                error: error.message,
                language,
            });
            throw error;
        }
    }
    async sendReport(report, channel) {
        this.validateInitialization();
        try {
            this.logger.info('开始发送市场报告', {
                reportId: report.id,
                channel,
            });
            await this.client.sendReport(report, channel);
            this.logger.info('市场报告发送完成', {
                reportId: report.id,
                channel,
            });
        }
        catch (error) {
            this.logger.error('发送市场报告失败', {
                error: error.message,
                channel,
                reportId: report.id,
            });
            throw error;
        }
    }
    async healthCheck() {
        this.validateInitialization();
        try {
            const isHealthy = await this.client.healthCheck();
            if (isHealthy) {
                this.logger.debug('MCP服务健康检查通过');
            }
            else {
                this.logger.warn('MCP服务健康检查失败');
            }
            return isHealthy;
        }
        catch (error) {
            this.logger.error('MCP服务健康检查出错', { error: error.message });
            return false;
        }
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(config) {
        this.validateInitialization();
        this.config = { ...this.config, ...config };
        // 重新创建客户端以应用新配置
        this.client = new client_1.MCPClient(this.config, 
        // @ts-ignore
        this.logger.child({ module: 'MCPService' }), this.errorHandler, this.requestBuilder);
        this.logger.info('MCP服务配置已更新', {
            changes: Object.keys(config),
        });
    }
    getMetrics() {
        this.validateInitialization();
        return this.client.getMetrics();
    }
    reset() {
        this.validateInitialization();
        // 重新初始化客户端
        this.client = new client_1.MCPClient(
        // @ts-ignore
        this.config, this.logger.child({ module: 'MCPService' }), this.errorHandler, this.requestBuilder);
        this.logger.info('MCP服务已重置');
    }
    /**
     * 获取完整的市场报告（一站式服务）
     */
    async getCompleteMarketReport(options) {
        this.validateInitialization();
        const { currencyIds, timeframe = '24h', language = 'en', channel, } = options;
        this.logger.info('开始生成完整市场报告', {
            currencyCount: currencyIds.length,
            timeframe,
            language,
            channel: channel || 'none',
        });
        try {
            // 获取市场数据
            const marketData = await this.fetchMarketData(currencyIds, timeframe);
            // 生成报告
            const report = await this.generateReport(marketData, language);
            // 发送报告（如果指定了通道）
            if (channel) {
                await this.sendReport(report, channel);
            }
            this.logger.info('完整市场报告生成完成', {
                reportId: report.id,
                dataPoints: Object.keys(marketData.currencies).length,
                sentToChannel: !!channel,
            });
            return { data: marketData, report };
        }
        catch (error) {
            this.logger.error('生成完整市场报告失败', {
                error: error.message,
                stage: error.stage || 'unknown',
            });
            throw error;
        }
    }
    /**
     * 批量处理多个货币对
     */
    async batchProcessCurrencies(currencyBatches, timeframe = '24h', language = 'en') {
        this.validateInitialization();
        this.logger.info('开始批量处理货币', {
            batches: currencyBatches.length,
            totalCurrencies: currencyBatches.flat().length,
            timeframe,
            language,
        });
        const results = {
            data: [],
            reports: [],
        };
        for (let i = 0; i < currencyBatches.length; i++) {
            const batch = currencyBatches[i];
            try {
                this.logger.debug(`处理批次 ${i + 1}/${currencyBatches.length}`, {
                    batchSize: batch.length,
                });
                const { data, report } = await this.getCompleteMarketReport({
                    currencyIds: batch,
                    timeframe,
                    language,
                });
                results.data.push(data);
                results.reports.push(report);
                this.logger.debug(`批次 ${i + 1} 处理完成`, {
                    reportId: report.id,
                });
                // 添加批次间延迟以避免速率限制
                if (i < currencyBatches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            catch (error) {
                this.logger.error(`批次 ${i + 1} 处理失败`, {
                    error: error.message,
                    batch: batch,
                });
                // 继续处理下一个批次
                continue;
            }
        }
        this.logger.info('批量处理完成', {
            successfulBatches: results.data.length,
            totalReports: results.reports.length,
        });
        return results;
    }
    /**
     * 验证服务是否已初始化
     */
    validateInitialization() {
        if (!this.isInitialized) {
            throw new Error('MCP服务未初始化，请先调用构造函数');
        }
    }
    /**
     * 静态工厂方法
     */
    static async create(config) {
        const service = new MCPService(config);
        // 自动连接
        try {
            await service.connect();
        }
        catch (error) {
            service.logger.warn('自动连接失败，服务将在需要时重试', {
                error: error.message,
            });
        }
        return service;
    }
    /**
     * 销毁服务
     */
    async destroy() {
        try {
            await this.disconnect();
            this.isInitialized = false;
            this.logger.info('MCP服务已销毁');
        }
        catch (error) {
            this.logger.error('销毁MCP服务时出错', { error: error.message });
            throw error;
        }
    }
}
exports.MCPService = MCPService;
// 导出单例实例
let mcpServiceInstance = null;
async function getMCPService(config) {
    if (!mcpServiceInstance) {
        mcpServiceInstance = await MCPService.create(config);
    }
    return mcpServiceInstance;
}
async function destroyMCPService() {
    if (mcpServiceInstance) {
        await mcpServiceInstance.destroy();
        mcpServiceInstance = null;
    }
}
//# sourceMappingURL=index.js.map