"use strict";
/**
 * MCP请求构建器实现
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPRequestBuilder = void 0;
const errors_1 = require("@/utils/errors");
class MCPRequestBuilder {
    buildMarketDataRequest(currencyIds, timeframe) {
        // 验证输入
        this.validateCurrencyIds(currencyIds);
        this.validateTimeframe(timeframe);
        // 构建标准化的市场数据请求
        const request = {
            action: 'fetch_market_data',
            parameters: {
                currencies: currencyIds.map(id => ({
                    id: id.toUpperCase(),
                    include_metadata: true,
                    include_historical: timeframe !== 'current',
                })),
                timeframe: this.normalizeTimeframe(timeframe),
                metrics: [
                    'price',
                    'volume',
                    'market_cap',
                    'price_change_24h',
                    'price_change_percentage_24h',
                ],
                format: 'detailed',
                cache: true,
            },
            metadata: {
                request_id: `market_data_${Date.now()}`,
                timestamp: new Date().toISOString(),
                source: 'night_kitchen_agent',
            },
        };
        return request;
    }
    buildReportGenerationRequest(data, language) {
        // 验证输入
        this.validateMarketData(data);
        this.validateLanguage(language);
        // 构建报告生成请求
        const request = {
            action: 'generate_market_report',
            parameters: {
                market_data: {
                    timestamp: data.timestamp,
                    currency_count: Object.keys(data.currencies).length,
                    trends: data.trends,
                    anomalies: data.anomalies || [],
                },
                report_config: {
                    language: this.normalizeLanguage(language),
                    format: 'markdown',
                    sections: [
                        'executive_summary',
                        'market_overview',
                        'key_findings',
                        'trend_analysis',
                        'recommendations',
                    ],
                    style: 'professional',
                    include_charts: true,
                    chart_types: ['line', 'bar'],
                },
                preferences: {
                    detail_level: 'comprehensive',
                    audience: 'traders',
                    risk_tolerance: 'medium',
                },
            },
            metadata: {
                request_id: `report_gen_${Date.now()}`,
                timestamp: new Date().toISOString(),
                data_points: Object.keys(data.currencies).length,
            },
        };
        return request;
    }
    buildReportSendRequest(report, channel) {
        // 验证输入
        this.validateReport(report);
        this.validateChannel(channel);
        // 构建报告发送请求
        const request = {
            action: 'deliver_report',
            parameters: {
                report: {
                    id: report.id,
                    content: this.prepareReportContent(report),
                    format: report.format,
                    language: report.language,
                    metadata: report.metadata,
                },
                delivery: {
                    channel: this.normalizeChannel(channel),
                    config: this.getChannelConfig(channel),
                    priority: 'normal',
                    retry_on_failure: true,
                    max_retries: 3,
                },
            },
            metadata: {
                request_id: `report_send_${Date.now()}`,
                timestamp: new Date().toISOString(),
                report_id: report.id,
            },
        };
        return request;
    }
    validateRequest(params) {
        if (!params) {
            throw errors_1.AppErrorFactory.createValidationError('params', '参数不能为空');
        }
        // 检查必需字段（根据具体请求类型）
        if (params.currencyIds) {
            this.validateCurrencyIds(params.currencyIds);
        }
        if (params.timeframe) {
            this.validateTimeframe(params.timeframe);
        }
        if (params.data) {
            this.validateMarketData(params.data);
        }
        if (params.language) {
            this.validateLanguage(params.language);
        }
        if (params.report) {
            this.validateReport(params.report);
        }
        if (params.channel) {
            this.validateChannel(params.channel);
        }
    }
    // 验证方法
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
        // 验证每个货币ID格式
        currencyIds.forEach((id, index) => {
            if (typeof id !== 'string') {
                throw errors_1.AppErrorFactory.createValidationError(`currencyIds[${index}]`, '货币ID必须为字符串');
            }
            if (!/^[a-zA-Z0-9-]{1,20}$/.test(id)) {
                throw errors_1.AppErrorFactory.createValidationError(`currencyIds[${index}]`, `无效的货币ID格式: ${id}`);
            }
        });
    }
    validateTimeframe(timeframe) {
        if (typeof timeframe !== 'string') {
            throw errors_1.AppErrorFactory.createValidationError('timeframe', '时间范围必须为字符串');
        }
        const validTimeframes = [
            '1h', '2h', '4h', '6h', '12h',
            '24h', '2d', '3d', '7d', '14d',
            '30d', '90d', '180d', '365d',
            'current', 'all',
        ];
        if (!validTimeframes.includes(timeframe.toLowerCase())) {
            throw errors_1.AppErrorFactory.createValidationError('timeframe', `无效的时间范围。有效值: ${validTimeframes.join(', ')}`);
        }
    }
    validateMarketData(data) {
        if (!data) {
            throw errors_1.AppErrorFactory.createValidationError('data', '市场数据不能为空');
        }
        if (!data.timestamp) {
            throw errors_1.AppErrorFactory.createValidationError('data.timestamp', '时间戳不能为空');
        }
        if (!data.currencies || typeof data.currencies !== 'object') {
            throw errors_1.AppErrorFactory.createValidationError('data.currencies', '货币数据不能为空');
        }
        if (!data.sources || !Array.isArray(data.sources)) {
            throw errors_1.AppErrorFactory.createValidationError('data.sources', '数据源不能为空');
        }
    }
    validateLanguage(language) {
        if (typeof language !== 'string') {
            throw errors_1.AppErrorFactory.createValidationError('language', '语言必须为字符串');
        }
        const validLanguages = ['en', 'zh-CN', 'zh', 'english', 'chinese', 'bilingual'];
        const normalized = language.toLowerCase().replace('-', '');
        if (!validLanguages.some(lang => lang.toLowerCase().replace('-', '') === normalized)) {
            throw errors_1.AppErrorFactory.createValidationError('language', `无效的语言。有效值: ${validLanguages.join(', ')}`);
        }
    }
    validateReport(report) {
        if (!report) {
            throw errors_1.AppErrorFactory.createValidationError('report', '报告不能为空');
        }
        if (!report.id) {
            throw errors_1.AppErrorFactory.createValidationError('report.id', '报告ID不能为空');
        }
        if (!report.content) {
            throw errors_1.AppErrorFactory.createValidationError('report.content', '报告内容不能为空');
        }
        if (!report.metadata) {
            throw errors_1.AppErrorFactory.createValidationError('report.metadata', '报告元数据不能为空');
        }
    }
    validateChannel(channel) {
        if (typeof channel !== 'string') {
            throw errors_1.AppErrorFactory.createValidationError('channel', '通道必须为字符串');
        }
        const validChannels = ['discord', 'telegram', 'email', 'file', 'webhook', 'console'];
        if (!validChannels.includes(channel.toLowerCase())) {
            throw errors_1.AppErrorFactory.createValidationError('channel', `无效的通道。有效值: ${validChannels.join(', ')}`);
        }
    }
    // 标准化方法
    normalizeTimeframe(timeframe) {
        const mapping = {
            '1h': '1h',
            '2h': '2h',
            '4h': '4h',
            '6h': '6h',
            '12h': '12h',
            '24h': '24h',
            '2d': '2d',
            '3d': '3d',
            '7d': '7d',
            '14d': '14d',
            '30d': '30d',
            '90d': '90d',
            '180d': '180d',
            '365d': '365d',
            'current': '1h',
            'all': '365d',
        };
        return mapping[timeframe.toLowerCase()] || timeframe;
    }
    normalizeLanguage(language) {
        const mapping = {
            'en': 'en',
            'english': 'en',
            'zh-cn': 'zh-CN',
            'zh': 'zh-CN',
            'chinese': 'zh-CN',
            'bilingual': 'bilingual',
        };
        return mapping[language.toLowerCase()] || 'en';
    }
    normalizeChannel(channel) {
        const mapping = {
            'discord': 'discord',
            'telegram': 'telegram',
            'email': 'email',
            'file': 'file',
            'webhook': 'webhook',
            'console': 'file', // 控制台输出转为文件
        };
        return mapping[channel.toLowerCase()] || 'file';
    }
    // 辅助方法
    prepareReportContent(report) {
        // 根据报告格式准备内容
        switch (report.format) {
            case 'markdown':
                return {
                    text: this.formatMarkdownContent(report),
                    attachments: report.content.charts || [],
                };
            case 'html':
                return {
                    html: this.formatHtmlContent(report),
                    css: this.getReportStyles(),
                    attachments: report.content.charts || [],
                };
            case 'json':
                return report;
            default:
                return {
                    text: JSON.stringify(report, null, 2),
                    format: 'plain',
                };
        }
    }
    getChannelConfig(channel) {
        const configs = {
            'discord': {
                webhook_url: process.env.DISCORD_WEBHOOK_URL,
                username: 'Night Kitchen Reporter',
                avatar_url: 'https://example.com/avatar.png',
                embeds: true,
            },
            'telegram': {
                bot_token: process.env.TELEGRAM_BOT_TOKEN,
                chat_id: process.env.TELEGRAM_CHAT_ID,
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
            },
            'email': {
                smtp_host: process.env.SMTP_HOST,
                smtp_port: process.env.SMTP_PORT,
                smtp_user: process.env.SMTP_USER,
                smtp_pass: process.env.SMTP_PASS,
                from_email: 'reports@nightkitchen.com',
                to_emails: process.env.REPORT_EMAILS?.split(',') || [],
                subject_template: 'Market Report - {date}',
            },
            'file': {
                directory: './reports',
                filename_template: 'market_report_{timestamp}.{format}',
                rotation: {
                    max_files: 30,
                    max_size_mb: 100,
                },
            },
            'webhook': {
                url: process.env.WEBHOOK_URL,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN}`,
                },
                timeout: 10000,
            },
        };
        return configs[this.normalizeChannel(channel)] || {};
    }
    formatMarkdownContent(report) {
        const lines = [];
        // 标题
        lines.push(`# Market Report - ${new Date(report.timestamp).toLocaleDateString()}`);
        lines.push('');
        // 摘要
        if (report.content.summary) {
            lines.push('## Executive Summary');
            lines.push(report.content.summary);
            lines.push('');
        }
        // 关键发现
        if (report.content.keyFindings && report.content.keyFindings.length > 0) {
            lines.push('## Key Findings');
            report.content.keyFindings.forEach((finding, index) => {
                lines.push(`### ${index + 1}. ${finding.title}`);
                lines.push(finding.description);
                lines.push(`**Impact:** ${finding.impact}`);
                lines.push('');
            });
        }
        // 详细分析
        if (report.content.detailedAnalysis && report.content.detailedAnalysis.length > 0) {
            lines.push('## Detailed Analysis');
            report.content.detailedAnalysis.forEach((analysis, index) => {
                lines.push(`${index + 1}. ${analysis}`);
            });
            lines.push('');
        }
        // 建议
        if (report.content.recommendations && report.content.recommendations.length > 0) {
            lines.push('## Recommendations');
            report.content.recommendations.forEach((recommendation, index) => {
                lines.push(`${index + 1}. ${recommendation}`);
            });
        }
        // 元数据
        lines.push('');
        lines.push('---');
        lines.push(`*Report generated at: ${report.timestamp}*`);
        lines.push(`*Data sources: ${report.metadata.dataSources.join(', ')}*`);
        lines.push(`*Generation time: ${report.metadata.generationTime}ms*`);
        return lines.join('\n');
    }
    formatHtmlContent(report) {
        // 简化的HTML格式（实际实现会更复杂）
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Market Report - ${new Date(report.timestamp).toLocaleDateString()}</title>
    <style>${this.getReportStyles()}</style>
</head>
<body>
    <h1>Market Report</h1>
    <div class="timestamp">Generated at: ${report.timestamp}</div>
    <div class="content">${report.content.summary || 'No summary available'}</div>
</body>
</html>
    `.trim();
    }
    getReportStyles() {
        return `
.report-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    line-height: 1.6;
}
.report-header {
    border-bottom: 2px solid #333;
    padding-bottom: 20px;
    margin-bottom: 30px;
}
.report-title {
    font-size: 28px;
    font-weight: bold;
    color: #333;
    margin: 0;
}
.report-meta {
    color: #666;
    font-size: 14px;
    margin-top: 10px;
}
.section {
    margin-bottom: 30px;
}
.section-title {
    font-size: 22px;
    font-weight: bold;
    color: #444;
    border-bottom: 1px solid #ddd;
    padding-bottom: 10px;
    margin-bottom: 15px;
}
.finding {
    background: #f8f9fa;
    border-left: 4px solid #007bff;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 0 4px 4px 0;
}
.finding-title {
    font-weight: bold;
    margin-bottom: 5px;
}
.finding-impact {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
    margin-top: 5px;
}
.impact-low { background: #d4edda; color: #155724; }
.impact-medium { background: #fff3cd; color: #856404; }
.impact-high { background: #f8d7da; color: #721c24; }
.recommendation {
    padding-left: 20px;
    position: relative;
}
.recommendation:before {
    content: "•";
    position: absolute;
    left: 0;
    color: #007bff;
    font-weight: bold;
}
    `.trim();
    }
}
exports.MCPRequestBuilder = MCPRequestBuilder;
//# sourceMappingURL=request-builder.js.map