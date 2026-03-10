/**
 * 报告生成器实现
 * 负责生成双语市场报告
 */
import { IReportGenerator, MarketData, Report, ReportContent, ReportFinding, ChartData } from './interface';
import { Logger } from '@/utils/logger';
export declare class ReportGenerator implements IReportGenerator {
    private logger;
    constructor(logger: Logger);
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
    /**
     * 生成报告ID
     */
    private generateReportId;
    /**
     * 生成报告内容
     */
    private generateReportContent;
    /**
     * 生成市场概况
     */
    private generateMarketOverview;
    /**
     * 生成最佳表现者分析
     */
    private generateTopPerformers;
    /**
     * 生成趋势分析
     */
    private generateTrendAnalysis;
    /**
     * 生成异常分析
     */
    private generateAnomalyAnalysis;
    /**
     * 生成分析总结
     */
    private generateAnalysisSummary;
    /**
     * 获取最佳表现者
     */
    private getTopPerformers;
    /**
     * 获取最差表现者
     */
    private getWorstPerformers;
    /**
     * 计算市场波动性
     */
    private calculateMarketVolatility;
    /**
     * 获取价格变化图表数据
     */
    private getPriceChangeChartData;
    /**
     * 获取市值图表数据
     */
    private getMarketCapChartData;
    /**
     * 获取交易量图表数据
     */
    private getVolumeChartData;
    /**
     * 格式化为Markdown
     */
    private formatAsMarkdown;
    /**
     * 格式化为HTML
     */
    private formatAsHTML;
    /**
     * 获取影响等级表情符号
     */
    private getImpactEmoji;
}
//# sourceMappingURL=report-generator.d.ts.map