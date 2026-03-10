/**
 * 基础任务执行器
 */
import { ITaskExecutor, TaskResult } from './interface';
import { Logger } from '@/utils/logger';
export declare abstract class BaseTaskExecutor<T = unknown> implements ITaskExecutor<T> {
    protected logger: Logger;
    protected type: string;
    protected description: string;
    constructor(logger: Logger, type: string, description: string);
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
    /**
     * 执行实际任务（由子类实现）
     */
    protected abstract executeTask(config: Record<string, unknown>): Promise<T>;
    /**
     * 获取必需字段（由子类实现）
     */
    protected abstract getRequiredFields(): string[];
    /**
     * 创建任务结果
     */
    protected createTaskResult<T>(success: boolean, data?: T, error?: string, metadata?: Partial<TaskResult['metadata']>): TaskResult<T>;
    /**
     * 记录任务进度
     */
    protected logProgress(progress: number, message: string, data?: Record<string, unknown>): void;
    /**
     * 处理重试逻辑
     */
    protected withRetry<T>(operation: () => Promise<T>, maxAttempts?: number, delayMs?: number): Promise<T>;
}
//# sourceMappingURL=base-executor.d.ts.map