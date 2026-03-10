/**
 * 调度器主类实现
 */
import { IScheduler, IScheduledTask, TaskRun, TaskResult, SchedulerConfig } from './interface';
import { TaskRegistryImpl } from './task-registry';
import { Logger } from '@/utils/logger';
export declare class Scheduler implements IScheduler {
    private logger;
    private config;
    private registry;
    private tasks;
    private taskHistory;
    private isRunning;
    private startedAt?;
    private concurrentTasks;
    constructor(logger: Logger, config?: SchedulerConfig);
    /**
     * 启动调度器
     */
    start(): Promise<void>;
    /**
     * 停止调度器
     */
    stop(): Promise<void>;
    /**
     * 添加任务
     */
    addTask(task: Omit<IScheduledTask, 'id' | 'lastRun' | 'nextRun'>): Promise<string>;
    /**
     * 更新任务
     */
    updateTask(taskId: string, updates: Partial<IScheduledTask>): Promise<void>;
    /**
     * 删除任务
     */
    removeTask(taskId: string): Promise<void>;
    /**
     * 获取任务列表
     */
    getTasks(): Promise<IScheduledTask[]>;
    /**
     * 获取任务详情
     */
    getTask(taskId: string): Promise<IScheduledTask | null>;
    /**
     * 立即运行任务
     */
    runTask(taskId: string): Promise<TaskResult>;
    /**
     * 获取任务运行历史
     */
    getTaskHistory(taskId: string, limit?: number): Promise<TaskRun[]>;
    /**
     * 获取调度器状态
     */
    getStatus(): {
        running: boolean;
        startedAt?: string;
        totalTasks: number;
        enabledTasks: number;
        lastError?: string;
        uptime?: number;
    };
    /**
     * 获取任务注册表
     */
    getRegistry(): TaskRegistryImpl;
    /**
     * 调度任务
     */
    private scheduleTask;
    /**
     * 计算下次运行时间
     */
    private calculateNextRun;
    /**
     * 生成任务ID
     */
    private generateTaskId;
    /**
     * 生成运行ID
     */
    private generateRunId;
    /**
     * 添加到历史记录
     */
    private addToHistory;
    /**
     * 清理历史记录
     */
    private cleanupHistory;
}
//# sourceMappingURL=scheduler.d.ts.map