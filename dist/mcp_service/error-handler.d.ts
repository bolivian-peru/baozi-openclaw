/**
 * MCP错误处理器实现
 */
import { IMCPErrorHandler } from './interface';
import { AppError } from '@/types';
export declare class MCPErrorHandler implements IMCPErrorHandler {
    handleConnectionError(error: Error): AppError;
    handleApiError(error: Error, endpoint: string): AppError;
    handleTimeoutError(operation: string): AppError;
    shouldRetry(error: AppError): boolean;
    getRetryDelay(error: AppError, attempt: number): number;
    /**
     * 判断是否为Axios错误
     */
    private isAxiosError;
    /**
     * 获取错误严重性
     */
    getErrorSeverity(error: AppError): 'low' | 'medium' | 'high' | 'critical';
    /**
     * 获取错误恢复建议
     */
    getRecoverySuggestion(error: AppError): string;
}
//# sourceMappingURL=error-handler.d.ts.map