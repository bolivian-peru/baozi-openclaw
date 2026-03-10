"use strict";
/**
 * 调度模块主入口
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
exports.SCHEDULER_MODULE_INFO = exports.ReportGenerationTaskExecutor = exports.MarketDataTaskExecutor = exports.SchedulerService = exports.Scheduler = exports.BaseTaskExecutor = exports.TaskRegistryImpl = void 0;
exports.createSchedulerService = createSchedulerService;
// 导出接口
__exportStar(require("./interface"), exports);
// 导出实现类
var task_registry_1 = require("./task-registry");
Object.defineProperty(exports, "TaskRegistryImpl", { enumerable: true, get: function () { return task_registry_1.TaskRegistryImpl; } });
var base_executor_1 = require("./base-executor");
Object.defineProperty(exports, "BaseTaskExecutor", { enumerable: true, get: function () { return base_executor_1.BaseTaskExecutor; } });
var scheduler_1 = require("./scheduler");
Object.defineProperty(exports, "Scheduler", { enumerable: true, get: function () { return scheduler_1.Scheduler; } });
var scheduler_service_1 = require("./scheduler-service");
Object.defineProperty(exports, "SchedulerService", { enumerable: true, get: function () { return scheduler_service_1.SchedulerService; } });
// 导出任务执行器
var market_data_task_1 = require("./tasks/market-data-task");
Object.defineProperty(exports, "MarketDataTaskExecutor", { enumerable: true, get: function () { return market_data_task_1.MarketDataTaskExecutor; } });
var report_generation_task_1 = require("./tasks/report-generation-task");
Object.defineProperty(exports, "ReportGenerationTaskExecutor", { enumerable: true, get: function () { return report_generation_task_1.ReportGenerationTaskExecutor; } });
// 导出工具函数
__exportStar(require("./utils"), exports);
const scheduler_service_2 = require("./scheduler-service");
/**
 * 创建调度服务实例
 */
function createSchedulerService(logger, config = {}) {
    return new scheduler_service_2.SchedulerService(logger, config);
}
/**
 * 调度模块版本信息
 */
exports.SCHEDULER_MODULE_INFO = {
    name: 'Night Kitchen Scheduler Module',
    version: '1.0.0',
    description: '任务调度系统，支持定时任务、重试机制和监控',
    author: 'Night Kitchen Agent Team',
    features: [
        '任务调度和管理',
        '支持间隔定时和cron表达式',
        '并发任务控制',
        '重试机制和错误处理',
        '任务历史记录',
        '多种内置任务类型',
        '可扩展的任务执行器系统',
    ],
    builtInTasks: [
        {
            type: 'market_data',
            description: '获取市场数据并分析趋势',
        },
        {
            type: 'report_generation',
            description: '生成市场报告并导出',
        },
    ],
};
//# sourceMappingURL=index.js.map