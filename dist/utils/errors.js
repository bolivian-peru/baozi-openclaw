"use strict";
/**
 * 错误处理工具
 * 定义应用错误类型和错误处理函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppErrorFactory = void 0;
exports.retry = retry;
exports.timeout = timeout;
exports.withErrorBoundary = withErrorBoundary;
class AppErrorFactory {
    /**
     * 创建MCP连接错误
     */
    static createMCPConnectionError(error, details) {
        return {
            code: 'MCP_CONNECTION_FAILED',
            message: `MCP连接失败: ${error.message}`,
            details: {
                originalError: error.message,
                stack: error.stack,
                ...details,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 创建数据获取错误
     */
    static createDataFetchError(source, error, details) {
        return {
            code: 'DATA_FETCH_FAILED',
            message: `从 ${source} 获取数据失败: ${error.message}`,
            details: {
                source,
                originalError: error.message,
                ...details,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 创建报告生成错误
     */
    static createReportGenerationError(error, details) {
        return {
            code: 'REPORT_GENERATION_FAILED',
            message: `报告生成失败: ${error.message}`,
            details: {
                originalError: error.message,
                ...details,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 创建配置验证错误
     */
    static createConfigValidationError(message, details) {
        return {
            code: 'CONFIG_VALIDATION_FAILED',
            message: `配置验证失败: ${message}`,
            details,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 创建缓存错误
     */
    static createCacheError(error, operation, details) {
        return {
            code: 'CACHE_ERROR',
            message: `缓存操作失败 (${operation}): ${error.message}`,
            details: {
                operation,
                originalError: error.message,
                ...details,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 创建调度器错误
     */
    static createSchedulerError(error, task) {
        let taskName = 'unknown';
        let details = {};
        if (typeof task === 'string') {
            taskName = task;
        }
        else {
            taskName = task.task || task.operation || 'unknown';
            details = task;
        }
        return {
            code: 'SCHEDULER_ERROR',
            message: `调度器任务失败 (${taskName}): ${error.message}`,
            details: {
                ...details,
                task: taskName,
                originalError: error.message,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 创建导出错误
     */
    static createExportError(error, details) {
        return {
            code: 'REPORT_GENERATION_FAILED',
            message: `报告导出失败: ${error.message}`,
            details: {
                originalError: error.message,
                ...details,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 创建模板错误
     */
    static createTemplateError(error, details) {
        return {
            code: 'REPORT_GENERATION_FAILED',
            message: `报告模板操作失败: ${error.message}`,
            details: {
                originalError: error.message,
                ...details,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 创建任务执行错误
     */
    static createTaskExecutionError(error, task, details) {
        let taskName = 'unknown';
        let taskDetails = {};
        if (typeof task === 'string') {
            taskName = task;
        }
        else {
            taskName = task.taskId || task.task || 'unknown';
            taskDetails = task;
        }
        return {
            code: 'SCHEDULER_ERROR',
            message: `任务执行失败 (${taskName}): ${error.message}`,
            details: {
                ...taskDetails,
                ...details,
                task: taskName,
                originalError: error.message,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 创建配置错误 (createConfigValidationError的别名)
     */
    static createConfigurationError(message, details) {
        return AppErrorFactory.createConfigValidationError(message, details);
    }
    /**
     * 创建验证错误
     */
    static createValidationError(field, message) {
        return {
            code: 'VALIDATION_ERROR',
            message: `参数验证失败: ${field} - ${message}`,
            details: { field, message },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 创建未知错误
     */
    static createUnknownError(error) {
        return {
            code: 'UNKNOWN_ERROR',
            message: `未知错误: ${error.message}`,
            details: {
                originalError: error.message,
                stack: error.stack,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 判断错误是否可重试
     */
    static isRetryableError(error) {
        const retryableCodes = [
            'MCP_CONNECTION_FAILED',
            'DATA_FETCH_FAILED',
            'CACHE_ERROR',
        ];
        return retryableCodes.includes(error.code);
    }
    /**
     * 获取错误的重试延迟时间
     */
    static getRetryDelay(error, attempt) {
        // 指数退避策略
        const baseDelay = 1000; // 1秒
        const maxDelay = 30000; // 30秒
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        // 根据错误类型调整延迟
        if (error.code === 'MCP_CONNECTION_FAILED') {
            return delay * 1.5; // 连接错误增加延迟
        }
        return delay;
    }
    /**
     * 将错误转换为用户友好的消息
     */
    static toUserFriendlyMessage(error) {
        const messages = {
            'MCP_CONNECTION_FAILED': '无法连接到市场数据服务，请检查网络连接和配置',
            'DATA_FETCH_FAILED': '获取市场数据失败，请稍后重试',
            'REPORT_GENERATION_FAILED': '生成市场报告失败',
            'CONFIG_VALIDATION_FAILED': '应用程序配置错误，请检查配置文件',
            'CACHE_ERROR': '数据缓存操作失败',
            'SCHEDULER_ERROR': '定时任务执行失败',
            'VALIDATION_ERROR': '输入参数验证失败',
            'UNKNOWN_ERROR': '发生未知错误，请查看日志获取详细信息',
        };
        return messages[error.code] || messages.UNKNOWN_ERROR;
    }
    /**
     * 记录错误到日志
     */
    static logError(error, logger) {
        const logMessage = {
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp: error.timestamp,
        };
        if (logger && logger.error) {
            logger.error(`应用错误: ${error.code}`, logMessage);
        }
        else {
            console.error('应用错误:', logMessage);
        }
    }
}
exports.AppErrorFactory = AppErrorFactory;
/**
 * 重试装饰器
 */
function retry(maxAttempts = 3, retryableErrorCodes) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            let lastError;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await originalMethod.apply(this, args);
                }
                catch (error) {
                    lastError = error;
                    // 检查是否应该重试
                    const shouldRetry = retryableErrorCodes
                        ? error.code && retryableErrorCodes.includes(error.code)
                        : AppErrorFactory.isRetryableError(error);
                    if (!shouldRetry || attempt === maxAttempts) {
                        break;
                    }
                    // 计算重试延迟
                    const delay = AppErrorFactory.getRetryDelay(error, attempt);
                    // 记录重试信息
                    if (this.logger) {
                        this.logger.warn(`重试 ${attempt}/${maxAttempts} 在 ${delay}ms 后`, {
                            method: propertyKey,
                            error: error.message,
                        });
                    }
                    // 等待重试延迟
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            throw lastError;
        };
        return descriptor;
    };
}
/**
 * 超时装饰器
 */
function timeout(ms) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`操作超时 (${ms}ms): ${String(propertyKey)}`));
                }, ms);
            });
            return Promise.race([originalMethod.apply(this, args), timeoutPromise]);
        };
        return descriptor;
    };
}
/**
 * 错误边界包装器
 */
function withErrorBoundary(fn, errorHandler) {
    return fn().catch(error => {
        if (errorHandler) {
            errorHandler(error);
        }
        else {
            console.error('错误边界捕获:', error);
        }
        return null;
    });
}
//# sourceMappingURL=errors.js.map