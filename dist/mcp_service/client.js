"use strict";
/**
 * MCP客户端实现
 * 负责与Baozi MCP服务器的实际通信
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClient = void 0;
const axios_1 = __importDefault(require("axios"));
const errors_1 = require("@/utils/errors");
class MCPClient {
    axiosInstance;
    config;
    logger;
    errorHandler;
    requestBuilder;
    connectionStatus = {
        connected: false,
        lastConnected: null,
    };
    metrics = {
        totalRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        latencyHistory: [],
        lastError: null,
    };
    constructor(config, logger, errorHandler, requestBuilder) {
        this.config = config;
        // @ts-ignore
        this.logger = logger.child({ component: 'MCPClient' });
        this.errorHandler = errorHandler;
        this.requestBuilder = requestBuilder;
        // 创建Axios实例
        this.axiosInstance = axios_1.default.create({
            baseURL: this.config.url,
            timeout: this.config.timeoutMs,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'NightKitchenAgent/1.0',
            },
        });
        // 添加请求拦截器
        this.axiosInstance.interceptors.request.use((config) => {
            this.metrics.totalRequests++;
            this.logger.debug(`发送请求: ${config.method?.toUpperCase()} ${config.url}`, {
                data: config.data,
            });
            return config;
        }, (error) => {
            this.metrics.failedRequests++;
            this.logger.error('请求拦截器错误', { error: error.message });
            return Promise.reject(error);
        });
        // 添加响应拦截器
        this.axiosInstance.interceptors.response.use((response) => {
            const latency = Date.now() - (response.config.metadata?.startTime || Date.now());
            this.metrics.latencyHistory.push(latency);
            // 保持最近100个延迟记录
            if (this.metrics.latencyHistory.length > 100) {
                this.metrics.latencyHistory.shift();
            }
            // 计算平均延迟
            this.metrics.averageLatency = Math.round(this.metrics.latencyHistory.reduce((a, b) => a + b, 0) / this.metrics.latencyHistory.length);
            this.logger.debug(`请求成功: ${response.status}`, {
                url: response.config.url,
                latency: `${latency}ms`,
            });
            return response;
        }, (error) => {
            this.metrics.failedRequests++;
            this.metrics.lastError = this.errorHandler.handleApiError(error, error.config?.url || 'unknown');
            const latency = error.config?.metadata?.startTime
                ? Date.now() - error.config.metadata.startTime
                : 0;
            this.logger.error('请求失败', {
                url: error.config?.url,
                method: error.config?.method,
                status: error.response?.status,
                error: error.message,
                latency: `${latency}ms`,
            });
            return Promise.reject(this.metrics.lastError);
        });
        this.logger.info('MCP客户端初始化完成', {
            url: this.config.url,
            timeout: `${this.config.timeoutMs}ms`,
        });
    }
    async connect() {
        try {
            this.logger.info('正在连接到MCP服务器...');
            // 发送健康检查请求验证连接
            const response = await this.axiosInstance.get('/health');
            if (response.status === 200) {
                this.connectionStatus = {
                    connected: true,
                    lastConnected: new Date().toISOString(),
                    latency: response.data.latency,
                };
                this.logger.info('MCP服务器连接成功', {
                    latency: `${response.data.latency || 0}ms`,
                    version: response.data.version,
                });
            }
            else {
                throw new Error(`健康检查失败: HTTP ${response.status}`);
            }
        }
        catch (error) {
            this.connectionStatus = {
                connected: false,
                lastConnected: this.connectionStatus.lastConnected,
                error: error.message,
            };
            const appError = this.errorHandler.handleConnectionError(error);
            this.metrics.lastError = appError;
            this.logger.error('MCP服务器连接失败', {
                error: error.message,
                code: appError.code,
            });
            throw appError;
        }
    }
    async disconnect() {
        try {
            this.logger.info('正在断开MCP服务器连接...');
            // 如果有断开连接的端点，可以调用
            // await this.axiosInstance.post('/disconnect');
            this.connectionStatus = {
                connected: false,
                lastConnected: this.connectionStatus.lastConnected,
            };
            this.logger.info('MCP服务器连接已断开');
        }
        catch (error) {
            this.logger.error('断开连接时发生错误', { error: error.message });
            // 忽略断开连接错误，继续更新状态
            this.connectionStatus.connected = false;
        }
    }
    getConnectionStatus() {
        return { ...this.connectionStatus };
    }
    async fetchMarketData(currencyIds, timeframe = '24h') {
        try {
            // 验证参数
            this.requestBuilder.validateRequest({ currencyIds, timeframe });
            // 构建请求
            const requestData = this.requestBuilder.buildMarketDataRequest(currencyIds, timeframe);
            this.logger.info('获取市场数据', {
                currencies: currencyIds.length,
                timeframe,
            });
            // 发送请求
            const response = await this.axiosInstance.post('/market/data', requestData);
            // 转换响应数据
            const marketData = {
                timestamp: new Date().toISOString(),
                sources: [this.config.url],
                currencies: {},
                trends: [],
            };
            // 解析响应数据（根据实际API响应结构调整）
            if (response.data && response.data.currencies) {
                marketData.currencies = response.data.currencies;
            }
            if (response.data && response.data.trends) {
                marketData.trends = response.data.trends;
            }
            if (response.data && response.data.anomalies) {
                marketData.anomalies = response.data.anomalies;
            }
            this.logger.debug('市场数据获取成功', {
                currencies: Object.keys(marketData.currencies).length,
                trends: marketData.trends.length,
            });
            return marketData;
        }
        catch (error) {
            const appError = this.errorHandler.handleApiError(error, '/market/data');
            this.metrics.lastError = appError;
            this.logger.error('获取市场数据失败', {
                error: error.message,
                code: appError.code,
                currencies: currencyIds.length,
            });
            throw appError;
        }
    }
    async generateReport(data, language = 'en') {
        try {
            // 验证参数
            this.requestBuilder.validateRequest({ data, language });
            // 构建请求
            const requestData = this.requestBuilder.buildReportGenerationRequest(data, language);
            this.logger.info('生成市场报告', {
                language,
                dataPoints: Object.keys(data.currencies).length,
            });
            // 发送请求
            const response = await this.axiosInstance.post('/report/generate', requestData);
            // 创建报告对象
            const report = {
                id: `report_${Date.now()}`,
                timestamp: new Date().toISOString(),
                language: language,
                format: 'markdown',
                content: {
                    summary: response.data.summary || '',
                    detailedAnalysis: response.data.analysis || [],
                    keyFindings: response.data.findings || [],
                    recommendations: response.data.recommendations,
                    charts: response.data.charts,
                },
                metadata: {
                    generationTime: response.data.generationTime || 0,
                    dataSources: [this.config.url],
                    reportVersion: '1.0',
                    cacheHit: response.data.cacheHit || false,
                },
            };
            this.logger.info('市场报告生成成功', {
                reportId: report.id,
                language,
                generationTime: `${report.metadata.generationTime}ms`,
            });
            return report;
        }
        catch (error) {
            const appError = this.errorHandler.handleApiError(error, '/report/generate');
            this.metrics.lastError = appError;
            this.logger.error('生成市场报告失败', {
                error: error.message,
                code: appError.code,
                language,
            });
            throw appError;
        }
    }
    async sendReport(report, channel) {
        try {
            // 验证参数
            this.requestBuilder.validateRequest({ report, channel });
            // 构建请求
            const requestData = this.requestBuilder.buildReportSendRequest(report, channel);
            this.logger.info('发送市场报告', {
                reportId: report.id,
                channel,
                format: report.format,
            });
            // 发送请求
            await this.axiosInstance.post('/report/send', requestData);
            this.logger.info('市场报告发送成功', {
                reportId: report.id,
                channel,
            });
        }
        catch (error) {
            const appError = this.errorHandler.handleApiError(error, '/report/send');
            this.metrics.lastError = appError;
            this.logger.error('发送市场报告失败', {
                error: error.message,
                code: appError.code,
                channel,
                reportId: report.id,
            });
            throw appError;
        }
    }
    async healthCheck() {
        try {
            const response = await this.axiosInstance.get('/health');
            return response.status === 200;
        }
        catch (error) {
            this.logger.warn('MCP健康检查失败', { error: error.message });
            return false;
        }
    }
    /**
     * 获取客户端指标
     */
    getMetrics() {
        return {
            totalRequests: this.metrics.totalRequests,
            failedRequests: this.metrics.failedRequests,
            successRate: this.metrics.totalRequests > 0
                ? ((this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests) * 100
                : 100,
            averageLatency: this.metrics.averageLatency,
            lastError: this.metrics.lastError,
        };
    }
    /**
     * 重置客户端指标
     */
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            latencyHistory: [],
            lastError: null,
        };
        this.logger.info('客户端指标已重置');
    }
}
exports.MCPClient = MCPClient;
__decorate([
    (0, errors_1.retry)(3, ['MCP_CONNECTION_FAILED', 'DATA_FETCH_FAILED']),
    (0, errors_1.timeout)(30000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MCPClient.prototype, "connect", null);
__decorate([
    (0, errors_1.retry)(2, ['DATA_FETCH_FAILED']),
    (0, errors_1.timeout)(60000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String]),
    __metadata("design:returntype", Promise)
], MCPClient.prototype, "fetchMarketData", null);
__decorate([
    (0, errors_1.retry)(2, ['REPORT_GENERATION_FAILED']),
    (0, errors_1.timeout)(90000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MCPClient.prototype, "generateReport", null);
__decorate([
    (0, errors_1.retry)(2),
    (0, errors_1.timeout)(30000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MCPClient.prototype, "sendReport", null);
__decorate([
    (0, errors_1.timeout)(10000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MCPClient.prototype, "healthCheck", null);
//# sourceMappingURL=client.js.map