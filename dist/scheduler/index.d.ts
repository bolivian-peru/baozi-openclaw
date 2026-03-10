/**
 * 调度模块主入口
 * 导出所有接口和实现类
 */
export * from './interface';
export { TaskRegistryImpl } from './task-registry';
export { BaseTaskExecutor } from './base-executor';
export { Scheduler } from './scheduler';
export { SchedulerService } from './scheduler-service';
export { MarketDataTaskExecutor } from './tasks/market-data-task';
export { ReportGenerationTaskExecutor } from './tasks/report-generation-task';
export * from './utils';
import { Logger } from '@/utils/logger';
import { SchedulerService } from './scheduler-service';
import { SchedulerConfig } from './interface';
/**
 * 创建调度服务实例
 */
export declare function createSchedulerService(logger: Logger, config?: SchedulerConfig): SchedulerService;
/**
 * 调度模块版本信息
 */
export declare const SCHEDULER_MODULE_INFO: {
    name: string;
    version: string;
    description: string;
    author: string;
    features: string[];
    builtInTasks: {
        type: string;
        description: string;
    }[];
};
//# sourceMappingURL=index.d.ts.map