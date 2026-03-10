"use strict";
/**
 * 报告生成任务执行器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerationTaskExecutor = void 0;
const base_executor_1 = require("../base-executor");
const data_processing_1 = require("@/data_processing");
const report_generation_1 = require("@/report_generation");
class ReportGenerationTaskExecutor extends base_executor_1.BaseTaskExecutor {
    constructor(logger) {
        super(logger, 'report_generation', '生成市场报告并导出');
    }
    /**
     * 执行实际任务
     */
    async executeTask(config) {
        const currencyIds = this.parseCurrencyIds(config);
        const languages = this.parseLanguages(config);
        const format = config.format || 'markdown';
        const exportToFile = config.exportToFile || false;
        const channelConfigs = this.parseChannelConfigs(config);
        this.logProgress(10, '初始化服务', {
            currencyCount: currencyIds.length,
            languages: languages.join(', '),
        });
        // 创建数据服务
        const dataLogger = this.logger.child({ task: 'data_service' });
        const dataService = (0, data_processing_1.createDataService)(dataLogger);
        // 创建报告服务
        const reportLogger = this.logger.child({ task: 'report_service' });
        const reportService = (0, report_generation_1.createReportService)(reportLogger, {
            defaultLanguage: languages[0],
            defaultFormat: format,
            autoExport: exportToFile,
            exportFormats: exportToFile ? [format] : [],
        });
        try {
            await dataService.start();
            this.logProgress(20, '数据服务启动成功');
            // 获取市场数据
            this.logProgress(40, '获取市场数据中...');
            const marketData = await dataService.getMarketData(currencyIds, false);
            this.logProgress(60, '数据获取完成，开始生成报告...');
            // 生成完整报告
            const reportOptions = {
                languages,
                format: format,
                exportToFile,
                sendToChannels: channelConfigs.length > 0 ? channelConfigs : undefined,
            };
            const result = await reportService.getFullReport(marketData, reportOptions);
            this.logProgress(90, '报告生成完成', {
                reportCount: Object.keys(result.reports).length,
                exportCount: Object.keys(result.exports).length,
            });
            // 提取第一个报告ID
            const firstReport = Object.values(result.reports)[0];
            const reportId = firstReport?.id || 'unknown';
            // 获取报告统计
            const reportStats = reportService.getReportStats();
            this.logger.info('报告生成任务统计', {
                totalGenerated: reportStats.totalGenerated,
                byLanguage: JSON.stringify(reportStats.byLanguage),
                lastGeneration: reportStats.lastGeneration,
            });
            await dataService.stop();
            this.logProgress(100, '任务完成', {
                reportId,
                success: true,
            });
            return {
                reportId,
                languages,
                formats: [format],
                exports: result.exports,
                deliveryStatus: result.deliveryStatus,
            };
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
     * 解析语言列表
     */
    parseLanguages(config) {
        const languages = config.languages;
        const defaultLanguages = ['en'];
        if (typeof languages === 'string') {
            const langArray = languages.split(',').map(l => l.trim());
            return langArray.filter(l => ['en', 'zh-CN'].includes(l));
        }
        else if (Array.isArray(languages)) {
            return languages.map(l => String(l).trim())
                .filter(l => ['en', 'zh-CN'].includes(l));
        }
        return defaultLanguages;
    }
    /**
     * 解析渠道配置
     */
    parseChannelConfigs(config) {
        const channels = config.sendToChannels;
        if (!channels) {
            return [];
        }
        if (Array.isArray(channels)) {
            return channels.map(channel => {
                if (typeof channel === 'string') {
                    return { channel, config: {} };
                }
                else if (typeof channel === 'object' && channel !== null) {
                    const channelObj = channel;
                    return {
                        channel: String(channelObj.channel || ''),
                        config: channelObj.config || {},
                    };
                }
                return { channel: '', config: {} };
            }).filter(item => item.channel && ['discord', 'telegram', 'email', 'webhook'].includes(item.channel));
        }
        return [];
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
        // 验证货币ID
        const currencyIds = this.parseCurrencyIds(config);
        if (currencyIds.length === 0) {
            errors.push('至少需要一个货币ID');
        }
        // 验证语言
        const languages = this.parseLanguages(config);
        if (languages.length === 0) {
            errors.push('至少需要一个有效的语言 (en 或 zh-CN)');
        }
        // 验证格式
        if (config.format && !['markdown', 'html', 'json'].includes(String(config.format))) {
            errors.push('格式必须是 markdown, html 或 json');
        }
        // 验证渠道配置
        if (config.sendToChannels) {
            const channelConfigs = this.parseChannelConfigs(config);
            if (channelConfigs.length === 0) {
                errors.push('渠道配置无效或包含不支持的渠道');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
exports.ReportGenerationTaskExecutor = ReportGenerationTaskExecutor;
//# sourceMappingURL=report-generation-task.js.map