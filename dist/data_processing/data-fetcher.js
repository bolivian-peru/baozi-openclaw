"use strict";
/**
 * 数据获取器实现
 * 负责从多个数据源获取市场数据
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
exports.DataFetcher = void 0;
const axios_1 = __importDefault(require("axios"));
const errors_1 = require("@/utils/errors");
class DataFetcher {
    logger;
    httpClients;
    constructor(logger) {
        this.logger = logger.child({ component: 'DataFetcher' });
        this.httpClients = new Map();
    }
    /**
     * 从指定数据源获取数据
     */
    async fetchFromSource(source) {
        if (!source.enabled) {
            this.logger.warn('数据源已禁用', { sourceId: source.id });
            return [];
        }
        this.logger.info('从数据源获取数据', {
            sourceId: source.id,
            name: source.name,
            type: source.type,
            url: source.url,
        });
        try {
            let data;
            switch (source.type) {
                case 'api':
                    data = await this.fetchFromAPI(source);
                    break;
                case 'scraper':
                    data = await this.fetchFromScraper(source);
                    break;
                case 'feed':
                    data = await this.fetchFromFeed(source);
                    break;
                default:
                    throw new Error(`不支持的数据源类型: ${source.type}`);
            }
            this.logger.info('数据获取成功', {
                sourceId: source.id,
                recordCount: data.length,
                sampleSymbols: data.slice(0, 3).map(d => d.symbol),
            });
            return data;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('从数据源获取数据失败', {
                sourceId: source.id,
                error: err.message,
                code: error.code,
            });
            throw errors_1.AppErrorFactory.createDataFetchError(source.url, err, {
                sourceId: source.id,
                sourceType: source.type,
                operation: 'fetchFromSource',
            });
        }
    }
    /**
     * 获取所有启用的数据源的数据
     */
    async fetchAllData() {
        this.logger.info('开始从所有数据源获取数据');
        // 在实际应用中，这里会从配置中读取数据源
        // 目前返回模拟数据以演示架构
        const mockSources = [
            {
                id: 'coingecko',
                name: 'CoinGecko API',
                type: 'api',
                url: 'https://api.coingecko.com/api/v3',
                priority: 9,
                enabled: true,
            },
            {
                id: 'coinmarketcap',
                name: 'CoinMarketCap API',
                type: 'api',
                url: 'https://pro-api.coinmarketcap.com/v1',
                priority: 8,
                enabled: true,
            },
            {
                id: 'binance',
                name: 'Binance API',
                type: 'api',
                url: 'https://api.binance.com/api/v3',
                priority: 7,
                enabled: true,
            },
        ];
        const results = {};
        const errors = [];
        // 并行获取所有数据源数据
        const promises = mockSources.map(async (source) => {
            try {
                if (source.enabled) {
                    results[source.id] = await this.fetchMockData(source);
                }
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                errors.push({ sourceId: source.id, error: err.message });
                this.logger.warn('数据源获取失败，跳过', {
                    sourceId: source.id,
                    error: err.message,
                });
            }
        });
        await Promise.allSettled(promises);
        this.logger.info('所有数据源获取完成', {
            successCount: Object.keys(results).length,
            errorCount: errors.length,
            totalSources: mockSources.length,
            errors: errors.slice(0, 3),
        });
        return results;
    }
    /**
     * 测试数据源连接
     */
    async testConnection(source) {
        this.logger.info('测试数据源连接', { sourceId: source.id, url: source.url });
        try {
            const client = this.getHttpClient(source);
            // 发送健康检查请求
            let testUrl;
            switch (source.type) {
                case 'api':
                    testUrl = `${source.url}/ping`;
                    break;
                default:
                    testUrl = source.url;
            }
            const response = await client.get(testUrl, { timeout: 5000 });
            const isHealthy = response.status >= 200 && response.status < 300;
            this.logger.info('数据源连接测试结果', {
                sourceId: source.id,
                healthy: isHealthy,
                status: response.status,
                latency: response.headers?.['x-response-time'] || 'unknown',
            });
            return isHealthy;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('数据源连接测试失败', {
                sourceId: source.id,
                error: err.message,
                code: error.code,
            });
            return false;
        }
    }
    // ================ 私有方法 ================
    /**
     * 从API获取数据
     */
    async fetchFromAPI(source) {
        // @ts-ignore TS6133: 暂时未使用
        const _client = this.getHttpClient(source);
        // 实际实现会根据不同API进行调整
        // 这里返回模拟数据
        return this.fetchMockData(source);
    }
    /**
     * 从网页爬虫获取数据
     */
    async fetchFromScraper(source) {
        // 网页爬虫实现（需要puppeteer/playwright）
        // 目前返回模拟数据
        return this.fetchMockData(source);
    }
    /**
     * 从数据流获取数据
     */
    async fetchFromFeed(source) {
        // 数据流实现（WebSocket/SSE）
        // 目前返回模拟数据
        return this.fetchMockData(source);
    }
    /**
     * 获取HTTP客户端
     */
    getHttpClient(source) {
        const key = source.id;
        if (this.httpClients.has(key)) {
            return this.httpClients.get(key);
        }
        const client = axios_1.default.create({
            baseURL: source.url,
            timeout: 10000,
            headers: {
                'User-Agent': 'NightKitchenAgent/1.0',
                'Accept': 'application/json',
            },
        });
        // 添加API密钥（如果存在）
        if (source.apiKey) {
            client.defaults.headers.common['Authorization'] = `Bearer ${source.apiKey}`;
            // 对于CoinMarketCap等特定API
            if (source.id.includes('coinmarketcap')) {
                client.defaults.headers.common['X-CMC_PRO_API_KEY'] = source.apiKey;
            }
        }
        // 添加请求拦截器
        client.interceptors.request.use((config) => {
            const metadata = {
                startTime: Date.now(),
                sourceId: source.id,
            };
            config.metadata = metadata;
            this.logger.debug('发送API请求', {
                sourceId: source.id,
                method: config.method?.toUpperCase(),
                url: config.url,
            });
            return config;
        }, (error) => {
            this.logger.error('请求拦截器错误', {
                sourceId: source.id,
                error: error instanceof Error ? error.message : String(error),
            });
            return Promise.reject(error);
        });
        // 添加响应拦截器
        client.interceptors.response.use((response) => {
            const metadata = response.config.metadata || {};
            const latency = Date.now() - metadata.startTime;
            this.logger.debug('API响应', {
                sourceId: source.id,
                url: response.config.url,
                status: response.status,
                latency: `${latency}ms`,
            });
            return response;
        }, (error) => {
            const metadata = error.config?.metadata || {};
            const latency = Date.now() - metadata.startTime;
            this.logger.error('API请求失败', {
                sourceId: source.id,
                url: error.config?.url,
                status: error.response?.status,
                error: error instanceof Error ? error.message : String(error),
                latency: `${latency}ms`,
            });
            return Promise.reject(error);
        });
        this.httpClients.set(key, client);
        return client;
    }
    /**
     * 获取模拟数据（用于演示）
     */
    async fetchMockData(source) {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockCurrencies = [
            {
                symbol: 'BTC',
                name: 'Bitcoin',
                currentPrice: 65000 + Math.random() * 5000,
                priceChange24h: -200 + Math.random() * 400,
                priceChangePercentage24h: -0.5 + Math.random() * 2,
                marketCap: 1.2e12 + Math.random() * 1e11,
                volume24h: 30e9 + Math.random() * 5e9,
                lastUpdated: new Date().toISOString(),
                source: source.id,
            },
            {
                symbol: 'ETH',
                name: 'Ethereum',
                currentPrice: 3500 + Math.random() * 300,
                priceChange24h: -50 + Math.random() * 100,
                priceChangePercentage24h: -1.2 + Math.random() * 2.5,
                marketCap: 420e9 + Math.random() * 20e9,
                volume24h: 15e9 + Math.random() * 3e9,
                lastUpdated: new Date().toISOString(),
                source: source.id,
            },
            {
                symbol: 'BNB',
                name: 'Binance Coin',
                currentPrice: 550 + Math.random() * 50,
                priceChange24h: -10 + Math.random() * 20,
                priceChangePercentage24h: -0.8 + Math.random() * 1.8,
                marketCap: 85e9 + Math.random() * 5e9,
                volume24h: 2e9 + Math.random() * 1e9,
                lastUpdated: new Date().toISOString(),
                source: source.id,
            },
            {
                symbol: 'SOL',
                name: 'Solana',
                currentPrice: 180 + Math.random() * 20,
                priceChange24h: -5 + Math.random() * 10,
                priceChangePercentage24h: -2.5 + Math.random() * 5,
                marketCap: 75e9 + Math.random() * 5e9,
                volume24h: 3e9 + Math.random() * 1e9,
                lastUpdated: new Date().toISOString(),
                source: source.id,
            },
            {
                symbol: 'XRP',
                name: 'Ripple',
                currentPrice: 0.62 + Math.random() * 0.1,
                priceChange24h: -0.02 + Math.random() * 0.04,
                priceChangePercentage24h: -1.5 + Math.random() * 3,
                marketCap: 33e9 + Math.random() * 2e9,
                volume24h: 1.5e9 + Math.random() * 0.5e9,
                lastUpdated: new Date().toISOString(),
                source: source.id,
            },
        ];
        // 为每个数据源添加一些随机变化
        const seed = source.id.charCodeAt(0) + source.id.charCodeAt(source.id.length - 1);
        const randomFactor = 0.9 + (seed % 20) / 100; // 0.9-1.1
        return mockCurrencies.map(currency => ({
            ...currency,
            currentPrice: currency.currentPrice * randomFactor,
            priceChange24h: currency.priceChange24h * randomFactor,
            priceChangePercentage24h: currency.priceChangePercentage24h * randomFactor,
            marketCap: currency.marketCap * randomFactor,
            volume24h: currency.volume24h * randomFactor,
            source: source.id,
        }));
    }
    /**
     * 应用速率限制
     */
    // @ts-ignore TS6133: 暂时未使用
    async _applyRateLimit(source) {
        if (!source.rateLimit)
            return;
        // 简化的速率限制实现
        // 实际应用可能需要更复杂的令牌桶算法
        const { requestsPerMinute } = source.rateLimit;
        if (requestsPerMinute > 0) {
            const delay = 60000 / requestsPerMinute; // 每次请求之间的最小间隔
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
exports.DataFetcher = DataFetcher;
__decorate([
    (0, errors_1.retry)(2, ['DATA_FETCH_FAILED']),
    (0, errors_1.timeout)(30000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DataFetcher.prototype, "fetchFromSource", null);
__decorate([
    (0, errors_1.timeout)(10000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DataFetcher.prototype, "testConnection", null);
//# sourceMappingURL=data-fetcher.js.map