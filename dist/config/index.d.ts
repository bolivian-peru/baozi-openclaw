/**
 * 配置管理器
 * 负责加载、验证和管理应用配置
 */
import { AppConfig } from '@/types';
export declare class ConfigManager {
    private config;
    private configPath;
    private env;
    constructor(configPath?: string);
    /**
     * 获取ConfigManager单例实例
     */
    static getInstance(): ConfigManager;
    /**
     * 获取默认配置文件路径
     */
    private getDefaultConfigPath;
    /**
     * 加载环境变量
     */
    private loadEnvironmentVariables;
    /**
     * 解析环境变量占位符
     */
    private resolveEnvVariables;
    /**
     * 加载配置文件
     */
    load(): Promise<AppConfig>;
    /**
     * 递归解析配置中的环境变量
     */
    private resolveEnvVariablesInConfig;
    /**
     * 验证配置
     */
    private validateConfig;
    /**
     * 验证必要配置
     */
    private validateRequiredConfig;
    /**
     * 获取默认配置
     */
    private getDefaultConfig;
    /**
     * 获取当前配置
     */
    getConfig(): AppConfig;
    /**
     * 重新加载配置
     */
    reload(): Promise<AppConfig>;
    /**
     * 获取环境变量
     */
    getEnv(key: string): string | undefined;
    /**
     * 获取所有环境变量
     */
    getAllEnv(): Record<string, string>;
}
export declare function getConfigManager(): ConfigManager;
//# sourceMappingURL=index.d.ts.map