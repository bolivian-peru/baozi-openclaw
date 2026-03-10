"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppErrorFactory = void 0;
exports.retry = retry;
exports.timeout = timeout;
// Mock for errors module
function retry(maxAttempts, retryableErrorCodes) {
    return function (target, propertyKey, descriptor) {
        // Return descriptor unchanged
        return descriptor;
    };
}
function timeout(ms) {
    return function (target, propertyKey, descriptor) {
        // Return descriptor unchanged
        return descriptor;
    };
}
class AppErrorFactory {
    static createMCPConnectionError(error, details) {
        return { code: 'MCP_CONNECTION_FAILED', message: error.message };
    }
    static createDataFetchError(source, error, details) {
        return { code: 'DATA_FETCH_FAILED', message: error.message };
    }
    static createReportGenerationError(error, details) {
        return { code: 'REPORT_GENERATION_FAILED', message: error.message };
    }
    static createConfigValidationError(error, details) {
        return { code: 'CONFIG_VALIDATION_FAILED', message: error.message };
    }
    static createCacheError(error, details) {
        return { code: 'CACHE_ERROR', message: error.message };
    }
    static createSchedulerError(error, details) {
        return { code: 'SCHEDULER_ERROR', message: error.message };
    }
    static createValidationError(error, details) {
        return { code: 'VALIDATION_ERROR', message: error.message };
    }
    static createUnknownError(error, details) {
        return { code: 'UNKNOWN_ERROR', message: error.message };
    }
    static isRetryableError(error) {
        return true;
    }
    static getRetryDelay(error, attempt) {
        return 100;
    }
}
exports.AppErrorFactory = AppErrorFactory;
//# sourceMappingURL=errors.js.map