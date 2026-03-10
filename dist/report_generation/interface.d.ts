/**
 * 报告生成模块接口定义
 */
import { MarketData, Report, ReportContent, ReportFinding, ChartData, ReportMetadata, ReportTemplate, ReportConfig, CurrencyData, MarketTrend, MarketAnomaly } from '@/types';
export type { MarketData, Report, ReportContent, ReportFinding, ChartData, ReportMetadata, ReportTemplate, ReportConfig, CurrencyData, MarketTrend, MarketAnomaly, };
export interface IReportGenerator {
    /**
     * 生成市场报告
     */
    generateMarketReport(data: MarketData, language: 'en' | 'zh-CN'): Promise<Report>;
    /**
     * 生成报告摘要
     */
    generateSummary(data: MarketData, language: 'en' | 'zh-CN'): string;
    /**
     * 生成详细分析
     */
    generateDetailedAnalysis(data: MarketData, language: 'en' | 'zh-CN'): string[];
    /**
     * 识别关键发现
     */
    identifyKeyFindings(data: MarketData): ReportFinding[];
    /**
     * 生成建议
     */
    generateRecommendations(data: MarketData, language: 'en' | 'zh-CN'): string[];
    /**
     * 生成图表数据
     */
    generateChartData(data: MarketData): ChartData[];
    /**
     * 格式化报告
     */
    formatReport(content: ReportContent, format: 'markdown' | 'html' | 'json'): string;
}
export interface IReportTemplateManager {
    /**
     * 加载模板
     */
    loadTemplate(templateId: string, language: 'en' | 'zh-CN'): Promise<ReportTemplate>;
    /**
     * 保存模板
     */
    saveTemplate(template: ReportTemplate): Promise<void>;
    /**
     * 列出可用模板
     */
    listTemplates(): Promise<Array<{
        id: string;
        name: string;
        languages: string[];
    }>>;
    /**
     * 删除模板
     */
    deleteTemplate(templateId: string): Promise<void>;
    /**
     * 验证模板
     */
    validateTemplate(template: ReportTemplate): {
        valid: boolean;
        errors: string[];
    };
}
export interface IReportExporter {
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
}
export interface IReportService {
    /**
     * 获取完整的报告（包括生成和导出）
     */
    getFullReport(data: MarketData, options: {
        languages?: ('en' | 'zh-CN')[];
        format?: 'markdown' | 'html' | 'json';
        exportToFile?: boolean;
        sendToChannels?: Array<{
            channel: string;
            config: Record<string, unknown>;
        }>;
    }): Promise<{
        reports: Record<string, Report>;
        exports: Record<string, string>;
        deliveryStatus: Record<string, boolean>;
    }>;
    /**
     * 获取报告配置
     */
    getReportConfig(): ReportConfig;
    /**
     * 更新报告配置
     */
    updateReportConfig(config: Partial<ReportConfig>): Promise<void>;
    /**
     * 获取报告历史
     */
    getReportHistory(limit?: number): Promise<Array<{
        id: string;
        timestamp: string;
        language: string;
        format: string;
        dataSourceCount: number;
    }>>;
    /**
     * 获取报告统计
     */
    getReportStats(): {
        totalGenerated: number;
        byLanguage: Record<string, number>;
        byFormat: Record<string, number>;
        averageGenerationTime: number;
        lastGeneration: string | null;
    };
}
//# sourceMappingURL=interface.d.ts.map