/**
 * 日志工具
 * 提供结构化的日志记录功能
 */
import winston from 'winston';
import { LoggingConfig } from '@/types';
export declare class Logger {
    private static instance;
    private logger;
    private constructor();
    /**
     * 获取Logger实例
     */
    static getInstance(config?: LoggingConfig): Logger;
    /**
     * 记录错误日志
     */
    error(message: string, meta?: Record<string, unknown>): void;
    /**
     * 记录警告日志
     */
    warn(message: string, meta?: Record<string, unknown>): void;
    /**
     * 记录信息日志
     */
    info(message: string, meta?: Record<string, unknown>): void;
    /**
     * 记录调试日志
     */
    debug(message: string, meta?: Record<string, unknown>): void;
    /**
     * 记录HTTP请求日志
     */
    http(message: string, meta?: Record<string, unknown>): void;
    /**
     * 创建子上下文日志器
     */
    child(meta: Record<string, unknown>): Logger;
    /**
     * 获取原始Winston记录器
     */
    getRawLogger(): winston.Logger;
}
/**
 * 创建默认日志器（用于测试和快速启动）
 */
export declare function createDefaultLogger(): Logger;
//# sourceMappingURL=logger.d.ts.map