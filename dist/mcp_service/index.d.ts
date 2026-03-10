/**
 * MCP服务主模块
 * 整合所有MCP相关组件，提供统一的API
 */
import { IMCPService } from './interface';
import { MCPServiceConfig, MCPConnectionStatus, MarketData, Report, AppError } from '@/types';
export declare class MCPService implements IMCPService {
    private client;
    private errorHandler;
    private requestBuilder;
    private logger;
    private config;
    private isInitialized;
    constructor(config?: MCPServiceConfig);
    /**
     * 从配置管理器加载配置
     */
    private loadConfigFromManager;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getConnectionStatus(): MCPConnectionStatus;
    fetchMarketData(currencyIds: string[], timeframe?: string): Promise<MarketData>;
    generateReport(data: MarketData, language?: string): Promise<Report>;
    sendReport(report: Report, channel: string): Promise<void>;
    healthCheck(): Promise<boolean>;
    getConfig(): MCPServiceConfig;
    updateConfig(config: Partial<MCPServiceConfig>): void;
    getMetrics(): {
        totalRequests: number;
        failedRequests: number;
        averageLatency: number;
        lastError?: AppError;
    };
    reset(): void;
    /**
     * 获取完整的市场报告（一站式服务）
     */
    getCompleteMarketReport(options: {
        currencyIds: string[];
        timeframe?: string;
        language?: string;
        channel?: string;
    }): Promise<{
        data: MarketData;
        report: Report;
    }>;
    /**
     * 批量处理多个货币对
     */
    batchProcessCurrencies(currencyBatches: string[][], timeframe?: string, language?: string): Promise<{
        data: MarketData[];
        reports: Report[];
    }>;
    /**
     * 验证服务是否已初始化
     */
    private validateInitialization;
    /**
     * 静态工厂方法
     */
    static create(config?: MCPServiceConfig): Promise<MCPService>;
    /**
     * 销毁服务
     */
    destroy(): Promise<void>;
}
export declare function getMCPService(config?: MCPServiceConfig): Promise<MCPService>;
export declare function destroyMCPService(): Promise<void>;
//# sourceMappingURL=index.d.ts.map