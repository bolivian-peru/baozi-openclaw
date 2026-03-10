"use strict";
/**
 * 报告服务实现
 * 整合报告生成、模板管理、导出和发送功能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const report_generator_1 = require("./report-generator");
const template_manager_1 = require("./template-manager");
const report_exporter_1 = require("./report-exporter");
const errors_1 = require("@/utils/errors");
class ReportService {
    logger;
    generator;
    templateManager;
    exporter;
    config;
    reportHistory;
    constructor(logger, config = {}) {
        this.logger = logger.child({ component: 'ReportService' });
        this.generator = new report_generator_1.ReportGenerator(logger);
        this.templateManager = new template_manager_1.ReportTemplateManager(logger);
        this.exporter = new report_exporter_1.ReportExporter(logger);
        this.config = {
            languages: config.languages || ['en', 'zh-CN'],
            defaultLanguage: config.defaultLanguage || 'en',
            format: config.format || 'markdown',
            schedule: config.schedule || '0 */6 * * *',
            deliveryChannels: config.deliveryChannels || [
                {
                    type: 'file',
                    config: { path: './reports' },
                    enabled: true,
                },
            ],
            templates: config.templates || [],
            defaultFormat: config.defaultFormat || 'markdown',
            autoExport: config.autoExport || false,
            exportFormats: config.exportFormats || ['markdown', 'json'],
            maxHistory: config.maxHistory || 100,
            enableCaching: config.enableCaching ?? true,
            cacheTTL: config.cacheTTL || 300000, // 5 minutes
        };
        this.reportHistory = [];
        this.logger.info('报告服务初始化完成', {
            defaultLanguage: this.config.defaultLanguage,
            defaultFormat: this.config.defaultFormat,
            autoExport: this.config.autoExport,
        });
    }
    /**
     * 获取完整的报告（包括生成和导出）
     */
    async getFullReport(data, options = {}) {
        const startTime = Date.now();
        const languages = options.languages || [this.config.defaultLanguage];
        const format = options.format || this.config.defaultFormat;
        this.logger.info('生成完整报告', {
            languages: languages.join(', '),
            format,
            currencyCount: Object.keys(data.currencies).length,
            autoExport: options.exportToFile,
            channelCount: options.sendToChannels?.length || 0,
        });
        const reports = {};
        const exports = {};
        const deliveryStatus = {};
        try {
            // 为每种语言生成报告
            for (const language of languages) {
                const report = await this.generator.generateMarketReport(data, language);
                reports[language] = report;
                // 记录到历史
                this.addToReportHistory(report, data.sources.length);
                // 导出到文件（如果启用）
                if (options.exportToFile) {
                    try {
                        const fileName = `market_report_${language}_${new Date().toISOString().slice(0, 10)}.${format}`;
                        await this.exporter.exportToFile(report, fileName);
                        exports[`${language}_${format}`] = fileName;
                        deliveryStatus[`export_${language}`] = true;
                    }
                    catch (exportError) {
                        this.logger.warn('报告导出失败', {
                            language,
                            error: exportError.message,
                        });
                        deliveryStatus[`export_${language}`] = false;
                    }
                }
            }
            // 发送到指定渠道
            if (options.sendToChannels && options.sendToChannels.length > 0) {
                for (const channelConfig of options.sendToChannels) {
                    const { channel, config } = channelConfig;
                    // 使用默认语言报告发送
                    const defaultReport = reports[languages[0]];
                    if (defaultReport) {
                        try {
                            await this.exporter.sendToChannel(defaultReport, channel, config);
                            deliveryStatus[`channel_${channel}`] = true;
                        }
                        catch (channelError) {
                            this.logger.warn('渠道发送失败', {
                                channel,
                                error: channelError.message,
                            });
                            deliveryStatus[`channel_${channel}`] = false;
                        }
                    }
                }
            }
            // 自动导出（如果配置启用）
            if (this.config.autoExport && this.config.exportFormats.length > 0) {
                for (const exportFormat of this.config.exportFormats) {
                    try {
                        const formatReports = await this.exporter.exportToMultipleFormats(reports[languages[0]], [exportFormat]);
                        exports[`auto_${exportFormat}`] = formatReports[exportFormat];
                        deliveryStatus[`auto_export_${exportFormat}`] = true;
                    }
                    catch (autoExportError) {
                        this.logger.warn('自动导出失败', {
                            format: exportFormat,
                            error: autoExportError.message,
                        });
                        deliveryStatus[`auto_export_${exportFormat}`] = false;
                    }
                }
            }
            const totalTime = Date.now() - startTime;
            this.logger.info('完整报告生成完成', {
                reportCount: Object.keys(reports).length,
                exportCount: Object.keys(exports).length,
                deliverySuccess: Object.values(deliveryStatus).filter(v => v).length,
                deliveryFailed: Object.values(deliveryStatus).filter(v => !v).length,
                totalTime: `${totalTime}ms`,
            });
            return {
                reports,
                exports,
                deliveryStatus,
            };
        }
        catch (error) {
            this.logger.error('生成完整报告失败', {
                error: error.message,
                languages,
                format,
            });
            throw errors_1.AppErrorFactory.createReportGenerationError(error, {
                operation: 'getFullReport',
                languages,
                format,
            });
        }
    }
    /**
     * 获取报告配置
     */
    getReportConfig() {
        return { ...this.config };
    }
    /**
     * 更新报告配置
     */
    async updateReportConfig(config) {
        this.logger.info('更新报告配置', {
            oldConfig: this.config,
            newConfig: config,
        });
        try {
            this.config = {
                ...this.config,
                ...config,
            };
            this.logger.info('报告配置更新成功', { config: this.config });
        }
        catch (error) {
            this.logger.error('更新报告配置失败', { error: error.message });
            throw errors_1.AppErrorFactory.createConfigurationError(error, {
                operation: 'updateReportConfig',
                config,
            });
        }
    }
    /**
     * 获取报告历史
     */
    async getReportHistory(limit) {
        const maxLimit = limit || this.config.maxHistory;
        const history = this.reportHistory.slice(0, maxLimit);
        this.logger.debug('获取报告历史', {
            requestedLimit: limit,
            actualLimit: maxLimit,
            totalHistory: this.reportHistory.length,
            returning: history.length,
        });
        return history;
    }
    /**
     * 获取报告统计
     */
    getReportStats() {
        const stats = {
            totalGenerated: this.reportHistory.length,
            byLanguage: {},
            byFormat: {},
            averageGenerationTime: 0,
            lastGeneration: null,
        };
        // 按语言统计
        for (const report of this.reportHistory) {
            stats.byLanguage[report.language] = (stats.byLanguage[report.language] || 0) + 1;
            stats.byFormat[report.format] = (stats.byFormat[report.format] || 0) + 1;
        }
        // 获取最后生成时间
        if (this.reportHistory.length > 0) {
            stats.lastGeneration = this.reportHistory[0].timestamp;
        }
        // 平均生成时间需要实际数据，这里使用模拟值
        if (this.reportHistory.length > 0) {
            stats.averageGenerationTime = 1500; // 模拟1.5秒
        }
        return stats;
    }
    // ================ 私有方法 ================
    /**
     * 添加到报告历史
     */
    addToReportHistory(report, dataSourceCount) {
        const historyEntry = {
            id: report.id,
            timestamp: report.timestamp,
            language: report.language,
            format: report.format,
            dataSourceCount,
        };
        // 添加到历史列表开头
        this.reportHistory.unshift(historyEntry);
        // 限制历史记录数量
        if (this.reportHistory.length > this.config.maxHistory) {
            this.reportHistory = this.reportHistory.slice(0, this.config.maxHistory);
        }
        this.logger.debug('报告添加到历史', {
            reportId: report.id,
            currentHistorySize: this.reportHistory.length,
            maxHistory: this.config.maxHistory,
        });
    }
    /**
     * 清理过期历史
     */
    cleanupOldHistory() {
        const now = Date.now();
        const maxAge = this.config.cacheTTL;
        const originalCount = this.reportHistory.length;
        this.reportHistory = this.reportHistory.filter(entry => {
            const entryTime = new Date(entry.timestamp).getTime();
            return now - entryTime < maxAge;
        });
        if (this.reportHistory.length < originalCount) {
            this.logger.info('清理过期报告历史', {
                removed: originalCount - this.reportHistory.length,
                remaining: this.reportHistory.length,
            });
        }
    }
    /**
     * 获取报告缓存键
     */
    getReportCacheKey(data, language) {
        const currencyIds = Object.keys(data.currencies).sort();
        const sourceIds = data.sources.sort();
        const hashData = `${language}_${currencyIds.join('_')}_${sourceIds.join('_')}`;
        // 简单哈希函数
        let hash = 0;
        for (let i = 0; i < hashData.length; i++) {
            const char = hashData.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return `report_${Math.abs(hash).toString(16)}`;
    }
    /**
     * 生成报告文件名
     */
    generateReportFileName(report) {
        const date = new Date(report.timestamp);
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = date.toISOString().slice(11, 19).replace(/:/g, '');
        return `report_${dateStr}_${timeStr}_${report.language}_${report.format}.${report.format}`;
    }
    /**
     * 验证报告选项
     */
    validateReportOptions(options) {
        if (options.languages) {
            for (const language of options.languages) {
                if (!['en', 'zh-CN'].includes(language)) {
                    throw new Error(`不支持的语言: ${language}`);
                }
            }
        }
        if (options.format && !['markdown', 'html', 'json'].includes(options.format)) {
            throw new Error(`不支持的格式: ${options.format}`);
        }
        if (options.sendToChannels) {
            for (const channelConfig of options.sendToChannels) {
                if (!['discord', 'telegram', 'email', 'webhook'].includes(channelConfig.channel)) {
                    throw new Error(`不支持的渠道: ${channelConfig.channel}`);
                }
            }
        }
    }
}
exports.ReportService = ReportService;
//# sourceMappingURL=report-service.js.map