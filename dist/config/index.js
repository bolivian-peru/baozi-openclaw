"use strict";
/**
 * 配置管理器
 * 负责加载、验证和管理应用配置
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
exports.getConfigManager = getConfigManager;
const fs = __importStar(require("fs"));
const fsPromises = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const yaml = __importStar(require("yaml"));
class ConfigManager {
    config = null;
    configPath;
    env = {};
    constructor(configPath) {
        this.configPath = configPath || this.getDefaultConfigPath();
    }
    /**
     * 获取ConfigManager单例实例
     */
    static getInstance() {
        return getConfigManager();
    }
    /**
     * 获取默认配置文件路径
     */
    getDefaultConfigPath() {
        const env = process.env['NODE_ENV'] || 'development';
        return path.join(process.cwd(), 'config', 'environments', `${env}.yaml`);
    }
    /**
     * 加载环境变量
     */
    loadEnvironmentVariables() {
        // 从process.env加载，过滤掉undefined值
        this.env = Object.fromEntries(Object.entries(process.env).filter(([_, v]) => v !== undefined));
        // 尝试从.env文件加载（如果存在）
        const envFilePath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envFilePath)) {
            const envContent = fs.readFileSync(envFilePath, 'utf-8');
            envContent.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    if (key && valueParts.length > 0) {
                        this.env[key.trim()] = valueParts.join('=').trim();
                    }
                }
            });
        }
    }
    /**
     * 解析环境变量占位符
     */
    resolveEnvVariables(value) {
        if (!value || typeof value !== 'string') {
            return value;
        }
        return value.replace(/\${([^}]+)}/g, (match, envVar) => {
            return this.env[envVar] || match;
        });
    }
    /**
     * 加载配置文件
     */
    async load() {
        try {
            // 加载环境变量
            this.loadEnvironmentVariables();
            // 加载配置文件
            const configContent = await fsPromises.readFile(this.configPath, 'utf-8');
            const rawConfig = yaml.parse(configContent);
            // 解析环境变量
            const resolvedConfig = this.resolveEnvVariablesInConfig(rawConfig);
            // 验证配置
            this.config = this.validateConfig(resolvedConfig);
            console.log(`✅ 配置加载成功: ${this.configPath}`);
            return this.config;
        }
        catch (error) {
            console.error(`❌ 配置加载失败: ${error instanceof Error ? error.message : String(error)}`);
            // 返回默认配置
            return this.getDefaultConfig();
        }
    }
    /**
     * 递归解析配置中的环境变量
     */
    resolveEnvVariablesInConfig(config) {
        if (typeof config === 'string') {
            return this.resolveEnvVariables(config);
        }
        if (Array.isArray(config)) {
            return config.map(item => this.resolveEnvVariablesInConfig(item));
        }
        if (config && typeof config === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(config)) {
                result[key] = this.resolveEnvVariablesInConfig(value);
            }
            return result;
        }
        return config;
    }
    /**
     * 验证配置
     */
    validateConfig(config) {
        // 验证MCP配置
        const mcpConfig = {
            url: config.mcp?.url || '@baozi.bet/mcp-server',
            apiKey: config.mcp?.apiKey || this.env['MCP_API_KEY'] || '',
            timeoutMs: config.mcp?.timeoutMs || 30000,
            retryAttempts: config.mcp?.retryAttempts || 3,
            retryDelayMs: config.mcp?.retryDelayMs || 1000,
        };
        // 验证数据源配置
        const dataSources = (config.dataSources || []).map((source) => ({
            id: source.id || `source_${Date.now()}`,
            name: source.name || 'Unknown Source',
            type: source.type || 'api',
            url: source.url || '',
            apiKey: source.apiKey || '',
            priority: source.priority || 1,
            enabled: source.enabled !== false,
            rateLimit: source.rateLimit || {
                requestsPerMinute: 60,
                requestsPerHour: 1000,
                requestsPerDay: 10000,
            },
        }));
        // 验证报告配置
        const reportConfig = {
            languages: config.report?.languages || ['en', 'zh-CN'],
            defaultLanguage: config.report?.defaultLanguage || 'en',
            format: config.report?.format || 'markdown',
            schedule: config.report?.schedule || '0 */6 * * *',
            deliveryChannels: config.report?.deliveryChannels || [
                {
                    type: 'file',
                    config: { path: './reports' },
                    enabled: true,
                },
            ],
            templates: config.report?.templates || [],
        };
        // 完整的应用配置
        const appConfig = {
            mcp: mcpConfig,
            dataSources,
            report: reportConfig,
            cache: {
                ttlSeconds: config.cache?.ttlSeconds || 300,
                maxSizeMb: config.cache?.maxSizeMb || 100,
                directory: config.cache?.directory || './cache',
                enabled: config.cache?.enabled !== false,
            },
            logging: {
                level: config.logging?.level || 'info',
                file: config.logging?.file || './logs/app.log',
                console: config.logging?.console !== false,
                format: config.logging?.format || 'json',
            },
            scheduler: {
                enabled: config.scheduler?.enabled !== false,
                intervalMinutes: config.scheduler?.intervalMinutes || 360, // 6小时
                retryAttempts: config.scheduler?.retryAttempts || 3,
                immediateStart: config.scheduler?.immediateStart || false,
            },
        };
        // 验证必要配置
        this.validateRequiredConfig(appConfig);
        return appConfig;
    }
    /**
     * 验证必要配置
     */
    validateRequiredConfig(config) {
        const errors = [];
        // 验证MCP配置
        if (!config.mcp.url) {
            errors.push('MCP服务器URL未配置');
        }
        if (!config.mcp.apiKey) {
            errors.push('MCP API密钥未配置');
        }
        // 验证数据源
        if (config.dataSources.length === 0) {
            errors.push('至少需要一个数据源配置');
        }
        // 验证报告配置
        if (!config.report.schedule) {
            errors.push('报告生成计划未配置');
        }
        if (errors.length > 0) {
            throw new Error(`配置验证失败: ${errors.join('; ')}`);
        }
    }
    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        return {
            mcp: {
                url: '@baozi.bet/mcp-server',
                apiKey: '',
                timeoutMs: 30000,
                retryAttempts: 3,
                retryDelayMs: 1000,
            },
            dataSources: [
                {
                    id: 'coingecko',
                    name: 'CoinGecko API',
                    type: 'api',
                    url: 'https://api.coingecko.com/api/v3',
                    apiKey: '',
                    priority: 1,
                    enabled: true,
                    rateLimit: {
                        requestsPerMinute: 30,
                        requestsPerHour: 100,
                        requestsPerDay: 1000,
                    },
                },
            ],
            report: {
                languages: ['en', 'zh-CN'],
                defaultLanguage: 'en',
                format: 'markdown',
                schedule: '0 */6 * * *',
                deliveryChannels: [
                    {
                        type: 'file',
                        config: { path: './reports' },
                        enabled: true,
                    },
                ],
                templates: [],
            },
            cache: {
                ttlSeconds: 300,
                maxSizeMb: 100,
                directory: './cache',
                enabled: true,
            },
            logging: {
                level: 'info',
                file: './logs/app.log',
                console: true,
                format: 'json',
            },
            scheduler: {
                enabled: true,
                intervalMinutes: 360,
                retryAttempts: 3,
                immediateStart: false,
            },
        };
    }
    /**
     * 获取当前配置
     */
    getConfig() {
        if (!this.config) {
            throw new Error('配置未加载，请先调用load()方法');
        }
        return this.config;
    }
    /**
     * 重新加载配置
     */
    async reload() {
        this.config = null;
        return this.load();
    }
    /**
     * 获取环境变量
     */
    getEnv(key) {
        return this.env[key];
    }
    /**
     * 获取所有环境变量
     */
    getAllEnv() {
        return { ...this.env };
    }
}
exports.ConfigManager = ConfigManager;
// 单例实例
let configManagerInstance = null;
function getConfigManager() {
    if (!configManagerInstance) {
        configManagerInstance = new ConfigManager();
    }
    return configManagerInstance;
}
//# sourceMappingURL=index.js.map