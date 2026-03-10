/**
 * MCP客户端实现
 * 负责与Baozi MCP服务器的实际通信
 */
import { Logger } from '@/utils/logger';
import { IMCPClient, IMCPErrorHandler, IMCPRequestBuilder } from './interface';
import { MCPServiceConfig, MCPConnectionStatus, MarketData, Report, AppError } from '@/types';
export declare class MCPClient implements IMCPClient {
    private axiosInstance;
    private config;
    private logger;
    private errorHandler;
    private requestBuilder;
    private connectionStatus;
    private metrics;
    constructor(config: MCPServiceConfig, logger: Logger, errorHandler: IMCPErrorHandler, requestBuilder: IMCPRequestBuilder);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getConnectionStatus(): MCPConnectionStatus;
    fetchMarketData(currencyIds: string[], timeframe?: string): Promise<MarketData>;
    generateReport(data: MarketData, language?: string): Promise<Report>;
    sendReport(report: Report, channel: string): Promise<void>;
    healthCheck(): Promise<boolean>;
    /**
     * 获取客户端指标
     */
    getMetrics(): {
        totalRequests: number;
        failedRequests: number;
        successRate: number;
        averageLatency: number;
        lastError: AppError;
    };
    /**
     * 重置客户端指标
     */
    resetMetrics(): void;
}
//# sourceMappingURL=client.d.ts.map