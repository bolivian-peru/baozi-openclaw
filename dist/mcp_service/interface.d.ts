/**
 * MCP服务接口定义
 * 定义与Baozi MCP服务器交互的契约
 */
import { MCPServiceConfig, MCPConnectionStatus, MarketData, Report, AppError } from '@/types';
export interface IMCPClient {
    /**
     * 连接到MCP服务器
     */
    connect(): Promise<void>;
    /**
     * 断开与MCP服务器的连接
     */
    disconnect(): Promise<void>;
    /**
     * 获取连接状态
     */
    getConnectionStatus(): MCPConnectionStatus;
    /**
     * 获取市场数据
     * @param currencyIds 货币ID列表
     * @param timeframe 时间范围
     */
    fetchMarketData(currencyIds: string[], timeframe?: string): Promise<MarketData>;
    /**
     * 生成市场报告
     * @param data 市场数据
     * @param language 报告语言
     */
    generateReport(data: MarketData, language: string): Promise<Report>;
    /**
     * 发送报告到指定通道
     * @param report 生成的报告
     * @param channel 发送通道
     */
    sendReport(report: Report, channel: string): Promise<void>;
    /**
     * 健康检查
     */
    healthCheck(): Promise<boolean>;
}
export interface IMCPErrorHandler {
    /**
     * 处理连接错误
     */
    handleConnectionError(error: Error): AppError;
    /**
     * 处理API错误
     */
    handleApiError(error: Error, endpoint: string): AppError;
    /**
     * 处理超时错误
     */
    handleTimeoutError(operation: string): AppError;
    /**
     * 是否应该重试
     */
    shouldRetry(error: AppError): boolean;
    /**
     * 获取重试延迟时间
     */
    getRetryDelay(error: AppError, attempt: number): number;
}
export interface IMCPRequestBuilder {
    /**
     * 构建市场数据请求
     */
    buildMarketDataRequest(currencyIds: string[], timeframe: string): any;
    /**
     * 构建报告生成请求
     */
    buildReportGenerationRequest(data: MarketData, language: string): any;
    /**
     * 构建报告发送请求
     */
    buildReportSendRequest(report: Report, channel: string): any;
    /**
     * 验证请求参数
     */
    validateRequest(params: any): void;
}
export interface IMCPService extends IMCPClient {
    /**
     * 获取服务配置
     */
    getConfig(): MCPServiceConfig;
    /**
     * 更新服务配置
     */
    updateConfig(config: Partial<MCPServiceConfig>): void;
    /**
     * 获取性能指标
     */
    getMetrics(): {
        totalRequests: number;
        failedRequests: number;
        averageLatency: number;
        lastError?: AppError;
    };
    /**
     * 重置服务状态
     */
    reset(): void;
}
//# sourceMappingURL=interface.d.ts.map