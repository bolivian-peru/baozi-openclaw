"use strict";
/**
 * MCP错误处理器实现
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPErrorHandler = void 0;
const errors_1 = require("@/utils/errors");
class MCPErrorHandler {
    handleConnectionError(error) {
        return errors_1.AppErrorFactory.createMCPConnectionError(error, {
            context: 'connection',
            timestamp: new Date().toISOString(),
        });
    }
    handleApiError(error, endpoint) {
        // 处理Axios错误
        if (this.isAxiosError(error)) {
            const axiosError = error;
            // 根据HTTP状态码确定错误类型
            if (axiosError.response) {
                const status = axiosError.response.status;
                if (status >= 400 && status < 500) {
                    return errors_1.AppErrorFactory.createDataFetchError(endpoint, error, {
                        httpStatus: status,
                        responseData: axiosError.response.data,
                        endpoint,
                    });
                }
                else if (status >= 500) {
                    return errors_1.AppErrorFactory.createMCPConnectionError(error, {
                        httpStatus: status,
                        endpoint,
                        serverError: true,
                    });
                }
            }
            else if (axiosError.code === 'ECONNABORTED') {
                return errors_1.AppErrorFactory.createMCPConnectionError(error, {
                    code: 'TIMEOUT',
                    endpoint,
                    timeout: true,
                });
            }
            else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
                return errors_1.AppErrorFactory.createMCPConnectionError(error, {
                    code: 'NETWORK_ERROR',
                    endpoint,
                    networkError: true,
                });
            }
        }
        // 默认数据获取错误
        return errors_1.AppErrorFactory.createDataFetchError(endpoint, error, {
            endpoint,
            errorType: error.constructor.name,
        });
    }
    handleTimeoutError(operation) {
        return {
            code: 'DATA_FETCH_FAILED',
            message: `操作超时: ${operation}`,
            details: {
                operation,
                timeout: true,
            },
            timestamp: new Date().toISOString(),
        };
    }
    shouldRetry(error) {
        const retryableCodes = [
            'MCP_CONNECTION_FAILED',
            'DATA_FETCH_FAILED',
        ];
        const retryable = retryableCodes.includes(error.code);
        // 检查错误详情以确定是否应该重试
        if (error.details) {
            // 如果是服务器错误（5xx），可以重试
            if (error.details.serverError) {
                return true;
            }
            // 如果是网络错误，可以重试
            if (error.details.networkError) {
                return true;
            }
            // 如果是客户端错误（4xx），通常不应该重试
            const httpStatus = error.details.httpStatus;
            if (typeof httpStatus === 'number' && httpStatus >= 400 && httpStatus < 500) {
                // 但有些4xx错误可以重试，如429（速率限制）
                if (httpStatus === 429) {
                    return true;
                }
                return false;
            }
        }
        return retryable;
    }
    getRetryDelay(error, attempt) {
        // 基础延迟
        let baseDelay = 1000; // 1秒
        // 根据错误类型调整延迟
        if (error.details) {
            // 速率限制错误使用更长的延迟
            if (error.details.httpStatus === 429) {
                baseDelay = 5000; // 5秒
            }
            // 服务器错误使用中等延迟
            if (error.details.serverError) {
                baseDelay = 3000; // 3秒
            }
            // 网络错误使用较短的延迟
            if (error.details.networkError) {
                baseDelay = 2000; // 2秒
            }
        }
        // 指数退避策略
        const maxDelay = 30000; // 30秒
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        // 添加随机抖动以避免重试风暴
        const jitter = delay * 0.1; // 10%抖动
        const finalDelay = delay + (Math.random() * jitter * 2 - jitter);
        return Math.max(100, Math.round(finalDelay)); // 至少100ms
    }
    /**
     * 判断是否为Axios错误
     */
    isAxiosError(error) {
        return error.isAxiosError === true;
    }
    /**
     * 获取错误严重性
     */
    getErrorSeverity(error) {
        if (error.code === 'MCP_CONNECTION_FAILED') {
            if (error.details?.serverError) {
                return 'high';
            }
            if (error.details?.networkError) {
                return 'medium';
            }
            return 'high';
        }
        if (error.code === 'DATA_FETCH_FAILED') {
            if (error.details?.httpStatus === 429) {
                return 'medium'; // 速率限制
            }
            const httpStatus = error.details?.httpStatus;
            if (typeof httpStatus === 'number' && httpStatus >= 500) {
                return 'high'; // 服务器错误
            }
            return 'medium';
        }
        if (error.code === 'REPORT_GENERATION_FAILED') {
            return 'medium';
        }
        if (error.code === 'CONFIG_VALIDATION_FAILED') {
            return 'high'; // 配置错误通常严重
        }
        return 'low';
    }
    /**
     * 获取错误恢复建议
     */
    getRecoverySuggestion(error) {
        const suggestions = {
            'MCP_CONNECTION_FAILED': '检查MCP服务器URL和API密钥，确保网络连接正常',
            'DATA_FETCH_FAILED': '验证数据源配置，检查API密钥和速率限制',
            'REPORT_GENERATION_FAILED': '检查报告模板和数据处理逻辑',
            'CONFIG_VALIDATION_FAILED': '检查配置文件格式和必需字段',
            'CACHE_ERROR': '检查缓存目录权限和磁盘空间',
            'SCHEDULER_ERROR': '检查定时任务配置和系统时间',
            'VALIDATION_ERROR': '验证输入参数格式和类型',
            'UNKNOWN_ERROR': '查看详细日志，联系技术支持',
        };
        const baseSuggestion = suggestions[error.code] || '请查看应用程序日志获取详细信息';
        // 根据错误详情添加具体建议
        if (error.details) {
            if (error.details.httpStatus === 429) {
                return `${baseSuggestion}。检测到速率限制，请降低请求频率或升级API配额`;
            }
            if (error.details.networkError) {
                return `${baseSuggestion}。网络连接问题，请检查防火墙和代理设置`;
            }
            if (error.details.serverError) {
                return `${baseSuggestion}。服务器端错误，请稍后重试或联系服务提供商`;
            }
        }
        return baseSuggestion;
    }
}
exports.MCPErrorHandler = MCPErrorHandler;
//# sourceMappingURL=error-handler.js.map