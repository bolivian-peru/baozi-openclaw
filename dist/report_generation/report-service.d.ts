/**
 * 报告服务实现
 * 整合报告生成、模板管理、导出和发送功能
 */
import { IReportService, MarketData, Report, ReportConfig } from './interface';
import { Logger } from '@/utils/logger';
export declare class ReportService implements IReportService {
    private logger;
    private generator;
    private templateManager;
    private exporter;
    private config;
    private reportHistory;
    constructor(logger: Logger, config?: Partial<ReportConfig>);
    /**
     * 获取完整的报告（包括生成和导出）
     */
    getFullReport(data: MarketData, options?: {
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
    /**
     * 添加到报告历史
     */
    private addToReportHistory;
    /**
     * 清理过期历史
     */
    private cleanupOldHistory;
    /**
     * 获取报告缓存键
     */
    private getReportCacheKey;
    /**
     * 生成报告文件名
     */
    private generateReportFileName;
    /**
     * 验证报告选项
     */
    private validateReportOptions;
}
//# sourceMappingURL=report-service.d.ts.map