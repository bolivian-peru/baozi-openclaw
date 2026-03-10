/**
 * 数据处理模块主入口
 * 导出所有接口和实现类
 */
export * from './interface';
export { DataFetcher } from './data-fetcher';
export { DataProcessor } from './data-processor';
export { CacheManager } from './cache-manager';
export { DataService } from './data-service';
export * from './utils';
import { Logger } from '@/utils/logger';
import { DataService } from './data-service';
import { DataSource } from './interface';
/**
 * 创建数据服务实例
 */
export declare function createDataService(logger: Logger, dataSources?: DataSource[]): DataService;
/**
 * 数据处理模块版本信息
 */
export declare const DATA_MODULE_INFO: {
    name: string;
    version: string;
    description: string;
    author: string;
    dependencies: {
        axios: string;
        typescript: string;
    };
    features: string[];
};
//# sourceMappingURL=index.d.ts.map