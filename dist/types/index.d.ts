/**
 * Night Kitchen Agent 核心类型定义
 */
export interface MarketData {
    timestamp: string;
    sources: string[];
    currencies: Record<string, CurrencyData>;
    trends: MarketTrend[];
    anomalies?: MarketAnomaly[];
}
export interface CurrencyData {
    symbol: string;
    name: string;
    currentPrice: number;
    priceChange24h: number;
    priceChangePercentage24h: number;
    marketCap: number;
    volume24h: number;
    lastUpdated: string;
    source: string;
}
export interface MarketTrend {
    direction: 'up' | 'down' | 'neutral';
    strength: number;
    timeframe: '1h' | '24h' | '7d';
    description: string;
}
export interface MarketAnomaly {
    type: 'spike' | 'drop' | 'volume_surge' | 'unusual_activity';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedCurrencies: string[];
    timestamp: string;
}
export interface Report {
    id: string;
    timestamp: string;
    language: 'en' | 'zh-CN' | 'bilingual';
    format: 'markdown' | 'html' | 'json';
    content: ReportContent;
    metadata: ReportMetadata;
}
export interface ReportContent {
    summary: string;
    detailedAnalysis: string[];
    keyFindings: ReportFinding[];
    recommendations?: string[];
    charts?: ChartData[];
    metadata?: ReportMetadata;
}
export interface ReportFinding {
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    evidence: string[];
}
export interface ChartData {
    type: 'line' | 'bar' | 'pie';
    title: string;
    data: Record<string, number | string>[];
    options?: Record<string, unknown>;
}
export interface ReportMetadata {
    generationTime: number;
    dataSources: string[];
    reportVersion: string;
    cacheHit: boolean;
}
export interface MCPServiceConfig {
    url: string;
    apiKey: string;
    timeoutMs: number;
    retryAttempts: number;
    retryDelayMs: number;
}
export interface MCPConnectionStatus {
    connected: boolean;
    lastConnected: string | null;
    error?: string;
    latency?: number;
}
export interface DataSource {
    id: string;
    name: string;
    type: 'api' | 'scraper' | 'feed';
    url: string;
    apiKey?: string;
    priority: number;
    enabled: boolean;
    rateLimit?: RateLimitConfig;
}
export interface RateLimitConfig {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
}
export interface AppConfig {
    mcp: MCPServiceConfig;
    dataSources: DataSource[];
    report: ReportConfig;
    cache: CacheConfig;
    logging: LoggingConfig;
    scheduler: SchedulerConfig;
}
export interface ReportConfig {
    languages: ('en' | 'zh-CN')[];
    defaultLanguage: 'en' | 'zh-CN';
    format: 'markdown' | 'html' | 'json';
    schedule: string;
    deliveryChannels: DeliveryChannel[];
    templates?: ReportTemplate[];
    defaultFormat?: 'markdown' | 'html' | 'json';
    autoExport?: boolean;
    exportFormats?: ('markdown' | 'html' | 'json')[];
    maxHistory?: number;
    enableCaching?: boolean;
    cacheTTL?: number;
}
export interface ReportTemplate {
    id: string;
    name: string;
    language: 'en' | 'zh-CN';
    sections?: string[];
    content?: string | {
        sections: Array<{
            id: string;
            title: string;
            template: string;
        }>;
        variables: string[];
    };
    version?: string;
    styles?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}
export interface DeliveryChannel {
    type: 'discord' | 'telegram' | 'email' | 'file' | 'webhook';
    config: Record<string, unknown>;
    enabled: boolean;
}
export interface CacheConfig {
    ttlSeconds: number;
    maxSizeMb: number;
    directory: string;
    enabled: boolean;
}
export interface LoggingConfig {
    level: 'error' | 'warn' | 'info' | 'debug';
    file: string;
    console: boolean;
    format: 'json' | 'text';
}
export interface SchedulerConfig {
    enabled: boolean;
    intervalMinutes: number;
    retryAttempts: number;
    immediateStart: boolean;
}
export type AppErrorCode = 'MCP_CONNECTION_FAILED' | 'DATA_FETCH_FAILED' | 'REPORT_GENERATION_FAILED' | 'CONFIG_VALIDATION_FAILED' | 'CACHE_ERROR' | 'SCHEDULER_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
export interface AppError {
    code: AppErrorCode;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    stack?: string;
}
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
    timestamp: string;
    version: string;
}
export interface HealthCheck {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    duration?: number;
    details?: string;
}
export interface PerformanceMetrics {
    reportGenerationTime: number;
    dataFetchTime: number;
    mcpLatency: number;
    cacheHitRate: number;
    memoryUsage: number;
    uptime: number;
    timestamp: string;
}
export type AppEventType = 'REPORT_GENERATED' | 'DATA_FETCHED' | 'MCP_CONNECTED' | 'ERROR_OCCURRED' | 'SCHEDULER_TRIGGERED' | 'CONFIG_UPDATED';
export interface AppEvent {
    type: AppEventType;
    timestamp: string;
    data: Record<string, unknown>;
    metadata: {
        correlationId?: string;
        userId?: string;
        source?: string;
    };
}
//# sourceMappingURL=index.d.ts.map