/**
 * 调度系统接口定义
 */
export interface IScheduledTask {
    id: string;
    name: string;
    description?: string;
    schedule: TaskSchedule;
    enabled: boolean;
    lastRun?: TaskRun;
    nextRun?: string;
    config: Record<string, unknown>;
}
export interface TaskSchedule {
    type: 'interval' | 'cron' | 'manual';
    value: string | number;
    timezone?: string;
}
export interface TaskRun {
    id: string;
    taskId: string;
    startTime: string;
    endTime?: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    result?: unknown;
    error?: string;
    duration?: number;
}
export interface TaskResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    metadata: {
        taskId: string;
        startTime: string;
        endTime: string;
        duration: number;
        retryCount: number;
    };
}
export interface IScheduler {
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
}
export interface ITaskExecutor<T = unknown> {
    /**
     * 执行任务
     */
    execute(config: Record<string, unknown>): Promise<T>;
    /**
     * 验证任务配置
     */
    validateConfig(config: Record<string, unknown>): {
        valid: boolean;
        errors: string[];
    };
    /**
     * 获取任务描述
     */
    getDescription(): string;
    /**
     * 获取任务类型
     */
    getType(): string;
}
export interface TaskRegistry {
    registerExecutor(type: string, executor: ITaskExecutor): void;
    getExecutor(type: string): ITaskExecutor | null;
    listExecutors(): Array<{
        type: string;
        description: string;
    }>;
}
export interface SchedulerConfig {
    maxConcurrentTasks?: number;
    retryPolicy?: {
        maxAttempts: number;
        delayMs: number;
        backoffFactor: number;
    };
    historySize?: number;
    enableLogging?: boolean;
    timezone?: string;
}
//# sourceMappingURL=interface.d.ts.map