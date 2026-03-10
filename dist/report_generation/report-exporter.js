"use strict";
/**
 * 报告导出器实现
 * 负责将报告导出到不同格式和渠道
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportExporter = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const errors_1 = require("@/utils/errors");
class ReportExporter {
    logger;
    exportDir;
    constructor(logger, exportDir = './exports') {
        this.logger = logger.child({ component: 'ReportExporter' });
        this.exportDir = exportDir;
        this.logger.info('报告导出器初始化', { exportDir });
    }
    /**
     * 导出报告到文件
     */
    async exportToFile(report, filePath) {
        const startTime = Date.now();
        this.logger.info('导出报告到文件', {
            reportId: report.id,
            filePath,
            format: report.format,
            language: report.language,
        });
        try {
            // 确保目录存在
            await this.ensureExportDirectory();
            // 格式化报告内容
            const content = this.formatReportContent(report);
            // 确定完整文件路径
            const fullPath = this.getFullPath(filePath, report.format);
            // 写入文件
            await promises_1.default.writeFile(fullPath, content, 'utf-8');
            const fileStats = await promises_1.default.stat(fullPath);
            this.logger.info('报告导出成功', {
                reportId: report.id,
                filePath: fullPath,
                fileSize: `${(fileStats.size / 1024).toFixed(2)}KB`,
                exportTime: `${Date.now() - startTime}ms`,
            });
        }
        catch (error) {
            this.logger.error('导出报告到文件失败', {
                reportId: report.id,
                filePath,
                error: error.message,
            });
            throw errors_1.AppErrorFactory.createExportError(error, {
                operation: 'exportToFile',
                reportId: report.id,
                filePath,
                format: report.format,
            });
        }
    }
    /**
     * 导出报告到多个格式
     */
    async exportToMultipleFormats(report, formats) {
        const startTime = Date.now();
        this.logger.info('导出报告到多个格式', {
            reportId: report.id,
            formats: formats.join(', '),
        });
        const results = {};
        const errors = [];
        try {
            for (const format of formats) {
                try {
                    // 为每种格式创建报告副本
                    const formatReport = {
                        ...report,
                        format,
                    };
                    // 格式化内容
                    const content = this.formatReportContent(formatReport);
                    results[format] = content;
                    this.logger.debug('格式导出成功', {
                        reportId: report.id,
                        format,
                        contentLength: content.length,
                    });
                }
                catch (error) {
                    const errorMsg = `格式 ${format} 导出失败: ${error.message}`;
                    errors.push(errorMsg);
                    this.logger.warn('单个格式导出失败', {
                        reportId: report.id,
                        format,
                        error: error.message,
                    });
                }
            }
            if (Object.keys(results).length === 0 && errors.length > 0) {
                throw new Error(`所有格式导出失败: ${errors.join('; ')}`);
            }
            this.logger.info('多格式导出完成', {
                reportId: report.id,
                successCount: Object.keys(results).length,
                errorCount: errors.length,
                totalTime: `${Date.now() - startTime}ms`,
            });
            return results;
        }
        catch (error) {
            this.logger.error('多格式导出失败', {
                reportId: report.id,
                error: error.message,
                errors,
            });
            throw errors_1.AppErrorFactory.createExportError(error, {
                operation: 'exportToMultipleFormats',
                reportId: report.id,
                formats,
            });
        }
    }
    /**
     * 发送报告到渠道
     */
    async sendToChannel(report, channel, config) {
        const startTime = Date.now();
        this.logger.info('发送报告到渠道', {
            reportId: report.id,
            channel,
            configKeys: Object.keys(config).join(', '),
        });
        try {
            // 根据渠道类型选择发送方式
            switch (channel) {
                case 'discord':
                    await this.sendToDiscord(report, config);
                    break;
                case 'telegram':
                    await this.sendToTelegram(report, config);
                    break;
                case 'email':
                    await this.sendToEmail(report, config);
                    break;
                case 'webhook':
                    await this.sendToWebhook(report, config);
                    break;
                default:
                    throw new Error(`不支持的渠道: ${channel}`);
            }
            this.logger.info('报告发送成功', {
                reportId: report.id,
                channel,
                sendTime: `${Date.now() - startTime}ms`,
            });
        }
        catch (error) {
            this.logger.error('发送报告到渠道失败', {
                reportId: report.id,
                channel,
                error: error.message,
            });
            throw errors_1.AppErrorFactory.createExportError(error, {
                operation: 'sendToChannel',
                reportId: report.id,
                channel,
            });
        }
    }
    /**
     * 获取导出选项
     */
    getExportOptions() {
        return [
            {
                format: 'markdown',
                description: 'Markdown格式，适用于文档和笔记',
                supportedChannels: ['discord', 'telegram', 'email'],
            },
            {
                format: 'html',
                description: 'HTML格式，适用于网页和邮件',
                supportedChannels: ['email', 'webhook'],
            },
            {
                format: 'json',
                description: 'JSON格式，适用于API和自动化处理',
                supportedChannels: ['webhook'],
            },
            {
                format: 'text',
                description: '纯文本格式，通用兼容',
                supportedChannels: ['discord', 'telegram', 'email'],
            },
            {
                format: 'pdf',
                description: 'PDF格式，适用于正式文档',
                supportedChannels: ['email'],
            },
        ];
    }
    // ================ 私有方法 ================
    /**
     * 格式化报告内容
     */
    formatReportContent(report) {
        const { content, format } = report;
        switch (format) {
            case 'markdown':
                return this.formatAsMarkdown(content);
            case 'html':
                return this.formatAsHTML(content);
            case 'json':
                return JSON.stringify({ ...report, metadata: { ...report.metadata, exportTime: new Date().toISOString() } }, null, 2);
            default:
                return this.formatAsMarkdown(content);
        }
    }
    /**
     * 格式化为Markdown
     */
    formatAsMarkdown(content) {
        let markdown = `# 市场报告\n\n`;
        // 摘要
        if (content.summary) {
            markdown += `## 摘要\n${content.summary}\n\n`;
        }
        // 详细分析
        if (content.detailedAnalysis && content.detailedAnalysis.length > 0) {
            markdown += `## 详细分析\n`;
            content.detailedAnalysis.forEach((analysis, index) => {
                markdown += `${index + 1}. ${analysis}\n`;
            });
            markdown += '\n';
        }
        // 关键发现
        if (content.keyFindings && content.keyFindings.length > 0) {
            markdown += `## 关键发现\n`;
            content.keyFindings.forEach((finding, index) => {
                markdown += `### ${index + 1}. ${finding.title}\n`;
                markdown += `${finding.description}\n\n`;
                if (finding.evidence && finding.evidence.length > 0) {
                    markdown += `**证据**:\n`;
                    finding.evidence.forEach(evidence => {
                        markdown += `- ${evidence}\n`;
                    });
                    markdown += '\n';
                }
                markdown += `**影响等级**: ${this.getImpactEmoji(finding.impact)} ${finding.impact}\n\n`;
            });
        }
        // 建议
        if (content.recommendations && content.recommendations.length > 0) {
            markdown += `## 建议\n`;
            content.recommendations.forEach((recommendation, index) => {
                markdown += `${index + 1}. ${recommendation}\n`;
            });
            markdown += '\n';
        }
        // 图表信息
        if (content.charts && content.charts.length > 0) {
            markdown += `## 图表\n`;
            markdown += `*报告包含 ${content.charts.length} 个图表*\n\n`;
        }
        // 报告元数据
        markdown += `---\n`;
        markdown += `*报告生成时间: ${new Date().toISOString()}*\n`;
        markdown += `*数据来源: ${content.metadata?.dataSources?.join(', ') || '多个数据源'}*\n`;
        return markdown;
    }
    /**
     * 格式化为HTML
     */
    formatAsHTML(content) {
        const timestamp = new Date().toISOString();
        let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>市场报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #1a365d; border-bottom: 2px solid #4299e1; padding-bottom: 10px; }
        h2 { color: #2d3748; margin-top: 30px; }
        h3 { color: #4a5568; }
        .summary { background: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .finding { border-left: 4px solid #4299e1; padding-left: 15px; margin: 15px 0; }
        .finding.high { border-left-color: #f56565; }
        .finding.medium { border-left-color: #ed8936; }
        .finding.low { border-left-color: #48bb78; }
        .recommendation { background: #ebf8ff; padding: 10px; border-radius: 3px; margin: 10px 0; }
        .metadata { font-size: 0.9em; color: #718096; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <h1>市场报告</h1>`;
        // 摘要
        if (content.summary) {
            html += `
    <div class="summary">
        <h2>摘要</h2>
        <p>${content.summary}</p>
    </div>`;
        }
        // 详细分析
        if (content.detailedAnalysis && content.detailedAnalysis.length > 0) {
            html += `
    <h2>详细分析</h2>
    <ol>`;
            content.detailedAnalysis.forEach(analysis => {
                html += `
        <li>${analysis}</li>`;
            });
            html += `
    </ol>`;
        }
        // 关键发现
        if (content.keyFindings && content.keyFindings.length > 0) {
            html += `
    <h2>关键发现</h2>`;
            content.keyFindings.forEach(finding => {
                html += `
    <div class="finding ${finding.impact}">
        <h3>${finding.title}</h3>
        <p>${finding.description}</p>`;
                if (finding.evidence && finding.evidence.length > 0) {
                    html += `
        <h4>证据</h4>
        <ul>`;
                    finding.evidence.forEach(evidence => {
                        html += `
            <li>${evidence}</li>`;
                    });
                    html += `
        </ul>`;
                }
                html += `
        <p><strong>影响等级</strong>: ${this.getImpactEmoji(finding.impact)} ${finding.impact}</p>
    </div>`;
            });
        }
        // 建议
        if (content.recommendations && content.recommendations.length > 0) {
            html += `
    <h2>建议</h2>`;
            content.recommendations.forEach(recommendation => {
                html += `
    <div class="recommendation">
        <p>${recommendation}</p>
    </div>`;
            });
        }
        // 图表信息
        if (content.charts && content.charts.length > 0) {
            html += `
    <h2>图表</h2>
    <p><em>报告包含 ${content.charts.length} 个图表</em></p>`;
        }
        // 报告元数据
        html += `
    <div class="metadata">
        <p><strong>报告生成时间</strong>: ${timestamp}</p>
        <p><strong>数据来源</strong>: ${content.metadata?.dataSources?.join(', ') || '多个数据源'}</p>
    </div>
</body>
</html>`;
        return html;
    }
    /**
     * 确保导出目录存在
     */
    async ensureExportDirectory() {
        try {
            await promises_1.default.access(this.exportDir);
        }
        catch {
            await promises_1.default.mkdir(this.exportDir, { recursive: true });
            this.logger.info('创建导出目录', { directory: this.exportDir });
        }
    }
    /**
     * 获取完整文件路径
     */
    getFullPath(filePath, format) {
        // 如果提供了完整路径，直接使用
        if (path_1.default.isAbsolute(filePath) || filePath.includes('/')) {
            return filePath;
        }
        // 否则在导出目录中创建文件
        const fileName = filePath.endsWith(`.${format}`) ? filePath : `${filePath}.${format}`;
        return path_1.default.join(this.exportDir, fileName);
    }
    /**
     * 发送到Discord
     */
    async sendToDiscord(report, config) {
        // 简化实现，实际需要集成Discord Webhook
        const webhookUrl = config.webhookUrl;
        if (!webhookUrl) {
            throw new Error('缺少Discord Webhook URL');
        }
        const content = this.formatReportContent(report);
        // 这里应该调用Discord API
        this.logger.debug('模拟发送到Discord', { webhookUrl, contentLength: content.length });
    }
    /**
     * 发送到Telegram
     */
    async sendToTelegram(report, config) {
        // 简化实现，实际需要集成Telegram Bot API
        const botToken = config.botToken;
        const chatId = config.chatId;
        if (!botToken || !chatId) {
            throw new Error('缺少Telegram Bot Token或Chat ID');
        }
        const content = this.formatReportContent(report);
        // 这里应该调用Telegram Bot API
        this.logger.debug('模拟发送到Telegram', { chatId, contentLength: content.length });
    }
    /**
     * 发送到邮件
     */
    async sendToEmail(report, config) {
        // 简化实现，实际需要集成邮件服务
        const recipient = config.recipient;
        const subject = config.subject || '市场报告';
        if (!recipient) {
            throw new Error('缺少收件人邮箱');
        }
        const content = this.formatReportContent(report);
        // 这里应该调用邮件服务
        this.logger.debug('模拟发送到邮件', { recipient, subject, contentLength: content.length });
    }
    /**
     * 发送到Webhook
     */
    async sendToWebhook(report, config) {
        const webhookUrl = config.url;
        if (!webhookUrl) {
            throw new Error('缺少Webhook URL');
        }
        const payload = {
            reportId: report.id,
            timestamp: report.timestamp,
            language: report.language,
            format: report.format,
            content: report.content,
            metadata: report.metadata,
        };
        // 这里应该调用Webhook
        this.logger.debug('模拟发送到Webhook', {
            webhookUrl,
            payloadSize: JSON.stringify(payload).length,
        });
    }
    /**
     * 获取影响等级表情符号
     */
    getImpactEmoji(impact) {
        switch (impact) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }
}
exports.ReportExporter = ReportExporter;
//# sourceMappingURL=report-exporter.js.map