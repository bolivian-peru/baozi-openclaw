/**
 * 报告生成任务执行器
 */
import { BaseTaskExecutor } from '../base-executor';
import { Logger } from '@/utils/logger';
export declare class ReportGenerationTaskExecutor extends BaseTaskExecutor<{
    reportId: string;
    languages: string[];
    formats: string[];
    exports: Record<string, string>;
    deliveryStatus: Record<string, boolean>;
}> {
    constructor(logger: Logger);
    /**
     * 执行实际任务
     */
    protected executeTask(config: Record<string, unknown>): Promise<{
        reportId: string;
        languages: string[];
        formats: string[];
        exports: Record<string, string>;
        deliveryStatus: Record<string, boolean>;
    }>;
    /**
     * 获取必需字段
     */
    protected getRequiredFields(): string[];
    /**
     * 解析货币ID列表
     */
    private parseCurrencyIds;
    /**
     * 解析语言列表
     */
    private parseLanguages;
    /**
     * 解析渠道配置
     */
    private parseChannelConfigs;
    /**
     * 扩展配置验证
     */
    validateConfig(config: Record<string, unknown>): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=report-generation-task.d.ts.map