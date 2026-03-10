/**
 * 任务注册表实现
 */
import { TaskRegistry, ITaskExecutor } from './interface';
import { Logger } from '@/utils/logger';
export declare class TaskRegistryImpl implements TaskRegistry {
    private logger;
    private executors;
    constructor(logger: Logger);
    /**
     * 注册任务执行器
     */
    registerExecutor(type: string, executor: ITaskExecutor): void;
    /**
     * 获取任务执行器
     */
    getExecutor(type: string): ITaskExecutor | null;
    /**
     * 列出所有执行器
     */
    listExecutors(): Array<{
        type: string;
        description: string;
    }>;
    /**
     * 验证配置
     */
    validateConfig(type: string, config: Record<string, unknown>): {
        valid: boolean;
        errors: string[];
    };
    /**
     * 获取执行器信息
     */
    getExecutorInfo(type: string): {
        type: string;
        description: string;
    } | null;
    /**
     * 移除执行器
     */
    removeExecutor(type: string): boolean;
    /**
     * 清空所有执行器
     */
    clear(): void;
    /**
     * 获取执行器数量
     */
    getExecutorCount(): number;
    /**
     * 检查执行器是否存在
     */
    hasExecutor(type: string): boolean;
}
//# sourceMappingURL=task-registry.d.ts.map