"use strict";
/**
 * 任务注册表实现
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRegistryImpl = void 0;
class TaskRegistryImpl {
    logger;
    executors;
    constructor(logger) {
        this.logger = logger.child({ component: 'TaskRegistry' });
        this.executors = new Map();
    }
    /**
     * 注册任务执行器
     */
    registerExecutor(type, executor) {
        if (this.executors.has(type)) {
            this.logger.warn('覆盖已存在的任务执行器', { type });
        }
        this.executors.set(type, executor);
        this.logger.info('注册任务执行器', {
            type,
            description: executor.getDescription(),
        });
    }
    /**
     * 获取任务执行器
     */
    getExecutor(type) {
        const executor = this.executors.get(type);
        if (!executor) {
            this.logger.warn('找不到任务执行器', { type });
        }
        return executor || null;
    }
    /**
     * 列出所有执行器
     */
    listExecutors() {
        const result = [];
        for (const [type, executor] of this.executors.entries()) {
            result.push({
                type,
                description: executor.getDescription(),
            });
        }
        return result;
    }
    /**
     * 验证配置
     */
    validateConfig(type, config) {
        const executor = this.getExecutor(type);
        if (!executor) {
            return {
                valid: false,
                errors: [`找不到任务执行器: ${type}`],
            };
        }
        return executor.validateConfig(config);
    }
    /**
     * 获取执行器信息
     */
    getExecutorInfo(type) {
        const executor = this.getExecutor(type);
        if (!executor) {
            return null;
        }
        return {
            type: executor.getType(),
            description: executor.getDescription(),
        };
    }
    /**
     * 移除执行器
     */
    removeExecutor(type) {
        const existed = this.executors.delete(type);
        if (existed) {
            this.logger.info('移除任务执行器', { type });
        }
        return existed;
    }
    /**
     * 清空所有执行器
     */
    clear() {
        const count = this.executors.size;
        this.executors.clear();
        this.logger.info('清空任务注册表', { removedCount: count });
    }
    /**
     * 获取执行器数量
     */
    getExecutorCount() {
        return this.executors.size;
    }
    /**
     * 检查执行器是否存在
     */
    hasExecutor(type) {
        return this.executors.has(type);
    }
}
exports.TaskRegistryImpl = TaskRegistryImpl;
//# sourceMappingURL=task-registry.js.map