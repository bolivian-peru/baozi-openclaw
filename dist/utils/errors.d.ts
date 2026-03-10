/**
 * 错误处理工具
 * 定义应用错误类型和错误处理函数
 */
import { AppError, AppErrorCode } from '@/types';
export declare class AppErrorFactory {
    /**
     * 创建MCP连接错误
     */
    static createMCPConnectionError(error: Error, details?: Record<string, unknown>): AppError;
    /**
     * 创建数据获取错误
     */
    static createDataFetchError(source: string, error: Error, details?: Record<string, unknown>): AppError;
    /**
     * 创建报告生成错误
     */
    static createReportGenerationError(error: Error, details?: Record<string, unknown>): AppError;
    /**
     * 创建配置验证错误
     */
    static createConfigValidationError(message: string, details?: Record<string, unknown>): AppError;
    /**
     * 创建缓存错误
     */
    static createCacheError(error: Error, operation: string, details?: Record<string, unknown>): AppError;
    /**
     * 创建调度器错误
     */
    static createSchedulerError(error: Error, task: string | Record<string, unknown>): AppError;
    /**
     * 创建导出错误
     */
    static createExportError(error: Error, details?: Record<string, unknown>): AppError;
    /**
     * 创建模板错误
     */
    static createTemplateError(error: Error, details?: Record<string, unknown>): AppError;
    /**
     * 创建任务执行错误
     */
    static createTaskExecutionError(error: Error, task: string | Record<string, unknown>, details?: Record<string, unknown>): AppError;
    /**
     * 创建配置错误 (createConfigValidationError的别名)
     */
    static createConfigurationError(message: string, details?: Record<string, unknown>): AppError;
    /**
     * 创建验证错误
     */
    static createValidationError(field: string, message: string): AppError;
    /**
     * 创建未知错误
     */
    static createUnknownError(error: Error): AppError;
    /**
     * 判断错误是否可重试
     */
    static isRetryableError(error: AppError): boolean;
    /**
     * 获取错误的重试延迟时间
     */
    static getRetryDelay(error: AppError, attempt: number): number;
    /**
     * 将错误转换为用户友好的消息
     */
    static toUserFriendlyMessage(error: AppError): string;
    /**
     * 记录错误到日志
     */
    static logError(error: AppError, logger?: any): void;
}
/**
 * 重试装饰器
 */
export declare function retry(maxAttempts?: number, retryableErrorCodes?: AppErrorCode[]): MethodDecorator;
/**
 * 超时装饰器
 */
export declare function timeout(ms: number): MethodDecorator;
/**
 * 错误边界包装器
 */
export declare function withErrorBoundary<T>(fn: () => Promise<T>, errorHandler?: (error: Error) => void): Promise<T | null>;
//# sourceMappingURL=errors.d.ts.map