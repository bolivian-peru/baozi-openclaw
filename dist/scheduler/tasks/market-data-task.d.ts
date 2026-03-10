/**
 * 市场数据获取任务执行器
 */
import { BaseTaskExecutor } from '../base-executor';
import { Logger } from '@/utils/logger';
export declare class MarketDataTaskExecutor extends BaseTaskExecutor<{
    currencies: Record<string, unknown>;
    trends: Array<{
        direction: string;
        strength: number;
    }>;
    anomalies?: Array<{
        type: string;
        severity: string;
    }>;
}> {
    constructor(logger: Logger);
    /**
     * 执行实际任务
     */
    protected executeTask(config: Record<string, unknown>): Promise<{
        currencies: Record<string, unknown>;
        trends: Array<{
            direction: string;
            strength: number;
        }>;
        anomalies?: Array<{
            type: string;
            severity: string;
        }>;
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
     * 扩展配置验证
     */
    validateConfig(config: Record<string, unknown>): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=market-data-task.d.ts.map