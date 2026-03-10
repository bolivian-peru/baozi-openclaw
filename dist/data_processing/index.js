"use strict";
/**
 * 数据处理模块主入口
 * 导出所有接口和实现类
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_MODULE_INFO = exports.DataService = exports.CacheManager = exports.DataProcessor = exports.DataFetcher = void 0;
exports.createDataService = createDataService;
// 导出接口
__exportStar(require("./interface"), exports);
// 导出实现类
var data_fetcher_1 = require("./data-fetcher");
Object.defineProperty(exports, "DataFetcher", { enumerable: true, get: function () { return data_fetcher_1.DataFetcher; } });
var data_processor_1 = require("./data-processor");
Object.defineProperty(exports, "DataProcessor", { enumerable: true, get: function () { return data_processor_1.DataProcessor; } });
var cache_manager_1 = require("./cache-manager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_manager_1.CacheManager; } });
var data_service_1 = require("./data-service");
Object.defineProperty(exports, "DataService", { enumerable: true, get: function () { return data_service_1.DataService; } });
// 导出工具函数
__exportStar(require("./utils"), exports);
const data_service_2 = require("./data-service");
/**
 * 创建数据服务实例
 */
function createDataService(logger, dataSources = []) {
    return new data_service_2.DataService(logger, dataSources);
}
/**
 * 数据处理模块版本信息
 */
exports.DATA_MODULE_INFO = {
    name: 'Night Kitchen Data Processing Module',
    version: '1.0.0',
    description: '市场数据获取、处理、缓存和报告生成',
    author: 'Night Kitchen Agent Team',
    dependencies: {
        axios: '^1.6.0',
        typescript: '^5.3.0',
    },
    features: [
        '多数据源支持 (API, 爬虫, 数据流)',
        '智能数据合并 (加权平均算法)',
        '市场趋势分析',
        '异常检测',
        '数据验证和清洗',
        'TTL缓存和LRU清理策略',
        '性能指标监控',
    ],
};
//# sourceMappingURL=index.js.map