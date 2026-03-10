"use strict";
/**
 * 调度器主类实现
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
const task_registry_1 = require("./task-registry");
const errors_1 = require("@/utils/errors");
class Scheduler {
    logger;
    config;
    registry;
    tasks;
    taskHistory;
    isRunning;
    startedAt;
    concurrentTasks;
    constructor(logger, config = {}) {
        this.logger = logger.child({ component: 'Scheduler' });
        this.registry = new task_registry_1.TaskRegistryImpl(logger);
        this.tasks = new Map();
        this.taskHistory = new Map();
        this.isRunning = false;
        this.concurrentTasks = new Set();
        this.config = {
            maxConcurrentTasks: config.maxConcurrentTasks || 5,
            retryPolicy: {
                maxAttempts: config.retryPolicy?.maxAttempts || 3,
                delayMs: config.retryPolicy?.delayMs || 1000,
                backoffFactor: config.retryPolicy?.backoffFactor || 2,
            },
            historySize: config.historySize || 100,
            enableLogging: config.enableLogging ?? true,
            timezone: config.timezone || 'UTC',
        };
        this.logger.info('调度器初始化完成', {
            maxConcurrentTasks: this.config.maxConcurrentTasks,
            timezone: this.config.timezone,
        });
    }
    /**
     * 启动调度器
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('调度器已经在运行');
            return;
        }
        this.logger.info('启动调度器');
        try {
            // 启动所有启用的任务
            for (const task of this.tasks.values()) {
                if (task.enabled) {
                    this.scheduleTask(task);
                }
            }
            this.isRunning = true;
            this.startedAt = new Date();
            this.logger.info('调度器启动成功', {
                taskCount: this.tasks.size,
                enabledTasks: Array.from(this.tasks.values()).filter(t => t.enabled).length,
            });
        }
        catch (error) {
            this.logger.error('调度器启动失败', { error: error.message });
            throw errors_1.AppErrorFactory.createSchedulerError(error, {
                operation: 'start',
            });
        }
    }
    /**
     * 停止调度器
     */
    async stop() {
        if (!this.isRunning) {
            this.logger.warn('调度器未运行');
            return;
        }
        this.logger.info('停止调度器');
        try {
            // 停止所有定时器
            for (const task of this.tasks.values()) {
                if (task.timer) {
                    clearTimeout(task.timer);
                    task.timer = undefined;
                }
            }
            // 等待正在运行的任务完成（最多30秒）
            const maxWaitTime = 30000;
            const startWait = Date.now();
            while (this.concurrentTasks.size > 0 && Date.now() - startWait < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (this.concurrentTasks.size > 0) {
                this.logger.warn('强制停止，有任务仍在运行', {
                    runningTasks: Array.from(this.concurrentTasks),
                });
                this.concurrentTasks.clear();
            }
            this.isRunning = false;
            this.startedAt = undefined;
            this.logger.info('调度器停止成功');
        }
        catch (error) {
            this.logger.error('调度器停止失败', { error: error.message });
            throw errors_1.AppErrorFactory.createSchedulerError(error, {
                operation: 'stop',
            });
        }
    }
    /**
     * 添加任务
     */
    async addTask(task) {
        const taskId = this.generateTaskId(task.name);
        this.logger.info('添加任务', {
            taskId,
            name: task.name,
            type: task.schedule.type,
        });
        try {
            // 验证执行器是否存在
            const executorType = task.config.taskType;
            if (!this.registry.hasExecutor(executorType)) {
                throw new Error(`找不到任务执行器: ${executorType}`);
            }
            // 验证任务配置
            const validation = this.registry.validateConfig(executorType, task.config);
            if (!validation.valid) {
                throw new Error(`任务配置验证失败: ${validation.errors.join(', ')}`);
            }
            const internalTask = {
                ...task,
                id: taskId,
                nextRun: this.calculateNextRun(task.schedule),
                runCount: 0,
            };
            this.tasks.set(taskId, internalTask);
            // 如果调度器正在运行且任务启用，则调度任务
            if (this.isRunning && internalTask.enabled) {
                this.scheduleTask(internalTask);
            }
            this.logger.info('任务添加成功', { taskId });
            return taskId;
        }
        catch (error) {
            this.logger.error('添加任务失败', {
                taskName: task.name,
                error: error.message,
            });
            throw errors_1.AppErrorFactory.createSchedulerError(error, {
                operation: 'addTask',
                taskName: task.name,
            });
        }
    }
    /**
     * 更新任务
     */
    async updateTask(taskId, updates) {
        this.logger.info('更新任务', { taskId, updates: Object.keys(updates) });
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`找不到任务: ${taskId}`);
        }
        try {
            // 如果定时器存在，先清除
            if (task.timer) {
                clearTimeout(task.timer);
                task.timer = undefined;
            }
            // 更新任务属性
            const updatedTask = { ...task, ...updates };
            // 如果更新了schedule，重新计算下次运行时间
            if (updates.schedule) {
                updatedTask.nextRun = this.calculateNextRun(updatedTask.schedule);
            }
            // 验证任务配置（如果更新了config）
            if (updates.config) {
                const executorType = updatedTask.config.taskType;
                const validation = this.registry.validateConfig(executorType, updatedTask.config);
                if (!validation.valid) {
                    throw new Error(`任务配置验证失败: ${validation.errors.join(', ')}`);
                }
            }
            this.tasks.set(taskId, updatedTask);
            // 如果调度器正在运行且任务启用，则重新调度
            if (this.isRunning && updatedTask.enabled) {
                this.scheduleTask(updatedTask);
            }
            this.logger.info('任务更新成功', { taskId });
        }
        catch (error) {
            this.logger.error('更新任务失败', {
                taskId,
                error: error.message,
            });
            throw errors_1.AppErrorFactory.createSchedulerError(error, {
                operation: 'updateTask',
                taskId,
            });
        }
    }
    /**
     * 删除任务
     */
    async removeTask(taskId) {
        this.logger.info('删除任务', { taskId });
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`找不到任务: ${taskId}`);
        }
        try {
            // 清除定时器
            if (task.timer) {
                clearTimeout(task.timer);
            }
            // 从任务列表中删除
            this.tasks.delete(taskId);
            // 清理历史记录
            this.taskHistory.delete(taskId);
            this.logger.info('任务删除成功', { taskId });
        }
        catch (error) {
            this.logger.error('删除任务失败', {
                taskId,
                error: error.message,
            });
            throw errors_1.AppErrorFactory.createSchedulerError(error, {
                operation: 'removeTask',
                taskId,
            });
        }
    }
    /**
     * 获取任务列表
     */
    async getTasks() {
        return Array.from(this.tasks.values()).map(task => ({
            id: task.id,
            name: task.name,
            description: task.description,
            schedule: task.schedule,
            enabled: task.enabled,
            lastRun: task.lastRun,
            nextRun: task.nextRun,
            config: task.config,
        }));
    }
    /**
     * 获取任务详情
     */
    async getTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return null;
        }
        return {
            id: task.id,
            name: task.name,
            description: task.description,
            schedule: task.schedule,
            enabled: task.enabled,
            lastRun: task.lastRun,
            nextRun: task.nextRun,
            config: task.config,
        };
    }
    /**
     * 立即运行任务
     */
    async runTask(taskId) {
        this.logger.info('立即运行任务', { taskId });
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`找不到任务: ${taskId}`);
        }
        // 检查并发任务限制
        if (this.concurrentTasks.size >= this.config.maxConcurrentTasks) {
            throw new Error(`并发任务数达到上限: ${this.config.maxConcurrentTasks}`);
        }
        this.concurrentTasks.add(taskId);
        try {
            const runId = this.generateRunId(taskId);
            const startTime = new Date();
            // 创建运行记录
            const run = {
                id: runId,
                taskId,
                startTime: startTime.toISOString(),
                status: 'running',
            };
            // 获取执行器
            const executorType = task.config.taskType;
            const executor = this.registry.getExecutor(executorType);
            if (!executor) {
                throw new Error(`找不到任务执行器: ${executorType}`);
            }
            // 执行任务
            let result;
            try {
                const data = await executor.execute(task.config);
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();
                run.status = 'completed';
                run.endTime = endTime.toISOString();
                run.duration = duration;
                run.result = data;
                result = {
                    success: true,
                    data,
                    metadata: {
                        taskId,
                        startTime: startTime.toISOString(),
                        endTime: endTime.toISOString(),
                        duration,
                        retryCount: 0,
                    },
                };
                this.logger.info('任务执行成功', {
                    taskId,
                    runId,
                    duration: `${duration}ms`,
                });
            }
            catch (error) {
                const endTime = new Date();
                const duration = endTime.getTime() - startTime.getTime();
                run.status = 'failed';
                run.endTime = endTime.toISOString();
                run.duration = duration;
                run.error = error.message;
                result = {
                    success: false,
                    error: error.message,
                    metadata: {
                        taskId,
                        startTime: startTime.toISOString(),
                        endTime: endTime.toISOString(),
                        duration,
                        retryCount: 0,
                    },
                };
                this.logger.error('任务执行失败', {
                    taskId,
                    runId,
                    error: error.message,
                    duration: `${duration}ms`,
                });
            }
            // 更新任务状态并添加到历史记录
            task.lastRun = run;
            task.runCount++;
            this.addToHistory(taskId, run);
            // 如果任务启用且不是单次运行，重新调度
            if (task.enabled && task.schedule.type !== 'manual') {
                try {
                    task.nextRun = this.calculateNextRun(task.schedule);
                    if (this.isRunning) {
                        this.scheduleTask(task);
                    }
                }
                catch (error) {
                    this.logger.warn('重新调度任务失败', {
                        taskId,
                        error: error.message,
                    });
                }
            }
            return result;
        }
        finally {
            this.concurrentTasks.delete(taskId);
        }
    }
    /**
     * 获取任务运行历史
     */
    async getTaskHistory(taskId, limit) {
        const history = this.taskHistory.get(taskId) || [];
        const maxLimit = limit || this.config.historySize;
        return history.slice(0, maxLimit);
    }
    /**
     * 获取调度器状态
     */
    getStatus() {
        const enabledTasks = Array.from(this.tasks.values()).filter(t => t.enabled).length;
        let uptime;
        if (this.startedAt) {
            uptime = Date.now() - this.startedAt.getTime();
        }
        return {
            running: this.isRunning,
            startedAt: this.startedAt?.toISOString(),
            totalTasks: this.tasks.size,
            enabledTasks,
            uptime,
        };
    }
    /**
     * 获取任务注册表
     */
    getRegistry() {
        return this.registry;
    }
    // ================ 私有方法 ================
    /**
     * 调度任务
     */
    scheduleTask(task) {
        if (task.timer) {
            clearTimeout(task.timer);
        }
        const nextRunTime = new Date(task.nextRun).getTime();
        const now = Date.now();
        let delay = Math.max(0, nextRunTime - now);
        // Node.js setTimeout最大延迟是2^31-1毫秒（约24.8天）
        const MAX_TIMEOUT = 2147483647;
        if (delay > MAX_TIMEOUT) {
            this.logger.warn('任务延迟超过Node.js最大值，将延迟调整为最大值', {
                taskId: task.id,
                name: task.name,
                originalDelay: `${delay}ms`,
                maxDelay: `${MAX_TIMEOUT}ms`,
            });
            delay = MAX_TIMEOUT;
        }
        this.logger.debug('调度任务', {
            taskId: task.id,
            name: task.name,
            nextRun: task.nextRun,
            delay: `${delay}ms`,
        });
        task.timer = setTimeout(async () => {
            try {
                await this.runTask(task.id);
            }
            catch (error) {
                this.logger.error('定时任务执行失败', {
                    taskId: task.id,
                    error: error.message,
                });
            }
        }, delay);
    }
    /**
     * 计算下次运行时间
     */
    calculateNextRun(schedule) {
        const now = new Date();
        switch (schedule.type) {
            case 'interval':
                const intervalMs = Number(schedule.value);
                if (isNaN(intervalMs) || intervalMs <= 0) {
                    throw new Error(`无效的间隔时间: ${schedule.value}`);
                }
                return new Date(now.getTime() + intervalMs).toISOString();
            case 'cron':
                try {
                    // 使用cron库解析cron表达式
                    const cron = require('cron');
                    const cronTime = new cron.CronTime(schedule.value);
                    const nextDate = cronTime.sendAt();
                    return nextDate.toISOString();
                }
                catch (error) {
                    this.logger.warn('cron表达式解析失败，使用默认1小时间隔', {
                        cronExpression: schedule.value,
                        error: error.message,
                    });
                    // 回退到1小时后
                    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
                }
            case 'manual':
                // 对于手动任务，返回较远的未来时间，避免被调度
                return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1年后
            default:
                throw new Error(`不支持的调度类型: ${schedule.type}`);
        }
    }
    /**
     * 生成任务ID
     */
    generateTaskId(name) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const nameSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
        return `task_${nameSlug}_${timestamp}_${random}`;
    }
    /**
     * 生成运行ID
     */
    generateRunId(taskId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `run_${taskId}_${timestamp}_${random}`;
    }
    /**
     * 添加到历史记录
     */
    addToHistory(taskId, run) {
        let history = this.taskHistory.get(taskId);
        if (!history) {
            history = [];
            this.taskHistory.set(taskId, history);
        }
        history.unshift(run);
        // 限制历史记录数量
        if (history.length > this.config.historySize) {
            history.splice(this.config.historySize);
        }
    }
    /**
     * 清理历史记录
     */
    cleanupHistory() {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
        const cutoff = Date.now() - maxAge;
        for (const [taskId, history] of this.taskHistory.entries()) {
            const newHistory = history.filter(run => {
                const runTime = new Date(run.startTime).getTime();
                return runTime > cutoff;
            });
            if (newHistory.length !== history.length) {
                this.taskHistory.set(taskId, newHistory);
                this.logger.debug('清理历史记录', {
                    taskId,
                    removed: history.length - newHistory.length,
                    remaining: newHistory.length,
                });
            }
        }
    }
}
exports.Scheduler = Scheduler;
//# sourceMappingURL=scheduler.js.map