/**
 * 报告导出器实现
 * 负责将报告导出到不同格式和渠道
 */
import { IReportExporter, Report } from './interface';
import { Logger } from '@/utils/logger';
export declare class ReportExporter implements IReportExporter {
    private logger;
    private exportDir;
    constructor(logger: Logger, exportDir?: string);
    /**
     * 导出报告到文件
     */
    exportToFile(report: Report, filePath: string): Promise<void>;
    /**
     * 导出报告到多个格式
     */
    exportToMultipleFormats(report: Report, formats: ('markdown' | 'html' | 'json')[]): Promise<Record<string, string>>;
    /**
     * 发送报告到渠道
     */
    sendToChannel(report: Report, channel: 'discord' | 'telegram' | 'email' | 'webhook', config: Record<string, unknown>): Promise<void>;
    /**
     * 获取导出选项
     */
    getExportOptions(): Array<{
        format: string;
        description: string;
        supportedChannels: string[];
    }>;
    /**
     * 格式化报告内容
     */
    private formatReportContent;
    /**
     * 格式化为Markdown
     */
    private formatAsMarkdown;
    /**
     * 格式化为HTML
     */
    private formatAsHTML;
    /**
     * 确保导出目录存在
     */
    private ensureExportDirectory;
    /**
     * 获取完整文件路径
     */
    private getFullPath;
    /**
     * 发送到Discord
     */
    private sendToDiscord;
    /**
     * 发送到Telegram
     */
    private sendToTelegram;
    /**
     * 发送到邮件
     */
    private sendToEmail;
    /**
     * 发送到Webhook
     */
    private sendToWebhook;
    /**
     * 获取影响等级表情符号
     */
    private getImpactEmoji;
}
//# sourceMappingURL=report-exporter.d.ts.map