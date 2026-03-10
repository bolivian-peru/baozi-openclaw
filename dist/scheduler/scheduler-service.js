"use strict";
/**
 * 调度服务 - 整合所有调度组件
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const scheduler_1 = require("./scheduler");
const market_data_task_1 = require("./tasks/market-data-task");
const report_generation_task_1 = require("./tasks/report-generation-task");
class SchedulerService {
    logger;
    scheduler;
    registry;
    constructor(logger, config = {}) {
        this.logger = logger.child({ component: 'SchedulerService' });
        this.scheduler = new scheduler_1.Scheduler(logger, config);
        this.registry = this.scheduler.getRegistry();
        this.logger.info('调度服务初始化完成');
    }
    /**
     * 启动调度服务
     */
    async start() {
        this.logger.info('启动调度服务');
        try {
            // 注册默认任务执行器
            this.registerDefaultExecutors();
            // 创建默认任务
            await this.createDefaultTasks();
            // 启动调度器
            await this.scheduler.start();
            this.logger.info('调度服务启动成功');
        }
        catch (error) {
            this.logger.error('调度服务启动失败', { error: error.message });
            throw error;
        }
    }
    /**
     * 停止调度服务
     */
    async stop() {
        this.logger.info('停止调度服务');
        try {
            await this.scheduler.stop();
            this.logger.info('调度服务停止成功');
        }
        catch (error) {
            this.logger.error('调度服务停止失败', { error: error.message });
            throw error;
        }
    }
    /**
     * 获取调度器实例
     */
    getScheduler() {
        return this.scheduler;
    }
    /**
     * 获取注册表实例
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * 获取服务状态
     */
    getStatus() {
        const schedulerStatus = this.scheduler.getStatus();
        const registryInfo = this.registry.listExecutors();
        return {
            scheduler: schedulerStatus,
            registry: {
                executorCount: registryInfo.length,
                executors: registryInfo,
            },
        };
    }
    // ================ 私有方法 ================
    /**
     * 注册默认执行器
     */
    registerDefaultExecutors() {
        // 市场数据获取执行器
        const marketDataExecutor = new market_data_task_1.MarketDataTaskExecutor(this.logger);
        this.registry.registerExecutor(marketDataExecutor.getType(), marketDataExecutor);
        // 报告生成执行器
        const reportExecutor = new report_generation_task_1.ReportGenerationTaskExecutor(this.logger);
        this.registry.registerExecutor(reportExecutor.getType(), reportExecutor);
        this.logger.info('默认执行器注册完成', {
            executors: this.registry.listExecutors().map(e => e.type),
        });
    }
    /**
     * 创建默认任务
     */
    async createDefaultTasks() {
        try {
            // 每小时获取市场数据的任务
            await this.scheduler.addTask({
                name: '每小时市场数据更新',
                description: '每小时获取主要加密货币的市场数据',
                schedule: {
                    type: 'interval',
                    value: 60 * 60 * 1000, // 1小时
                    timezone: 'UTC',
                },
                enabled: true,
                config: {
                    taskType: 'market_data',
                    currencyIds: ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'],
                    forceRefresh: false,
                },
            });
            // 每日报告生成任务
            await this.scheduler.addTask({
                name: '每日市场报告',
                description: '每日生成市场分析报告',
                schedule: {
                    type: 'interval',
                    value: 24 * 60 * 60 * 1000, // 24小时
                    timezone: 'UTC',
                },
                enabled: true,
                config: {
                    taskType: 'report_generation',
                    currencyIds: ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'],
                    languages: ['en', 'zh-CN'],
                    format: 'markdown',
                    exportToFile: true,
                },
            });
            this.logger.info('默认任务创建完成');
        }
        catch (error) {
            this.logger.warn('创建默认任务失败', { error: error.message });
            // 继续启动，不影响整体服务
        }
    }
    /**
     * 创建Night Kitchen监控任务
     */
    async createNightKitchenMonitorTask() {
        this.logger.info('创建Night Kitchen监控任务');
        const taskId = await this.scheduler.addTask({
            name: 'Night Kitchen进展监控',
            description: '监控Night Kitchen项目进展，每30分钟检查一次',
            schedule: {
                type: 'interval',
                value: 30 * 60 * 1000, // 30分钟
                timezone: 'UTC',
            },
            enabled: true,
            config: {
                taskType: 'report_generation',
                currencyIds: ['BTC', 'ETH'], // 简化，实际应该监控项目进展
                languages: ['en'],
                format: 'markdown',
                exportToFile: true,
            },
        });
        this.logger.info('Night Kitchen监控任务创建成功', { taskId });
        return taskId;
    }
    /**
     * 立即运行市场数据任务
     */
    async runMarketDataTask(currencyIds = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP']) {
        // 创建一个临时任务并立即执行
        const tempTaskId = await this.scheduler.addTask({
            name: '手动市场数据获取',
            description: '手动获取市场数据',
            schedule: {
                type: 'manual',
                value: 'manual',
            },
            enabled: true,
            config: {
                taskType: 'market_data',
                currencyIds,
                forceRefresh: true,
            },
        });
        try {
            const result = await this.scheduler.runTask(tempTaskId);
            return result;
        }
        finally {
            // 确保清理临时任务
            try {
                await this.scheduler.removeTask(tempTaskId);
            }
            catch (error) {
                this.logger.warn('清理临时任务失败', {
                    taskId: tempTaskId,
                    error: error.message,
                });
            }
        }
    }
    /**
     * 立即生成报告
     */
    async runReportTask(options = {}) {
        const tempTaskId = await this.scheduler.addTask({
            name: '手动报告生成',
            description: '手动生成市场报告',
            schedule: {
                type: 'manual',
                value: 'manual',
            },
            enabled: true,
            config: {
                taskType: 'report_generation',
                currencyIds: options.currencyIds || ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'],
                languages: options.languages || ['en'],
                format: options.format || 'markdown',
                exportToFile: options.exportToFile || false,
            },
        });
        try {
            const result = await this.scheduler.runTask(tempTaskId);
            return result;
        }
        finally {
            // 确保清理临时任务
            try {
                await this.scheduler.removeTask(tempTaskId);
            }
            catch (error) {
                this.logger.warn('清理临时任务失败', {
                    taskId: tempTaskId,
                    error: error.message,
                });
            }
        }
    }
}
exports.SchedulerService = SchedulerService;
//# sourceMappingURL=scheduler-service.js.map