/**
 * 调度服务 - 整合所有调度组件
 */
import { Logger } from '@/utils/logger';
import { Scheduler } from './scheduler';
import { TaskRegistryImpl } from './task-registry';
import { SchedulerConfig } from './interface';
export declare class SchedulerService {
    private logger;
    private scheduler;
    private registry;
    constructor(logger: Logger, config?: SchedulerConfig);
    /**
     * 启动调度服务
     */
    start(): Promise<void>;
    /**
     * 停止调度服务
     */
    stop(): Promise<void>;
    /**
     * 获取调度器实例
     */
    getScheduler(): Scheduler;
    /**
     * 获取注册表实例
     */
    getRegistry(): TaskRegistryImpl;
    /**
     * 获取服务状态
     */
    getStatus(): {
        scheduler: {
            running: boolean;
            startedAt?: string;
            totalTasks: number;
            enabledTasks: number;
            lastError?: string;
            uptime?: number;
        };
        registry: {
            executorCount: number;
            executors: {
                type: string;
                description: string;
            }[];
        };
    };
    /**
     * 注册默认执行器
     */
    private registerDefaultExecutors;
    /**
     * 创建默认任务
     */
    private createDefaultTasks;
    /**
     * 创建Night Kitchen监控任务
     */
    createNightKitchenMonitorTask(): Promise<string>;
    /**
     * 立即运行市场数据任务
     */
    runMarketDataTask(currencyIds?: string[]): Promise<any>;
    /**
     * 立即生成报告
     */
    runReportTask(options?: {
        currencyIds?: string[];
        languages?: string[];
        format?: string;
        exportToFile?: boolean;
    }): Promise<any>;
}
//# sourceMappingURL=scheduler-service.d.ts.map