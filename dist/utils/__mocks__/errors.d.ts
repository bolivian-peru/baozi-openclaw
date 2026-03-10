export declare function retry(maxAttempts?: number, retryableErrorCodes?: any[]): MethodDecorator;
export declare function timeout(ms: number): MethodDecorator;
export declare class AppErrorFactory {
    static createMCPConnectionError(error: Error, details?: Record<string, unknown>): {
        code: string;
        message: string;
    };
    static createDataFetchError(source: string, error: Error, details?: Record<string, unknown>): {
        code: string;
        message: string;
    };
    static createReportGenerationError(error: Error, details?: Record<string, unknown>): {
        code: string;
        message: string;
    };
    static createConfigValidationError(error: Error, details?: Record<string, unknown>): {
        code: string;
        message: string;
    };
    static createCacheError(error: Error, details?: Record<string, unknown>): {
        code: string;
        message: string;
    };
    static createSchedulerError(error: Error, details?: Record<string, unknown>): {
        code: string;
        message: string;
    };
    static createValidationError(error: Error, details?: Record<string, unknown>): {
        code: string;
        message: string;
    };
    static createUnknownError(error: Error, details?: Record<string, unknown>): {
        code: string;
        message: string;
    };
    static isRetryableError(error: any): boolean;
    static getRetryDelay(error: any, attempt: number): number;
}
//# sourceMappingURL=errors.d.ts.map