"use strict";
/**
 * 基础任务执行器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTaskExecutor = void 0;
const errors_1 = require("@/utils/errors");
class BaseTaskExecutor {
    logger;
    type;
    description;
    constructor(logger, type, description) {
        this.logger = logger.child({ component: 'TaskExecutor', type });
        this.type = type;
        this.description = description;
    }
    /**
     * 执行任务
     */
    async execute(config) {
        const startTime = Date.now();
        const taskId = config.taskId || 'unknown';
        this.logger.info('开始执行任务', {
            taskId,
            type: this.type,
            configKeys: Object.keys(config),
        });
        try {
            // 验证配置
            const validation = this.validateConfig(config);
            if (!validation.valid) {
                throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
            }
            // 执行实际任务
            const result = await this.executeTask(config);
            const duration = Date.now() - startTime;
            this.logger.info('任务执行成功', {
                taskId,
                type: this.type,
                duration: `${duration}ms`,
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('任务执行失败', {
                taskId,
                type: this.type,
                error: error.message,
                duration: `${duration}ms`,
            });
            throw errors_1.AppErrorFactory.createTaskExecutionError(error, taskId, {
                taskType: this.type,
                config,
            });
        }
    }
    /**
     * 验证任务配置
     */
    validateConfig(config) {
        const errors = [];
        // 基础验证：检查必需字段
        const requiredFields = this.getRequiredFields();
        for (const field of requiredFields) {
            if (!(field in config) || config[field] === undefined || config[field] === '') {
                errors.push(`缺少必需字段: ${field}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * 获取任务描述
     */
    getDescription() {
        return this.description;
    }
    /**
     * 获取任务类型
     */
    getType() {
        return this.type;
    }
    /**
     * 创建任务结果
     */
    createTaskResult(success, data, error, metadata) {
        const defaultMetadata = {
            taskId: 'unknown',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: 0,
            retryCount: 0,
        };
        return {
            success,
            data,
            error,
            metadata: { ...defaultMetadata, ...metadata },
        };
    }
    /**
     * 记录任务进度
     */
    logProgress(progress, message, data) {
        this.logger.info('任务进度', {
            progress: `${progress}%`,
            message,
            ...data,
        });
    }
    /**
     * 处理重试逻辑
     */
    async withRetry(operation, maxAttempts = 3, delayMs = 1000) {
        let lastError;
        let attempt = 1;
        while (attempt <= maxAttempts) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt < maxAttempts) {
                    const waitTime = delayMs * attempt; // 指数退避
                    this.logger.warn('任务重试', {
                        attempt,
                        maxAttempts,
                        waitTime: `${waitTime}ms`,
                        error: error.message,
                    });
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    attempt++;
                }
                else {
                    break;
                }
            }
        }
        throw lastError;
    }
}
exports.BaseTaskExecutor = BaseTaskExecutor;
//# sourceMappingURL=base-executor.js.map