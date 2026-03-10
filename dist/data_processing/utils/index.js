"use strict";
/**
 * 数据处理工具函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrencyPrice = formatCurrencyPrice;
exports.formatPercentageChange = formatPercentageChange;
exports.formatMarketCap = formatMarketCap;
exports.formatVolume = formatVolume;
exports.getPriceChangeColor = getPriceChangeColor;
exports.getTrendIcon = getTrendIcon;
exports.getAnomalyIcon = getAnomalyIcon;
exports.generateCacheKey = generateCacheKey;
exports.simpleHash = simpleHash;
exports.delay = delay;
exports.retry = retry;
exports.processBatch = processBatch;
exports.deduplicate = deduplicate;
exports.sortData = sortData;
exports.filterData = filterData;
exports.calculateStatistics = calculateStatistics;
/**
 * 格式化货币价格
 */
function formatCurrencyPrice(price) {
    if (price >= 1000) {
        return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    else if (price >= 1) {
        return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    else if (price >= 0.0001) {
        return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
    }
    else {
        return `$${price.toExponential(4)}`;
    }
}
/**
 * 格式化百分比变化
 */
function formatPercentageChange(percentage) {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
}
/**
 * 格式化市场容量
 */
function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) {
        return `$${(marketCap / 1e12).toFixed(2)}T`;
    }
    else if (marketCap >= 1e9) {
        return `$${(marketCap / 1e9).toFixed(2)}B`;
    }
    else if (marketCap >= 1e6) {
        return `$${(marketCap / 1e6).toFixed(2)}M`;
    }
    else {
        return `$${marketCap.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
}
/**
 * 格式化交易量
 */
function formatVolume(volume) {
    if (volume >= 1e9) {
        return `$${(volume / 1e9).toFixed(2)}B`;
    }
    else if (volume >= 1e6) {
        return `$${(volume / 1e6).toFixed(2)}M`;
    }
    else if (volume >= 1e3) {
        return `$${(volume / 1e3).toFixed(2)}K`;
    }
    else {
        return `$${volume.toFixed(2)}`;
    }
}
/**
 * 计算价格变化颜色
 */
function getPriceChangeColor(percentage) {
    if (percentage > 5)
        return '#10b981'; // 大幅上涨 - 绿色
    if (percentage > 1)
        return '#34d399'; // 上涨 - 浅绿
    if (percentage > -1)
        return '#9ca3af'; // 平稳 - 灰色
    if (percentage > -5)
        return '#f87171'; // 下跌 - 红色
    return '#dc2626'; // 大幅下跌 - 深红
}
/**
 * 计算趋势强度图标
 */
function getTrendIcon(direction, strength) {
    if (direction === 'up') {
        if (strength > 75)
            return '🚀';
        if (strength > 50)
            return '📈';
        if (strength > 25)
            return '↗️';
        return '↑';
    }
    else if (direction === 'down') {
        if (strength > 75)
            return '💥';
        if (strength > 50)
            return '📉';
        if (strength > 25)
            return '↘️';
        return '↓';
    }
    return '➡️';
}
/**
 * 计算异常严重性图标
 */
function getAnomalyIcon(severity) {
    switch (severity) {
        case 'critical': return '🔥';
        case 'high': return '⚠️';
        case 'medium': return '📢';
        case 'low': return 'ℹ️';
        default: return '📝';
    }
}
/**
 * 生成缓存键
 */
function generateCacheKey(prefix, params) {
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    const hash = simpleHash(paramString);
    return `${prefix}_${hash}`;
}
/**
 * 简单哈希函数
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
}
/**
 * 延迟执行
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * 重试函数
 */
async function retry(operation, maxAttempts = 3, delayMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                await delay(delayMs * attempt); // 指数退避
            }
        }
    }
    if (lastError === undefined) {
        throw new Error('重试操作失败但未捕获到错误');
    }
    throw lastError;
}
/**
 * 批量处理数组
 */
async function processBatch(items, processor, batchSize = 10) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch.map(processor));
        batchResults.forEach((result, _index) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
            else {
                console.warn(`批处理项目失败: ${result.reason}`);
            }
        });
        // 批次间延迟，避免速率限制
        if (i + batchSize < items.length) {
            await delay(100);
        }
    }
    return results;
}
/**
 * 数据去重
 */
function deduplicate(items, keyFn) {
    const seen = new Set();
    const result = [];
    for (const item of items) {
        const key = keyFn(item);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }
    return result;
}
/**
 * 数据排序
 */
function sortData(items, keyFn, descending = true) {
    return [...items].sort((a, b) => {
        const aValue = keyFn(a);
        const bValue = keyFn(b);
        return descending ? bValue - aValue : aValue - bValue;
    });
}
/**
 * 数据过滤
 */
function filterData(items, predicate, limit) {
    const filtered = items.filter(predicate);
    return limit ? filtered.slice(0, limit) : filtered;
}
/**
 * 计算统计数据
 */
function calculateStatistics(numbers) {
    if (numbers.length === 0) {
        return { min: 0, max: 0, average: 0, median: 0, standardDeviation: 0 };
    }
    const sorted = [...numbers].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const average = sorted.reduce((sum, num) => sum + num, 0) / sorted.length;
    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const variance = sorted.reduce((sum, num) => sum + Math.pow(num - average, 2), 0) / sorted.length;
    const standardDeviation = Math.sqrt(variance);
    return { min, max, average, median, standardDeviation };
}
//# sourceMappingURL=index.js.map