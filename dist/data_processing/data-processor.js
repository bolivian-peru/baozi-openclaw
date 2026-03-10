"use strict";
/**
 * 数据处理器实现
 * 负责市场数据的分析、清理、验证和趋势检测
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProcessor = void 0;
const errors_1 = require("@/utils/errors");
class DataProcessor {
    logger;
    constructor(logger) {
        this.logger = logger.child({ component: 'DataProcessor' });
    }
    /**
     * 合并多个数据源的数据
     * 使用加权平均算法，根据数据源优先级和时效性
     */
    mergeData(data) {
        this.logger.info('开始合并多数据源数据', {
            sourceCount: Object.keys(data).length,
            totalRecords: Object.values(data).reduce((sum, arr) => sum + arr.length, 0),
        });
        try {
            const currencyMap = new Map();
            const sourceWeights = this.calculateSourceWeights(data);
            // 处理每个数据源
            Object.entries(data).forEach(([sourceId, records]) => {
                const weight = sourceWeights[sourceId] || 1;
                records.forEach(record => {
                    const key = record.symbol.toUpperCase();
                    const existing = currencyMap.get(key);
                    if (!existing) {
                        // 新货币，直接添加
                        currencyMap.set(key, {
                            ...record,
                            source: sourceId,
                        });
                    }
                    else {
                        // 合并现有记录（加权平均）
                        const merged = this.mergeCurrencyRecord(existing, record, weight);
                        currencyMap.set(key, merged);
                    }
                });
            });
            const result = Array.from(currencyMap.values());
            this.logger.info('数据合并完成', {
                uniqueCurrencies: result.length,
                mergeMethod: 'weighted_average',
            });
            return result;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('数据合并失败', { error: err.message });
            throw errors_1.AppErrorFactory.createDataFetchError('mergeData', err, {
                operation: 'data_merge',
                sourceCount: Object.keys(data).length,
            });
        }
    }
    /**
     * 分析市场趋势
     */
    analyzeTrends(data) {
        this.logger.info('分析市场趋势', { currencyCount: data.length });
        const trends = [];
        try {
            // 分析24小时趋势
            const dailyTrend = this.analyzeDailyTrend(data);
            if (dailyTrend)
                trends.push(dailyTrend);
            // 分析短期波动趋势 (1小时)
            const hourlyTrend = this.analyzeHourlyTrend(data);
            if (hourlyTrend)
                trends.push(hourlyTrend);
            // 分析强势货币
            const strongCurrencies = this.identifyStrongCurrencies(data);
            if (strongCurrencies.length > 0) {
                trends.push({
                    direction: 'up',
                    strength: this.calculateStrengthScore(strongCurrencies),
                    timeframe: '24h',
                    description: `${strongCurrencies.length}个货币显示强势上涨趋势`,
                });
            }
            // 分析弱势货币
            const weakCurrencies = this.identifyWeakCurrencies(data);
            if (weakCurrencies.length > 0) {
                trends.push({
                    direction: 'down',
                    strength: this.calculateStrengthScore(weakCurrencies),
                    timeframe: '24h',
                    description: `${weakCurrencies.length}个货币显示下跌趋势`,
                });
            }
            this.logger.info('趋势分析完成', {
                trendCount: trends.length,
                trends: trends.map(t => `${t.direction}(${t.strength})`),
            });
            return trends;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('趋势分析失败', { error: err.message });
            // 返回空数组而不是抛出错误，不影响后续处理
            return [];
        }
    }
    /**
     * 检测市场异常
     */
    detectAnomalies(data) {
        this.logger.info('检测市场异常', { currencyCount: data.length });
        const anomalies = [];
        try {
            // 检测价格异常波动
            const priceSpikes = this.detectPriceSpikes(data);
            anomalies.push(...priceSpikes);
            // 检测交易量异常
            const volumeSurges = this.detectVolumeSurges(data);
            anomalies.push(...volumeSurges);
            // 检测价格暴跌
            const priceDrops = this.detectPriceDrops(data);
            anomalies.push(...priceDrops);
            this.logger.info('异常检测完成', {
                anomalyCount: anomalies.length,
                types: [...new Set(anomalies.map(a => a.type))],
            });
            return anomalies;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('异常检测失败', { error: err.message });
            return [];
        }
    }
    /**
     * 验证数据质量
     */
    validateData(data) {
        const issues = [];
        try {
            if (!data || data.length === 0) {
                issues.push('数据为空或不存在');
                return { isValid: false, issues };
            }
            // 检查每条记录
            data.forEach((record, index) => {
                const recordIssues = this.validateRecord(record, index);
                issues.push(...recordIssues);
            });
            // 检查数据一致性
            const consistencyIssues = this.checkDataConsistency(data);
            issues.push(...consistencyIssues);
            const isValid = issues.length === 0;
            if (!isValid) {
                this.logger.warn('数据验证发现问题', {
                    issueCount: issues.length,
                    sampleIssues: issues.slice(0, 3),
                });
            }
            else {
                this.logger.debug('数据验证通过', { recordCount: data.length });
            }
            return { isValid, issues };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const errorIssue = `数据验证过程中发生错误: ${err.message}`;
            issues.push(errorIssue);
            this.logger.error('数据验证过程失败', { error: err.message });
            return { isValid: false, issues };
        }
    }
    /**
     * 清洗和转换数据
     */
    cleanData(data) {
        this.logger.info('清洗数据', { recordCount: data.length });
        const cleanedData = [];
        try {
            data.forEach(record => {
                try {
                    const cleaned = this.cleanRecord(record);
                    cleanedData.push(cleaned);
                }
                catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    this.logger.warn('记录清洗失败，跳过', {
                        symbol: record.symbol,
                        error: err.message,
                    });
                }
            });
            this.logger.info('数据清洗完成', {
                originalCount: data.length,
                cleanedCount: cleanedData.length,
                removedCount: data.length - cleanedData.length,
            });
            return cleanedData;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('数据清洗过程失败', { error: err.message });
            // 返回原始数据而不是抛出错误
            return data;
        }
    }
    // ================ 私有方法 ================
    /**
     * 计算数据源权重
     */
    calculateSourceWeights(data) {
        const weights = {};
        Object.entries(data).forEach(([sourceId, records]) => {
            // 基础权重：数据量越大，权重越高
            const dataVolumeWeight = Math.min(records.length / 10, 1);
            // 数据质量权重（基于记录完整性）
            const qualityScore = this.calculateDataQuality(records);
            // 时间权重（越新的数据权重越高）
            const timeWeight = this.calculateTimeWeight(records);
            // 综合权重
            weights[sourceId] = dataVolumeWeight * 0.4 + qualityScore * 0.4 + timeWeight * 0.2;
        });
        return weights;
    }
    /**
     * 合并货币记录（加权平均）
     */
    mergeCurrencyRecord(existing, newRecord, weight) {
        // 归一化权重（现有记录权重为1，新记录为weight）
        const totalWeight = 1 + weight;
        const existingRatio = 1 / totalWeight;
        const newRatio = weight / totalWeight;
        return {
            symbol: existing.symbol,
            name: existing.name || newRecord.name,
            currentPrice: existing.currentPrice * existingRatio + newRecord.currentPrice * newRatio,
            priceChange24h: existing.priceChange24h * existingRatio + newRecord.priceChange24h * newRatio,
            priceChangePercentage24h: existing.priceChangePercentage24h * existingRatio + newRecord.priceChangePercentage24h * newRatio,
            marketCap: existing.marketCap * existingRatio + newRecord.marketCap * newRatio,
            volume24h: existing.volume24h * existingRatio + newRecord.volume24h * newRatio,
            lastUpdated: new Date(Math.max(new Date(existing.lastUpdated).getTime(), new Date(newRecord.lastUpdated).getTime())).toISOString(),
            source: `${existing.source},${newRecord.source}`,
        };
    }
    /**
     * 分析每日趋势
     */
    analyzeDailyTrend(data) {
        if (data.length === 0)
            return null;
        const avgChange = data.reduce((sum, record) => sum + record.priceChangePercentage24h, 0) / data.length;
        let direction;
        if (avgChange > 1)
            direction = 'up';
        else if (avgChange < -1)
            direction = 'down';
        else
            direction = 'neutral';
        const strength = Math.min(Math.abs(avgChange) * 10, 100);
        return {
            direction,
            strength,
            timeframe: '24h',
            description: `24小时平均价格变化: ${avgChange.toFixed(2)}%`,
        };
    }
    /**
     * 分析小时趋势
     */
    analyzeHourlyTrend(_data) {
        // 简化实现：假设我们有小时数据
        // 实际实现需要访问历史数据
        return null;
    }
    /**
     * 识别强势货币
     */
    identifyStrongCurrencies(data) {
        return data.filter(record => record.priceChangePercentage24h > 5 && // 上涨超过5%
            record.volume24h > 1000000 // 交易量足够大
        );
    }
    /**
     * 识别弱势货币
     */
    identifyWeakCurrencies(data) {
        return data.filter(record => record.priceChangePercentage24h < -5 && // 下跌超过5%
            record.volume24h > 1000000 // 交易量足够大
        );
    }
    /**
     * 计算强度分数
     */
    calculateStrengthScore(currencies) {
        if (currencies.length === 0)
            return 0;
        const avgChange = currencies.reduce((sum, c) => sum + Math.abs(c.priceChangePercentage24h), 0) / currencies.length;
        return Math.min(avgChange * 2, 100);
    }
    /**
     * 检测价格异常波动
     */
    detectPriceSpikes(data) {
        const anomalies = [];
        data.forEach(record => {
            if (Math.abs(record.priceChangePercentage24h) > 20) {
                anomalies.push({
                    type: record.priceChangePercentage24h > 0 ? 'spike' : 'drop',
                    severity: Math.abs(record.priceChangePercentage24h) > 50 ? 'critical' : 'high',
                    description: `${record.symbol}价格${record.priceChangePercentage24h > 0 ? '暴涨' : '暴跌'}${Math.abs(record.priceChangePercentage24h).toFixed(1)}%`,
                    affectedCurrencies: [record.symbol],
                    timestamp: record.lastUpdated,
                });
            }
        });
        return anomalies;
    }
    /**
     * 检测交易量异常
     */
    detectVolumeSurges(data) {
        const anomalies = [];
        // 计算平均交易量
        const avgVolume = data.reduce((sum, r) => sum + r.volume24h, 0) / data.length;
        data.forEach(record => {
            if (record.volume24h > avgVolume * 10) {
                anomalies.push({
                    type: 'volume_surge',
                    severity: record.volume24h > avgVolume * 50 ? 'high' : 'medium',
                    description: `${record.symbol}交易量异常，是平均值的${(record.volume24h / avgVolume).toFixed(1)}倍`,
                    affectedCurrencies: [record.symbol],
                    timestamp: record.lastUpdated,
                });
            }
        });
        return anomalies;
    }
    /**
     * 检测价格暴跌
     */
    detectPriceDrops(data) {
        return this.detectPriceSpikes(data).filter(a => a.type === 'drop');
    }
    /**
     * 验证单条记录
     */
    validateRecord(record, index) {
        const issues = [];
        // 检查必需字段
        if (!record.symbol)
            issues.push(`记录[${index}]: 缺少symbol字段`);
        if (!record.currentPrice && record.currentPrice !== 0)
            issues.push(`记录[${index}]: 缺少currentPrice字段`);
        if (!record.lastUpdated)
            issues.push(`记录[${index}]: 缺少lastUpdated字段`);
        // 检查数值合理性
        if (record.currentPrice < 0)
            issues.push(`记录[${index}]: currentPrice不能为负数`);
        if (record.volume24h < 0)
            issues.push(`记录[${index}]: volume24h不能为负数`);
        if (record.marketCap < 0)
            issues.push(`记录[${index}]: marketCap不能为负数`);
        // 检查时间格式
        if (record.lastUpdated) {
            const date = new Date(record.lastUpdated);
            if (isNaN(date.getTime())) {
                issues.push(`记录[${index}]: lastUpdated格式无效: ${record.lastUpdated}`);
            }
        }
        return issues;
    }
    /**
     * 检查数据一致性
     */
    checkDataConsistency(data) {
        const issues = [];
        // 检查重复的symbol
        const symbolCount = new Map();
        data.forEach(record => {
            const count = symbolCount.get(record.symbol) || 0;
            symbolCount.set(record.symbol, count + 1);
        });
        symbolCount.forEach((count, symbol) => {
            if (count > 1) {
                issues.push(`发现重复的货币符号: ${symbol} (${count}次)`);
            }
        });
        return issues;
    }
    /**
     * 清洗单条记录
     */
    cleanRecord(record) {
        const cleaned = { ...record };
        // 清理symbol：转换为大写，移除空格
        if (cleaned.symbol) {
            cleaned.symbol = cleaned.symbol.toUpperCase().trim();
        }
        // 清理name：移除多余空格
        if (cleaned.name) {
            cleaned.name = cleaned.name.trim();
        }
        // 确保数值类型
        cleaned.currentPrice = Number(cleaned.currentPrice);
        cleaned.priceChange24h = Number(cleaned.priceChange24h);
        cleaned.priceChangePercentage24h = Number(cleaned.priceChangePercentage24h);
        cleaned.marketCap = Number(cleaned.marketCap);
        cleaned.volume24h = Number(cleaned.volume24h);
        // 处理NaN值
        if (isNaN(cleaned.currentPrice))
            cleaned.currentPrice = 0;
        if (isNaN(cleaned.priceChange24h))
            cleaned.priceChange24h = 0;
        if (isNaN(cleaned.priceChangePercentage24h))
            cleaned.priceChangePercentage24h = 0;
        if (isNaN(cleaned.marketCap))
            cleaned.marketCap = 0;
        if (isNaN(cleaned.volume24h))
            cleaned.volume24h = 0;
        // 格式化时间戳
        if (cleaned.lastUpdated) {
            try {
                const date = new Date(cleaned.lastUpdated);
                if (!isNaN(date.getTime())) {
                    cleaned.lastUpdated = date.toISOString();
                }
            }
            catch {
                // 保持原样
            }
        }
        return cleaned;
    }
    /**
     * 计算数据质量分数
     */
    calculateDataQuality(records) {
        if (records.length === 0)
            return 0;
        let validCount = 0;
        records.forEach(record => {
            const issues = this.validateRecord(record, 0);
            if (issues.length === 0)
                validCount++;
        });
        return validCount / records.length;
    }
    /**
     * 计算时间权重
     */
    calculateTimeWeight(records) {
        if (records.length === 0)
            return 0;
        const now = Date.now();
        let totalTimeDiff = 0;
        records.forEach(record => {
            if (record.lastUpdated) {
                try {
                    const recordTime = new Date(record.lastUpdated).getTime();
                    if (!isNaN(recordTime)) {
                        const timeDiff = now - recordTime;
                        // 数据越新，权重越高（24小时内为满分，超过则递减）
                        const weight = Math.max(0, 1 - timeDiff / (24 * 60 * 60 * 1000));
                        totalTimeDiff += weight;
                    }
                }
                catch {
                    // 忽略无效时间
                }
            }
        });
        return totalTimeDiff / records.length;
    }
}
exports.DataProcessor = DataProcessor;
//# sourceMappingURL=data-processor.js.map